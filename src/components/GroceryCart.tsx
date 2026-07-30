'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Minus, ChevronDown, ShoppingCart, Check, Trash2, SlidersHorizontal, X } from 'lucide-react';
import ProductMappingModal from '@/components/ProductMappingModal';

interface GroceryItem {
  _id: string;
  name: string;
  unit: string;
  defaultQuantity: number;
  category: string;
}

interface CartSessionItem {
  itemId: string;
  itemName: string;
  quantity: number;
  addedAt: string;
}

interface CartSession {
  _id: string;
  name: string;
  status: 'active' | 'completed';
  items: CartSessionItem[];
  createdAt: string;
}

interface PriceEntry {
  _id: string;
  itemId: string;
  store: 'zepto' | 'instamart';
  price: number;
  unit: string;
  productName: string;
  imageUrl?: string;
  scrapedAt: string;
}

interface PriceCandidate {
  _id: string;
  itemId: string;
  store: 'zepto' | 'instamart';
  productName: string;
  productUrl?: string;
  price: number;
  unit: string;
  scrapedAt: string;
  confirmed: boolean;
}

interface ProductMapping {
  _id: string;
  itemId: string;
  store: 'zepto' | 'instamart';
  productName: string;
  productUrl?: string;
}

const STORE_COLOR = { zepto: 'text-purple-500', instamart: 'text-orange-500' };

