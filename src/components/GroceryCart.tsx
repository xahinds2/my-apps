'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Minus, ChevronDown, ChevronUp, ShoppingCart, Check, Trash2, SlidersHorizontal } from 'lucide-react';
import ProductMappingModal, { type MappingCandidate, type MappingEntry } from '@/components/ProductMappingModal';

interface GroceryItem { _id: string; name: string; unit: string; defaultQuantity: number; category: string; }
interface CartSessionItem { itemId: string; itemName: string; quantity: number; addedAt: string; }
interface CartSession {
  _id: string; name: string;
  cartType: 'main' | 'zepto' | 'instamart' | null;
  status: 'active' | 'completed';
  items: CartSessionItem[]; createdAt: string;
}
interface PriceEntry {
  _id: string; itemId: string; store: 'zepto' | 'instamart';
  price: number; unit: string; productName: string; imageUrl?: string; scrapedAt: string;
}

const STORE_LABEL: Record<string, string> = { zepto: 'Zepto', instamart: 'Swiggy' };
const STORE_COLOR = { zepto: 'text-purple-600', instamart: 'text-orange-500' };
const STORE_BG = { zepto: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800', instamart: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' };
const STORE_FAVICON = { zepto: 'https://www.google.com/s2/favicons?domain=zepto.com&sz=16', instamart: 'https://www.google.com/s2/favicons?domain=swiggy.com&sz=16' };

function priceAge(scrapedAt: string): string {
  const days = Math.floor((Date.now() - new Date(scrapedAt).getTime()) / 86400000);
  return days === 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`;
}
function ageFreshness(scrapedAt: string): string {
  const days = (Date.now() - new Date(scrapedAt).getTime()) / 86400000;
  return days < 7 ? 'text-neutral-400' : 'text-neutral-300';
}

// ─── CartPanel ───────────────────────────────────────────────────────────────

interface CartPanelProps {
  session: CartSession;
  isMain?: boolean;
  onUpdate: (s: CartSession) => void;
  onDelete: (id: string) => void;
  /** Called when user confirms sending an item to a store cart */
  onSendToStore?: (item: CartSessionItem, store: 'zepto' | 'instamart') => void;
}

function CartPanel({ session, isMain, onUpdate, onDelete, onSendToStore }: CartPanelProps) {
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [allMappings, setAllMappings] = useState<MappingEntry[]>([]);
  const [itemImages, setItemImages] = useState<Map<string, string>>(new Map());
  const [collapsed, setCollapsed] = useState(session.status === 'completed' && !isMain);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingClear, setPendingClear] = useState(false);
  const [pendingDone, setPendingDone] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(session.name);

  const [mappingItem, setMappingItem] = useState<{ itemId: string; itemName: string } | null>(null);
  const [candidates, setCandidates] = useState<MappingCandidate[]>([]);
  const [modalMappings, setModalMappings] = useState<MappingEntry[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  const pendingQty = useRef<Map<string, number>>(new Map());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(session._id);
  useEffect(() => { sessionIdRef.current = session._id; }, [session._id]);
  // flush on unmount
  useEffect(() => () => { if (flushTimer.current) { clearTimeout(flushTimer.current); flushQty(); } }, []);

  const itemsKey = session.items.map(i => `${i.itemId}:${i.quantity}`).join(',');
  useEffect(() => {
    if (session.items.length === 0) { setPrices([]); setAllMappings([]); setItemImages(new Map()); return; }
    const ids = session.items.map(i => i.itemId).join(',');
    Promise.all([
      fetch(`/api/grocery/prices?itemIds=${ids}`).then(r => r.json()),
      fetch(`/api/grocery/mapping?itemIds=${ids}`).then(r => r.json()),
    ]).then(([pj, mj]) => {
      const fp: PriceEntry[] = pj.data ?? [];
      const fm: MappingEntry[] = mj.data ?? [];
      setPrices(fp); setAllMappings(fm);
      const img = new Map<string, string>();
      for (const e of fp) {
        if (!e.imageUrl || img.has(e.itemId)) continue;
        if (fm.some(m => String(m.itemId) === e.itemId && m.store === e.store && m.productName === e.productName)) img.set(e.itemId, e.imageUrl);
      }
      for (const e of fp) { if (!e.imageUrl || img.has(e.itemId)) continue; img.set(e.itemId, e.imageUrl); }
      setItemImages(img);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session._id, itemsKey]);

  function getPriceForItem(itemId: string, store: 'zepto' | 'instamart'): PriceEntry | undefined {
    const m = allMappings.find(m => String(m.itemId) === itemId && m.store === store);
    if (!m) return undefined;
    return prices.find(p => p.itemId === itemId && p.store === store && p.productName === m.productName);
  }

  function storeTotal(store: 'zepto' | 'instamart'): { total: number; partial: boolean } | null {
    if (!session.items.length) return null;
    let total = 0, partial = false;
    for (const it of session.items) {
      const p = getPriceForItem(it.itemId, store);
      if (!p) { partial = true; continue; }
      total += p.price * (it.quantity ?? 1);
    }
    return total === 0 && partial ? null : { total, partial };
  }

  function flushQty() {
    const sid = sessionIdRef.current;
    if (!sid || !pendingQty.current.size) return;
    const ops = new Map(pendingQty.current); pendingQty.current.clear();
    ops.forEach((qty, itemId) => {
      if (qty <= 0) fetch(`/api/grocery/cart/${sid}/items?itemId=${itemId}`, { method: 'DELETE' });
      else fetch(`/api/grocery/cart/${sid}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId, quantity: qty }) });
    });
  }

  function updateQuantity(itemId: string, newQty: number) {
    const updated = newQty <= 0
      ? { ...session, items: session.items.filter(i => i.itemId !== itemId) }
      : { ...session, items: session.items.map(i => i.itemId === itemId ? { ...i, quantity: newQty } : i) };
    onUpdate(updated);
    pendingQty.current.set(itemId, newQty);
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushQty, 600);
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/grocery/cart/${session._id}/items?itemId=${itemId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.data) onUpdate(json.data);
  }

  async function clearCart() {
    await Promise.all(session.items.map(it => fetch(`/api/grocery/cart/${session._id}/items?itemId=${it.itemId}`, { method: 'DELETE' })));
    onUpdate({ ...session, items: [] });
  }

  async function completeSession() {
    const res = await fetch(`/api/grocery/cart/${session._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
    const json = await res.json();
    if (json.data) { onUpdate(json.data); setCollapsed(true); }
  }

  async function openMappingModal(itemId: string, itemName: string) {
    setMappingItem({ itemId, itemName }); document.body.style.overflow = 'hidden'; setMappingLoading(true);
    try {
      const [cr, mr] = await Promise.all([fetch(`/api/grocery/prices/candidates?itemId=${itemId}`), fetch(`/api/grocery/mapping?itemId=${itemId}`)]);
      const [cj, mj] = await Promise.all([cr.json(), mr.json()]);
      setCandidates(cj.data ?? []); setModalMappings(mj.data ?? []);
    } finally { setMappingLoading(false); }
  }
  function closeMappingModal() { setMappingItem(null); setCandidates([]); setModalMappings([]); document.body.style.overflow = ''; }

  async function confirmMapping(itemId: string, store: 'zepto' | 'instamart', productName: string) {
    const res = await fetch('/api/grocery/mapping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId, store, productName }) });
    const json = await res.json();
    if (json.data) {
      setModalMappings(prev => [...prev.filter(m => !(String(m.itemId) === itemId && m.store === store && m.productName === productName)), json.data]);
      setCandidates(prev => prev.map(c => c.store === store && c.productName === productName ? { ...c, confirmed: true } : c));
      setAllMappings(prev => [...prev.filter(m => !(String(m.itemId) === itemId && m.store === store && m.productName === productName)), json.data]);
    }
  }
  async function removeMapping(mapping: MappingEntry) {
    const res = await fetch(`/api/grocery/mapping/${mapping._id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setModalMappings(prev => prev.filter(m => m._id !== mapping._id));
      setCandidates(prev => prev.map(c => c.store === mapping.store ? { ...c, confirmed: false } : c));
      setAllMappings(prev => prev.filter(m => m._id !== mapping._id));
    }
  }

  const zeptoTotal = storeTotal('zepto');
  const instamartTotal = storeTotal('instamart');
  const cheapestStore: 'zepto' | 'instamart' | null =
    zeptoTotal && instamartTotal && !zeptoTotal.partial && !instamartTotal.partial
      ? zeptoTotal.total <= instamartTotal.total ? 'zepto' : 'instamart' : null;
  const isActive = session.status === 'active';
  const headerTotal = cheapestStore === 'zepto' ? zeptoTotal : cheapestStore === 'instamart' ? instamartTotal : zeptoTotal ?? instamartTotal;

  // Store cart: only show the relevant store column
  const storeCartType = session.cartType === 'zepto' ? 'zepto' : session.cartType === 'instamart' ? 'instamart' : null;

  const borderClass = isMain
    ? 'border-neutral-200 dark:border-neutral-700'
    : 'border-neutral-200 dark:border-neutral-800';

  return (
    <div className={`mb-4 rounded-xl border overflow-hidden ${borderClass}`}>
      {/* Delete confirm */}
      {pendingDelete ? (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-950/40">
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete &ldquo;{session.name}&rdquo;?</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { fetch(`/api/grocery/cart/${session._id}`, { method: 'DELETE' }); onDelete(session._id); }} className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors">Delete</button>
            <button onClick={() => setPendingDelete(false)} className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => !isMain && setCollapsed(c => !c)} className={`w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 transition-colors ${!isMain ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60' : 'cursor-default'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {storeCartType ? (
              <img src={STORE_FAVICON[storeCartType]} width={13} height={13} alt="" className="rounded-sm shrink-0" />
            ) : (
              <ShoppingCart size={14} className={isActive ? 'text-emerald-500' : 'text-neutral-400'} />
            )}
            {editingName ? (
              <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
                onBlur={async () => {
                  setEditingName(false);
                  const t = nameValue.trim() || session.name; setNameValue(t);
                  if (t === session.name) return;
                  const res = await fetch(`/api/grocery/cart/${session._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: t }) });
                  const json = await res.json(); if (json.data) onUpdate(json.data);
                }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setNameValue(session.name); setEditingName(false); } }}
                onClick={e => e.stopPropagation()}
                className="text-sm font-semibold bg-transparent border-b border-neutral-400 outline-none text-neutral-900 dark:text-white w-40"
              />
            ) : (
              <span className="text-sm font-semibold truncate text-neutral-900 dark:text-white"
                onDoubleClick={e => { e.stopPropagation(); setEditingName(true); }}>
                {session.name}
              </span>
            )}
            {!isActive && <span className="shrink-0 text-xs text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full">Done</span>}
            <span className="shrink-0 text-xs text-neutral-400">{session.items.length} item{session.items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {headerTotal && (
              <span className={`text-sm font-bold ${cheapestStore ? 'text-emerald-600' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {headerTotal.partial && <span className="text-xs font-normal text-neutral-400 mr-0.5">~</span>}₹{headerTotal.total.toFixed(0)}
              </span>
            )}
            {!isMain && (
              <span role="button" onClick={e => { e.stopPropagation(); setPendingDelete(true); }}
                className="p-1 text-neutral-300 dark:text-neutral-600 hover:text-red-500 transition-colors" title="Delete cart">
                <Trash2 size={12} />
              </span>
            )}
            {!isMain && (collapsed ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronUp size={14} className="text-neutral-400" />)}
          </div>
        </button>
      )}

      {(isMain || !collapsed) && (
        <div className="px-4 py-3">
          {/* Action bar */}
          {isActive && (
            pendingClear ? (
              <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">Clear all items?</span>
                <div className="flex gap-2">
                  <button onClick={() => { clearCart(); setPendingClear(false); }} className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">Clear</button>
                  <button onClick={() => setPendingClear(false)} className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold">Cancel</button>
                </div>
              </div>
            ) : pendingDone ? (
              <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Mark cart as done?</span>
                <div className="flex gap-2">
                  <button onClick={() => { completeSession(); setPendingDone(false); }} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Done</button>
                  <button onClick={() => setPendingDone(false)} className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400">{session.items.length} item{session.items.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPendingClear(true)} disabled={!session.items.length} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-40">
                    <Trash2 size={11} /> Clear
                  </button>
                  {!isMain && (
                    <button onClick={() => setPendingDone(true)} disabled={!session.items.length} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-40">
                      <Check size={11} /> Done
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {session.items.length > 0 ? (
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden mb-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/60">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-[40%]">Item</th>
                    {/* Store cart: show only relevant store */}
                    {storeCartType ? (
                      <th className="text-right px-3 py-2.5 text-xs font-semibold">
                        <span className="flex items-center justify-end gap-1 text-neutral-500 dark:text-neutral-400">
                          <img src={STORE_FAVICON[storeCartType]} width={11} height={11} alt="" className="rounded-sm" /> {STORE_LABEL[storeCartType]}
                        </span>
                      </th>
                    ) : (
                      <>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold">
                          <span className="flex items-center justify-end gap-1 text-neutral-500 dark:text-neutral-400">
                            <img src={STORE_FAVICON.zepto} width={11} height={11} alt="" className="rounded-sm" /> Zepto
                          </span>
                        </th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold">
                          <span className="flex items-center justify-end gap-1 text-neutral-500 dark:text-neutral-400">
                            <img src={STORE_FAVICON.instamart} width={11} height={11} alt="" className="rounded-sm" /> Swiggy
                          </span>
                        </th>
                      </>
                    )}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {session.items.map(item => {
                    const zp = getPriceForItem(item.itemId, 'zepto');
                    const ip = getPriceForItem(item.itemId, 'instamart');
                    const cheaper = zp && ip ? (zp.price * item.quantity <= ip.price * item.quantity ? 'zepto' : 'instamart') : null;
                    return (
                      <tr key={item.itemId} className="group">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {itemImages.has(item.itemId) ? (
                              <img src={itemImages.get(item.itemId)} alt={item.itemName} className="w-8 h-8 rounded-lg object-contain bg-neutral-100 dark:bg-neutral-800 shrink-0"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            ) : <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0" />}
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-white text-xs leading-snug">{item.itemName}</div>
                              {isActive ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <button onClick={() => updateQuantity(item.itemId, item.quantity - 1)} className="w-4 h-4 flex items-center justify-center rounded border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 transition-colors"><Minus size={8} /></button>
                                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 w-4 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.itemId, item.quantity + 1)} className="w-4 h-4 flex items-center justify-center rounded border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-emerald-500 transition-colors"><Plus size={8} /></button>
                                </div>
                              ) : item.quantity > 1 && <div className="text-xs text-neutral-400">×{item.quantity}</div>}
                            </div>
                          </div>
                        </td>

                        {storeCartType ? (
                          // Store cart: single price column
                          <td className="px-3 py-2.5 text-right">
                            {(() => { const p = getPriceForItem(item.itemId, storeCartType);
                              return p ? (
                                <button onClick={() => openMappingModal(item.itemId, item.itemName)} className="text-right hover:opacity-70 transition-opacity">
                                  <div className="font-semibold text-xs text-neutral-900 dark:text-white">₹{(p.price * item.quantity).toFixed(0)}</div>
                                  <div className={`text-xs ${ageFreshness(p.scrapedAt)}`}>{priceAge(p.scrapedAt)}</div>
                                </button>
                              ) : (
                                <a href={storeCartType === 'zepto' ? `https://www.zepto.com/search?query=${encodeURIComponent(item.itemName)}` : `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(item.itemName)}`} target="_blank" rel="noopener noreferrer" className="inline-flex hover:scale-110 transition-transform">
                                  <img src={STORE_FAVICON[storeCartType]} width={13} height={13} alt="" className="rounded-sm" />
                                </a>
                              );
                            })()}
                          </td>
                        ) : (
                          // Main cart: click price to directly send to store cart
                          <>
                            <td className="px-3 py-2.5 text-right">
                              {zp ? (
                                <button onClick={() => onSendToStore?.(item, 'zepto')} className="text-right hover:opacity-70 transition-opacity" title="Add to Zepto cart">
                                  <div className="font-semibold text-xs text-white">₹{(zp.price * item.quantity).toFixed(0)}</div>
                                  <div className={`text-xs ${cheaper === 'zepto' && ip ? 'text-emerald-500' : ageFreshness(zp.scrapedAt)}`}>{cheaper === 'zepto' && ip ? `-₹${((ip.price - zp.price) * item.quantity).toFixed(0)}` : priceAge(zp.scrapedAt)}</div>
                                </button>
                              ) : (
                                <a href={`https://www.zepto.com/search?query=${encodeURIComponent(item.itemName)}`} target="_blank" rel="noopener noreferrer" className="inline-flex hover:scale-110 transition-transform">
                                  <img src={STORE_FAVICON.zepto} width={13} height={13} alt="Search Zepto" className="rounded-sm" />
                                </a>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {ip ? (
                                <button onClick={() => onSendToStore?.(item, 'instamart')} className="text-right hover:opacity-70 transition-opacity" title="Add to Swiggy cart">
                                  <div className="font-semibold text-xs text-white">₹{(ip.price * item.quantity).toFixed(0)}</div>
                                  <div className={`text-xs ${cheaper === 'instamart' && zp ? 'text-emerald-500' : ageFreshness(ip.scrapedAt)}`}>{cheaper === 'instamart' && zp ? `-₹${((zp.price - ip.price) * item.quantity).toFixed(0)}` : priceAge(ip.scrapedAt)}</div>
                                </button>
                              ) : (
                                <a href={`https://www.swiggy.com/instamart/search?query=${encodeURIComponent(item.itemName)}`} target="_blank" rel="noopener noreferrer" className="inline-flex hover:scale-110 transition-transform">
                                  <img src={STORE_FAVICON.instamart} width={13} height={13} alt="Search Swiggy" className="rounded-sm" />
                                </a>
                              )}
                            </td>
                          </>
                        )}

                        <td className="pr-2 py-2.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => openMappingModal(item.itemId, item.itemName)} title="Map product" className="p-0.5 text-neutral-300 dark:text-neutral-600 hover:text-blue-500 transition-colors">
                              <SlidersHorizontal size={11} />
                            </button>
                            {isActive && (
                              <button onClick={() => removeItem(item.itemId)} className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 dark:text-neutral-600 hover:text-red-500">
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer — only for main cart (two stores) */}
                {!storeCartType && (zeptoTotal || instamartTotal) && (
                  <tfoot>
                    <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">Total</td>
                      <td className="px-3 py-2.5 text-right">
                        {zeptoTotal ? (
                          <div>
                            <span className="font-bold text-sm text-white">
                              {zeptoTotal.partial && <span className="text-xs font-normal text-neutral-400 mr-0.5">~</span>}₹{zeptoTotal.total.toFixed(0)}
                            </span>
                            {cheapestStore === 'zepto' && instamartTotal && <div className="text-xs text-emerald-500 font-medium">-₹{(instamartTotal.total - zeptoTotal.total).toFixed(0)}</div>}
                          </div>
                        ) : <span className="text-xs text-neutral-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {instamartTotal ? (
                          <div>
                            <span className="font-bold text-sm text-white">
                              {instamartTotal.partial && <span className="text-xs font-normal text-neutral-400 mr-0.5">~</span>}₹{instamartTotal.total.toFixed(0)}
                            </span>
                            {cheapestStore === 'instamart' && zeptoTotal && <div className="text-xs text-emerald-500 font-medium">-₹{(zeptoTotal.total - instamartTotal.total).toFixed(0)}</div>}
                          </div>
                        ) : <span className="text-xs text-neutral-400">—</span>}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-400 text-xs flex flex-col items-center gap-1.5">
              <ShoppingCart size={22} className="text-neutral-300 dark:text-neutral-700" />
              <span>{isMain ? 'Add items from the grocery list' : 'No items yet'}</span>
            </div>
          )}
        </div>
      )}

      <ProductMappingModal item={mappingItem} candidates={candidates} mappings={modalMappings} loading={mappingLoading}
        onClose={closeMappingModal} onConfirm={confirmMapping} onRemove={removeMapping} />
    </div>
  );
}