function priceAge(scrapedAt: string): string {
  const diff = Date.now() - new Date(scrapedAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function ageFreshness(scrapedAt: string): string {
  const days = (Date.now() - new Date(scrapedAt).getTime()) / 86400000;
  if (days < 3) return 'text-emerald-500';
  if (days < 7) return 'text-yellow-500';
  return 'text-neutral-400';
}

export default function GroceryCart() {
  const [sessions, setSessions] = useState<CartSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);

  // All confirmed mappings for active session items (drives cart price visibility)
  const [allMappings, setAllMappings] = useState<ProductMapping[]>([]);
  const [itemImages, setItemImages] = useState<Map<string, string>>(new Map());

  const pendingQtyUpdates = useRef<Map<string, number>>(new Map());
  const qtyFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Flush on unmount
  useEffect(() => () => { if (qtyFlushTimer.current) { clearTimeout(qtyFlushTimer.current); flushQtyUpdates(); } }, []);

  // Mapping modal
  const [mappingItem, setMappingItem] = useState<{ itemId: string; itemName: string } | null>(null);
  const [candidates, setCandidates] = useState<PriceCandidate[]>([]);
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  const activeSession = sessions.find(s => s._id === activeId) ?? null;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, itemsRes] = await Promise.all([
        fetch('/api/grocery/cart'),
        fetch('/api/grocery/items'),
      ]);
      const [sessionsJson, itemsJson] = await Promise.all([sessionsRes.json(), itemsRes.json()]);
      const fetchedSessions: CartSession[] = sessionsJson.data ?? [];
      setSessions(fetchedSessions);
      setGroceryItems(itemsJson.data ?? []);
      // Default to the most recent active session
      const firstActive = fetchedSessions.find(s => s.status === 'active');
      if (firstActive && !activeId) setActiveId(firstActive._id);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch prices + all mappings whenever the active session changes
  useEffect(() => {
    if (!activeSession || activeSession.items.length === 0) { setPrices([]); setAllMappings([]); return; }
    const ids = activeSession.items.map(i => i.itemId).join(',');
    Promise.all([
      fetch(`/api/grocery/prices?itemIds=${ids}`).then(r => r.json()),
      fetch(`/api/grocery/mapping?itemIds=${ids}`).then(r => r.json()),
    ]).then(([pricesJson, mappingsJson]) => {
      const fetchedPrices: PriceEntry[] = pricesJson.data ?? [];
      const fetchedMappings: ProductMapping[] = mappingsJson.data ?? [];
      setPrices(fetchedPrices);
      setAllMappings(fetchedMappings);

      const imageMap = new Map<string, string>();
      // Priority 1: image from the confirmed mapped product
      for (const e of fetchedPrices) {
        if (!e.imageUrl || imageMap.has(e.itemId)) continue;
        const isMapped = fetchedMappings.some(m => String(m.itemId) === e.itemId && m.store === e.store && m.productName === e.productName);
        if (isMapped) imageMap.set(e.itemId, e.imageUrl);
      }
      // Priority 2: any scraped image
      for (const e of fetchedPrices) {
        if (!e.imageUrl || imageMap.has(e.itemId)) continue;
        imageMap.set(e.itemId, e.imageUrl);
      }
      setItemImages(imageMap);
    });
  }, [activeSession]);

  async function createSession() {
    setCreatingSession(true);
    try {
      const res = await fetch('/api/grocery/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json();
      if (json.data) { setSessions(prev => [json.data, ...prev]); setActiveId(json.data._id); }
    } finally {
      setCreatingSession(false);
    }
  }

  async function addItemToCart() {
    if (!activeId || !selectedItemId) return;
    const res = await fetch(`/api/grocery/cart/${activeId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: selectedItemId, quantity: 1 }),
    });
    const json = await res.json();
    if (json.data) {
      setSessions(prev => prev.map(s => s._id === activeId ? json.data : s));
      setSelectedItemId(''); setShowAddItem(false);
    }
  }

  async function removeItemFromCart(itemId: string) {
    if (!activeId) return;
    const res = await fetch(`/api/grocery/cart/${activeId}/items?itemId=${itemId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.data) setSessions(prev => prev.map(s => s._id === activeId ? json.data : s));
  }

  function flushQtyUpdates() {
    const cartId = activeIdRef.current;
    if (!cartId || pendingQtyUpdates.current.size === 0) return;
    const ops = new Map(pendingQtyUpdates.current);
    pendingQtyUpdates.current.clear();
    ops.forEach((qty, itemId) => {
      if (qty <= 0) {
        fetch(`/api/grocery/cart/${cartId}/items?itemId=${itemId}`, { method: 'DELETE' });
      } else {
        fetch(`/api/grocery/cart/${cartId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, quantity: qty }),
        });
      }
    });
  }

  function scheduleQtyFlush() {
    if (qtyFlushTimer.current) clearTimeout(qtyFlushTimer.current);
    qtyFlushTimer.current = setTimeout(flushQtyUpdates, 600);
  }

  function updateQuantity(itemId: string, newQty: number) {
    // Optimistic UI update
    setSessions(prev => prev.map(s => {
      if (s._id !== activeId) return s;
      if (newQty <= 0) return { ...s, items: s.items.filter(i => i.itemId !== itemId) };
      return { ...s, items: s.items.map(i => i.itemId === itemId ? { ...i, quantity: newQty } : i) };
    }));
    pendingQtyUpdates.current.set(itemId, newQty);
    scheduleQtyFlush();
  }

  async function clearCart() {
    if (!activeId || cartItems.length === 0) return;
    await Promise.all(cartItems.map(item =>
      fetch(`/api/grocery/cart/${activeId}/items?itemId=${item.itemId}`, { method: 'DELETE' })
    ));
    setSessions(prev => prev.map(s => s._id === activeId ? { ...s, items: [] } : s));
  }

  async function completeSession() {
    if (!activeId) return;
    const res = await fetch(`/api/grocery/cart/${activeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const json = await res.json();
    if (json.data) setSessions(prev => prev.map(s => s._id === activeId ? json.data : s));
  }

  // Only return the price for the specific mapped productName
  function getPriceForItem(itemId: string, store: 'zepto' | 'instamart'): PriceEntry | undefined {
    const mapping = allMappings.find(m => String(m.itemId) === itemId && m.store === store);
    if (!mapping) return undefined;
    return prices.find(p => p.itemId === itemId && p.store === store && p.productName === mapping.productName);
  }

  async function openMappingModal(itemId: string, itemName: string) {
    setMappingItem({ itemId, itemName });
    document.body.style.overflow = 'hidden';
    setMappingLoading(true);
    try {
      const [candRes, mapRes] = await Promise.all([
        fetch(`/api/grocery/prices/candidates?itemId=${itemId}`),
        fetch(`/api/grocery/mapping?itemId=${itemId}`),
      ]);
      const [candJson, mapJson] = await Promise.all([candRes.json(), mapRes.json()]);
      setCandidates(candJson.data ?? []);
      setMappings(mapJson.data ?? []);
    } finally {
      setMappingLoading(false);
    }
  }

  function closeMappingModal() {
    setMappingItem(null);
    setCandidates([]);
    setMappings([]);
    document.body.style.overflow = '';
  }

  async function confirmMapping(itemId: string, store: 'zepto' | 'instamart', productName: string) {
    const res = await fetch('/api/grocery/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, store, productName }),
    });
    const json = await res.json();
    if (json.data) {
      setMappings(prev => [...prev.filter(m => !(String(m.itemId) === itemId && m.store === store && m.productName === productName)), json.data]);
      setCandidates(prev => prev.map(c => c.store === store && c.productName === productName ? { ...c, confirmed: true } : c));
      setAllMappings(prev => [...prev.filter(m => !(String(m.itemId) === itemId && m.store === store && m.productName === productName)), json.data]);
    }
  }

  async function removeMapping(mapping: ProductMapping) {
    const res = await fetch(`/api/grocery/mapping/${mapping._id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setMappings(prev => prev.filter(m => m._id !== mapping._id));
      setCandidates(prev => prev.map(c => c.store === mapping.store ? { ...c, confirmed: false } : c));
      // Remove from cart-level allMappings so price hides immediately
      setAllMappings(prev => prev.filter(m => m._id !== mapping._id));
    }
  }

  // Totals — partial:true means some items have no price for that store
  function storeTotal(store: 'zepto' | 'instamart'): { total: number; partial: boolean } | null {
    if (!activeSession || activeSession.items.length === 0) return null;
    let total = 0;
    let partial = false;
    for (const item of activeSession.items) {
      const p = getPriceForItem(item.itemId, store);
      if (!p) { partial = true; continue; }
      total += p.price * (item.quantity ?? 1);
    }
    if (total === 0 && partial) return null;
    return { total, partial };
  }

  const zeptoTotal = storeTotal('zepto');
  const instamartTotal = storeTotal('instamart');
  const cheapestStore: 'zepto' | 'instamart' | null =
    zeptoTotal !== null && instamartTotal !== null && !zeptoTotal.partial && !instamartTotal.partial
      ? zeptoTotal.total <= instamartTotal.total ? 'zepto' : 'instamart'
      : null;

  const cartItems = activeSession?.items ?? [];
  const itemsInCart = new Set(cartItems.map(i => i.itemId));
  const addableItems = groceryItems.filter(gi => !itemsInCart.has(gi._id));

  if (loading) return <div className="text-center py-16 text-neutral-400 text-sm">Loading…</div>;

  return (
    <div>
      {/* Session selector bar */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <button
            onClick={() => setSessionDropdownOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white"
          >
            <span className="truncate">{activeSession ? activeSession.name : 'No session selected'}</span>
            <ChevronDown size={14} className="ml-2 shrink-0 text-neutral-400" />
          </button>
          {sessionDropdownOpen && sessions.length > 0 && (
            <div className="absolute z-10 top-full mt-1 left-0 right-0 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden">
              {sessions.map(s => (
                <button
                  key={s._id}
                  onClick={() => { setActiveId(s._id); setSessionDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center justify-between ${activeId === s._id ? 'font-semibold text-emerald-600' : 'text-neutral-700 dark:text-neutral-300'}`}
                >
                  <span className="truncate">{s.name}</span>
                  {s.status === 'completed' && <span className="text-xs text-neutral-400 ml-2">Done</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={createSession}
          disabled={creatingSession}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          <Plus size={13} /> New Trip
        </button>
      </div>

      {!activeSession && (
        <p className="text-center text-neutral-400 text-sm py-12">
          Create a new shopping trip to get started.
        </p>
      )}

      {activeSession && (
        <div>
          {/* Session status */}
          {activeSession.status === 'active' && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-neutral-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 size={12} /> Clear
                </button>
                <button
                  onClick={completeSession}
                  disabled={cartItems.length === 0}
                  className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={12} /> Save
                </button>
              </div>
            </div>
          )}
          {activeSession.status === 'completed' && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
              <Check size={12} /> Completed · {new Date(activeSession.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          )}

          {/* Price comparison table */}
          {cartItems.length > 0 && (
            <div className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 w-[40%]">Item</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold">
                      <span className={`flex items-center justify-end gap-1 ${STORE_COLOR.zepto}`}>
                        <img src="https://www.google.com/s2/favicons?domain=zepto.com&sz=16" width={12} height={12} alt="" className="rounded-sm" /> Zepto
                      </span>
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold">
                      <span className={`flex items-center justify-end gap-1 ${STORE_COLOR.instamart}`}>
                        <img src="https://www.google.com/s2/favicons?domain=swiggy.com&sz=16" width={12} height={12} alt="" className="rounded-sm" /> Instamart
                      </span>
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {cartItems.map(item => {
                    const zeptoPrice = getPriceForItem(item.itemId, 'zepto');
                    const instamartPrice = getPriceForItem(item.itemId, 'instamart');
                    const bothHavePrices = zeptoPrice && instamartPrice;
                    const cheaperForItem = bothHavePrices
                      ? (zeptoPrice.price * item.quantity <= instamartPrice.price * item.quantity ? 'zepto' : 'instamart')
                      : null;
                    return (
                      <tr key={item.itemId} className="group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {itemImages.has(item.itemId) ? (
                              <img
                                src={itemImages.get(item.itemId)}
                                alt={item.itemName}
                                className="w-9 h-9 rounded-lg object-contain bg-neutral-100 dark:bg-neutral-800 shrink-0"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0" />
                            )}
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-white text-sm">{item.itemName}</div>
                              {activeSession.status === 'active' ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <button onClick={() => updateQuantity(item.itemId, item.quantity - 1)} className="w-5 h-5 flex items-center justify-center rounded border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 hover:border-red-300 transition-colors">
                                    <Minus size={10} />
                                  </button>
                                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 w-5 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.itemId, item.quantity + 1)} className="w-5 h-5 flex items-center justify-center rounded border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-emerald-500 hover:border-emerald-300 transition-colors">
                                    <Plus size={10} />
                                  </button>
                                </div>
                              ) : (
                                item.quantity > 1 && <div className="text-xs text-neutral-400 mt-0.5">×{item.quantity}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {zeptoPrice ? (
                            <button onClick={() => openMappingModal(item.itemId, item.itemName)} className="text-right hover:opacity-70 transition-opacity">
                              <div className={`font-semibold ${cheaperForItem === 'zepto' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                                ₹{(zeptoPrice.price * item.quantity).toFixed(0)}
                              </div>
                              <div className={`text-xs ${ageFreshness(zeptoPrice.scrapedAt)}`}>{priceAge(zeptoPrice.scrapedAt)}</div>
                            </button>
                          ) : (
                            <a
                              href={`https://www.zepto.com/search?query=${encodeURIComponent(item.itemName)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex hover:scale-110 transition-transform"
                            >
                              <img src="https://www.google.com/s2/favicons?domain=zepto.com&sz=16" width={14} height={14} alt="Search on Zepto" className="rounded-sm" />
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {instamartPrice ? (
                            <button onClick={() => openMappingModal(item.itemId, item.itemName)} className="text-right hover:opacity-70 transition-opacity">
                              <div className={`font-semibold ${cheaperForItem === 'instamart' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                                ₹{(instamartPrice.price * item.quantity).toFixed(0)}
                              </div>
                              <div className={`text-xs ${ageFreshness(instamartPrice.scrapedAt)}`}>{priceAge(instamartPrice.scrapedAt)}</div>
                            </button>
                          ) : (
                            <a
                              href={`https://www.swiggy.com/instamart/search?query=${encodeURIComponent(item.itemName)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex hover:scale-110 transition-transform"
                            >
                              <img src="https://www.google.com/s2/favicons?domain=swiggy.com&sz=16" width={14} height={14} alt="Search on Instamart" className="rounded-sm" />
                            </a>
                          )}
                        </td>
                        <td className="pr-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => openMappingModal(item.itemId, item.itemName)}
                              title="Map product"
                              className="text-neutral-400 hover:text-blue-500 transition-colors p-1"
                            >
                              <SlidersHorizontal size={12} />
                            </button>
                            {activeSession.status === 'active' && (
                              <button
                                onClick={() => removeItemFromCart(item.itemId)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Total row */}
                <tfoot>
                  <tr className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-3 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Total</td>
                    <td className="px-3 py-3 text-right">
                      {zeptoTotal !== null ? (
                        <div>
                          <span className={`font-bold text-sm ${cheapestStore === 'zepto' ? 'text-emerald-600' : 'text-neutral-900 dark:text-white'}`}>
                            {zeptoTotal.partial && <span className="text-xs font-normal text-neutral-400 mr-0.5">~</span>}
                            ₹{zeptoTotal.total.toFixed(0)}
                          </span>
                          {cheapestStore === 'zepto' && instamartTotal !== null && (
                            <div className="text-xs text-emerald-600 font-medium">save ₹{(instamartTotal.total - zeptoTotal.total).toFixed(0)}</div>
                          )}
                        </div>
                      ) : <span className="text-xs text-neutral-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {instamartTotal !== null ? (
                        <div>
                          <span className={`font-bold text-sm ${cheapestStore === 'instamart' ? 'text-emerald-600' : 'text-neutral-900 dark:text-white'}`}>
                            {instamartTotal.partial && <span className="text-xs font-normal text-neutral-400 mr-0.5">~</span>}
                            ₹{instamartTotal.total.toFixed(0)}
                          </span>
                          {cheapestStore === 'instamart' && zeptoTotal !== null && (
                            <div className="text-xs text-emerald-600 font-medium">save ₹{(zeptoTotal.total - instamartTotal.total).toFixed(0)}</div>
                          )}
                        </div>
                      ) : <span className="text-xs text-neutral-400">—</span>}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {cartItems.length === 0 && (
            <div className="text-center py-10 text-neutral-400 text-sm flex flex-col items-center gap-2">
              <ShoppingCart size={28} className="text-neutral-300 dark:text-neutral-700" />
              <span>Cart is empty. Add items from your grocery list.</span>
            </div>
          )}

          {/* Add item to cart */}
          {activeSession.status === 'active' && (
            <div>
              {!showAddItem ? (
                <button
                  onClick={() => setShowAddItem(true)}
                  disabled={addableItems.length === 0}
                  className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-0 disabled:cursor-default mt-2"
                >
                  <Plus size={13} />
                  Add item to cart
                </button>
              ) : (
                <div className="flex items-center gap-2 mt-3">
                  <select
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 outline-none"
                  >
                    <option value="">Select item…</option>
                    {addableItems.map(gi => (
                      <option key={gi._id} value={gi._id}>{gi.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={addItemToCart}
                    disabled={!selectedItemId}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button onClick={() => setShowAddItem(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hint when no prices */}
      {activeSession && cartItems.length > 0 && prices.length === 0 && (
        <p className="mt-6 text-xs text-neutral-400 text-center">
          No prices yet. Use the Chrome extension on Zepto or Instamart to scrape prices.
        </p>
      )}

      <ProductMappingModal
        item={mappingItem}
        candidates={candidates}
        mappings={mappings}
        loading={mappingLoading}
        onClose={closeMappingModal}
        onConfirm={confirmMapping}
        onRemove={removeMapping}
      />
    </div>
  );
}