// ─── GroceryCart ──────────────────────────────────────────────────────────────

export default function GroceryCart() {
  const [sessions, setSessions] = useState<CartSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingStore, setCreatingStore] = useState<'zepto' | 'instamart' | null>(null);

  const upsertSession = useCallback((s: CartSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(x => x._id === s._id);
      return idx >= 0 ? prev.map(x => x._id === s._id ? s : x) : [...prev, s];
    });
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure main cart exists
      const [sessionsRes, mainRes] = await Promise.all([
        fetch('/api/grocery/cart'),
        fetch('/api/grocery/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartType: 'main' }) }),
      ]);
      const [sessionsJson, mainJson] = await Promise.all([sessionsRes.json(), mainRes.json()]);
      const all: CartSession[] = sessionsJson.data ?? [];
      const main: CartSession = mainJson.data;
      // merge: ensure main is in list
      const merged = all.find(s => s._id === main._id) ? all : [...all, main];
      setSessions(merged);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function ensureStoreCart(store: 'zepto' | 'instamart'): Promise<CartSession | null> {
    setCreatingStore(store);
    try {
      const res = await fetch('/api/grocery/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartType: store }) });
      const json = await res.json();
      if (json.data) { upsertSession(json.data); return json.data; }
    } finally { setCreatingStore(null); }
    return null;
  }

  async function handleSendToStore(item: CartSessionItem, store: 'zepto' | 'instamart') {
    const storeCart = await ensureStoreCart(store);
    if (!storeCart) return;
    await fetch(`/api/grocery/cart/${storeCart._id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.itemId, quantity: item.quantity }),
    });
    // Re-fetch all sessions so the store cart panel updates live
    const allRes = await fetch('/api/grocery/cart');
    const allJson = await allRes.json();
    if (allJson.data) setSessions(allJson.data);
  }

  const mainCart = sessions.find(s => s.cartType === 'main');
  const storeCarts = sessions.filter(s => s.cartType === 'zepto' || s.cartType === 'instamart');
  const completedCarts = sessions.filter(s => s.status === 'completed' && s.cartType !== 'main');

  if (loading) return <div className="text-center py-16 text-neutral-400 text-sm">Loading…</div>;

  return (
    <div>
      {/* Store cart creation buttons */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {storeCarts.filter(s => s.status === 'active').length > 0
            ? <><span className="font-semibold text-neutral-800 dark:text-neutral-200">{storeCarts.filter(s => s.status === 'active').length}</span> store cart{storeCarts.filter(s => s.status === 'active').length !== 1 ? 's' : ''}</>
            : 'No store carts yet'}
        </span>
        <div className="flex items-center gap-2">
          {!storeCarts.find(s => s.cartType === 'zepto' && s.status === 'active') && (
            <button onClick={() => ensureStoreCart('zepto')} disabled={creatingStore === 'zepto'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800/60 disabled:opacity-50 transition-colors">
              <img src={STORE_FAVICON.zepto} width={11} height={11} alt="" className="rounded-sm" /> + Zepto
            </button>
          )}
          {!storeCarts.find(s => s.cartType === 'instamart' && s.status === 'active') && (
            <button onClick={() => ensureStoreCart('instamart')} disabled={creatingStore === 'instamart'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800/60 disabled:opacity-50 transition-colors">
              <img src={STORE_FAVICON.instamart} width={11} height={11} alt="" className="rounded-sm" /> + Swiggy
            </button>
          )}
        </div>
      </div>

      {/* Main cart — always at top */}
      {mainCart && (
        <CartPanel key={mainCart._id} session={mainCart} isMain
          onUpdate={upsertSession}
          onDelete={() => {}} // main cart cannot be deleted
          onSendToStore={handleSendToStore}
        />
      )}

      {/* Active store carts */}
      {storeCarts.filter(s => s.status === 'active').map(s => (
        <CartPanel key={s._id} session={s}
          onUpdate={upsertSession}
          onDelete={id => setSessions(prev => prev.filter(x => x._id !== id))}
        />
      ))}

      {/* Completed carts */}
      {completedCarts.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Completed</span>
            <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
          </div>
          {completedCarts.map(s => (
            <CartPanel key={s._id} session={s}
              onUpdate={upsertSession}
              onDelete={id => setSessions(prev => prev.filter(x => x._id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
