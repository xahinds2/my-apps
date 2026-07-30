'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Check, X, SlidersHorizontal } from 'lucide-react';
import ProductMappingModal from '@/components/ProductMappingModal';
import { CATEGORIES, type GroceryCategory } from '@/features/grocery/types';

interface GroceryItem {
  _id: string;
  name: string;
  category: GroceryCategory;
}

interface PriceEntry {
  _id: string;
  itemId: string;
  store: 'zepto' | 'instamart';
  price: number;
  unit: string;
  productName: string;
  productUrl?: string;
  imageUrl?: string;
  scrapedAt: string;
  confirmed: boolean;
}

interface ProductMapping {
  _id: string;
  itemId: string;
  store: 'zepto' | 'instamart';
  productName: string;
}

function priceAge(scrapedAt: string): string {
  const diff = Date.now() - new Date(scrapedAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

// Keyword → emoji for common grocery items
const EMOJI_MAP: [string, string][] = [
  // Vegetables
  ['tomato', '🍅'], ['onion', '🧅'], ['potato', '🥔'], ['carrot', '🥕'],
  ['broccoli', '🥦'], ['spinach', '🥬'], ['palak', '🥬'], ['cabbage', '🥬'],
  ['lettuce', '🥬'], ['eggplant', '🍆'], ['brinjal', '🍆'], ['baingan', '🍆'],
  ['corn', '🌽'], ['maize', '🌽'], ['cucumber', '🥒'], ['kheera', '🥒'],
  ['capsicum', '🫑'], ['bell pepper', '🫑'], ['chilli', '🌶️'], ['chili', '🌶️'],
  ['mushroom', '🍄'], ['garlic', '🧄'], ['ginger', '🫚'], ['pumpkin', '🎃'],
  ['kaddu', '🎃'], ['avocado', '🥑'], ['beans', '🫘'], ['peas', '🫛'],
  ['radish', '🌿'], ['mooli', '🌿'], ['cauliflower', '🥦'], ['gobi', '🥦'],
  // Fruits
  ['apple', '🍎'], ['banana', '🍌'], ['orange', '🍊'], ['mango', '🥭'],
  ['grapes', '🍇'], ['watermelon', '🍉'], ['pineapple', '🍍'], ['strawberry', '🍓'],
  ['lemon', '🍋'], ['lime', '🍋'], ['coconut', '🥥'], ['kiwi', '🥝'],
  ['peach', '🍑'], ['pear', '🍐'], ['cherry', '🍒'], ['blueberry', '🫐'],
  ['pomegranate', '🍎'], ['papaya', '🍊'], ['guava', '🍏'],
  // Dairy & Eggs
  ['milk', '🥛'], ['egg', '🥚'], ['butter', '🧈'], ['cheese', '🧀'],
  ['paneer', '🧀'], ['curd', '🥛'], ['dahi', '🥛'], ['cream', '🥛'],
  ['ghee', '🧈'], ['yogurt', '🥛'],
  // Grains & Staples
  ['rice', '🌾'], ['wheat', '🌾'], ['atta', '🌾'], ['flour', '🌾'],
  ['bread', '🍞'], ['oats', '🌾'], ['dal', '🫘'], ['lentil', '🫘'],
  ['pasta', '🍝'], ['noodles', '🍜'], ['poha', '🌾'], ['semolina', '🌾'],
  ['rava', '🌾'], ['maida', '🌾'], ['cornflour', '🌽'],
  // Beverages
  ['tea', '🍵'], ['coffee', '☕'], ['juice', '🧃'], ['water', '💧'],
  ['lassi', '🥛'],
  // Snacks
  ['biscuit', '🍪'], ['cookie', '🍪'], ['chocolate', '🍫'], ['candy', '🍬'],
  ['popcorn', '🍿'], ['peanut', '🥜'], ['cashew', '🥜'], ['almond', '🥜'],
  ['nuts', '🥜'], ['chips', '🥔'],
  // Condiments & Pantry
  ['oil', '🫙'], ['salt', '🧂'], ['sugar', '🍬'], ['honey', '🍯'],
  ['sauce', '🫙'], ['jam', '🍓'], ['vinegar', '🫙'], ['masala', '🌶️'],
  ['turmeric', '🌿'], ['cumin', '🌿'], ['coriander', '🌿'],
  // Meat & Seafood
  ['chicken', '🍗'], ['fish', '🐟'], ['mutton', '🥩'], ['beef', '🥩'],
  ['shrimp', '🦐'], ['prawn', '🦐'], ['egg', '🥚'],
  // Household
  ['soap', '🧼'], ['shampoo', '🧴'], ['detergent', '🫧'], ['tissue', '🧻'],
];

function getItemEmoji(name: string): string | null {
  const lower = name.toLowerCase();
  const match = EMOJI_MAP.find(([keyword]) => lower.includes(keyword));
  return match ? match[1] : null;
}

const CATEGORY_IMG_BG: Record<GroceryCategory, string> = {
  vegetables:    'bg-green-100    dark:bg-green-900/40',
  fruits:        'bg-orange-100   dark:bg-orange-900/40',
  dairy:         'bg-sky-100      dark:bg-sky-900/40',
  grains:        'bg-amber-100    dark:bg-amber-900/40',
  snacks:        'bg-violet-100   dark:bg-violet-900/40',
  beverages:     'bg-teal-100     dark:bg-teal-900/40',
  household:     'bg-slate-100    dark:bg-slate-700/50',
  personal_care: 'bg-rose-100     dark:bg-rose-900/40',
  other:         'bg-neutral-100  dark:bg-neutral-700/50',
};

const CATEGORY_LABEL: Record<GroceryCategory, string> = {
  vegetables: '🥦 Vegetables',
  fruits: '🍎 Fruits',
  dairy: '🥛 Dairy & Eggs',
  grains: '🌾 Rice, Atta & Dal',
  snacks: '🍿 Snacks',
  beverages: '☕ Beverages',
  household: '🏠 Household',
  personal_care: '🧴 Personal Care',
  other: '📦 Other',
};

export default function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeCartId, setActiveCartId] = useState<string | null>(null);
  const [cartQuantities, setCartQuantities] = useState<Map<string, number>>(new Map());

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<GroceryCategory>('vegetables');
  const [showForm, setShowForm] = useState(false);

  // Inline edit state
  const [editName, setEditName] = useState('');

  // Mapping modal
  const [mappingItem, setMappingItem] = useState<{ itemId: string; itemName: string } | null>(null);
  const [candidates, setCandidates] = useState<PriceEntry[]>([]);
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  // itemId → best available scraped imageUrl
  const [itemImages, setItemImages] = useState<Map<string, string>>(new Map());
  // itemId → min price (mapped products first, fallback to all scraped prices)
  const [itemMinPrices, setItemMinPrices] = useState<Map<string, number>>(new Map());
  const nameRef = useRef<HTMLInputElement>(null);
  const cartIdRef = useRef<string | null>(null);
  const pendingQty = useRef<Map<string, { item: GroceryItem; qty: number }>>(new Map());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { cartIdRef.current = activeCartId; }, [activeCartId]);
  useEffect(() => { fetchAll(); }, []);

  // Flush remaining ops on unmount
  useEffect(() => () => { if (flushTimer.current) { clearTimeout(flushTimer.current); flushNow(); } }, []);

  async function flushNow() {
    const cartId = cartIdRef.current;
    if (!cartId || pendingQty.current.size === 0) return;
    const ops = new Map(pendingQty.current);
    pendingQty.current.clear();
    await Promise.all([...ops.values()].map(({ item, qty }) =>
      qty > 0
        ? fetch(`/api/grocery/cart/${cartId}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: item._id, quantity: qty }) })
        : fetch(`/api/grocery/cart/${cartId}/items?itemId=${item._id}`, { method: 'DELETE' })
    ));
  }

  function scheduleFlush() {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushNow, 700);
  }

  async function fetchAll() {
    setLoading(true);
    try {
      // Items + cart in parallel
      const [itemsRes, cartRes] = await Promise.all([
        fetch('/api/grocery/items'),
        fetch('/api/grocery/cart'),
      ]);
      const [itemsJson, cartJson] = await Promise.all([itemsRes.json(), cartRes.json()]);

      const fetched: GroceryItem[] = itemsJson.data ?? [];
      setItems(fetched);

      const active = (cartJson.data ?? []).find((s: { status: string; _id: string }) => s.status === 'active');
      setActiveCartId(active?._id ?? null);
      cartIdRef.current = active?._id ?? null;
      const qtyMap = new Map<string, number>();
      for (const i of (active?.items ?? [])) qtyMap.set(String(i.itemId), i.quantity ?? 1);
      setCartQuantities(qtyMap);

      // Images in background — mapped product first, then any scraped image, then emoji in render
      if (fetched.length > 0) {
        const ids = fetched.map(i => i._id).join(',');
        Promise.all([
          fetch(`/api/grocery/prices?itemIds=${ids}`).then(r => r.json()),
          fetch(`/api/grocery/mapping?itemIds=${ids}`).then(r => r.json()),
        ]).then(([pricesJson, mappingsJson]) => {
          const prices: PriceEntry[] = pricesJson.data ?? [];
          const allMappings: ProductMapping[] = mappingsJson.data ?? [];

          const mappedNames = new Map<string, string>();
          for (const m of allMappings) mappedNames.set(`${String(m.itemId)}:${m.store}`, m.productName);

          const imageMap = new Map<string, string>();
          // Priority 1: image from the confirmed mapped product
          for (const e of prices) {
            if (!e.imageUrl || imageMap.has(e.itemId)) continue;
            const mapped = mappedNames.get(`${e.itemId}:${e.store}`);
            if (mapped && e.productName === mapped) imageMap.set(e.itemId, e.imageUrl);
          }
          // Priority 2: any scraped image
          for (const e of prices) {
            if (!e.imageUrl || imageMap.has(e.itemId)) continue;
            imageMap.set(e.itemId, e.imageUrl);
          }
          setItemImages(imageMap);

          const avgPriceMap = new Map<string, number>();
          for (const itm of fetched) {
            const iid = itm._id;
            const itemPrices = prices.filter(p => p.itemId === iid);
            if (itemPrices.length === 0) continue;
            const confirmedNames = new Set(
              allMappings.filter(m => String(m.itemId) === iid).map(m => m.productName)
            );
            const mapped = confirmedNames.size > 0
              ? itemPrices.filter(p => confirmedNames.has(p.productName))
              : [];
            const pool = mapped.length > 0 ? mapped : itemPrices;
            avgPriceMap.set(iid, Math.min(...pool.map(p => p.price)));
          }
          setItemMinPrices(avgPriceMap);
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function addItem() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/grocery/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), category: newCategory }),
      });
      const json = await res.json();
      if (json.data) { setItems(prev => [...prev, json.data]); resetForm(); }
    } finally {
      setAdding(false);
    }
  }

  function resetForm() {
    setNewName(''); setNewCategory('vegetables');
    setShowForm(false);
  }

  function startEdit(item: GroceryItem) {
    setEditId(item._id); setEditName(item.name);
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/grocery/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    const json = await res.json();
    if (json.data) setItems(prev => prev.map(i => i._id === id ? json.data : i));
    setEditId(null);
  }

  async function addToCart(item: GroceryItem) {
    let cartId = activeCartId;
    if (!cartId) {
      const res = await fetch('/api/grocery/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json();
      cartId = json.data?._id ?? null;
      if (cartId) { setActiveCartId(cartId); cartIdRef.current = cartId; }
    }
    if (!cartId) return;
    const newQty = (cartQuantities.get(item._id) ?? 0) + 1;
    setCartQuantities(prev => new Map(prev).set(item._id, newQty));
    const p = pendingQty.current.get(item._id);
    if (p) p.qty = newQty; else pendingQty.current.set(item._id, { item, qty: newQty });
    scheduleFlush();
  }

  async function removeFromCart(item: GroceryItem) {
    if (!activeCartId) return;
    const newQty = Math.max(0, (cartQuantities.get(item._id) ?? 0) - 1);
    setCartQuantities(prev => { const m = new Map(prev); newQty === 0 ? m.delete(item._id) : m.set(item._id, newQty); return m; });
    const p = pendingQty.current.get(item._id);
    if (p) p.qty = newQty; else pendingQty.current.set(item._id, { item, qty: newQty });
    scheduleFlush();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/grocery/items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i._id !== id));
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
      setMappings(prev => [
        ...prev.filter(m => !(String(m.itemId) === itemId && m.store === store && m.productName === productName)),
        json.data,
      ]);
      setCandidates(prev => prev.map(c => c.store === store && c.productName === productName ? { ...c, confirmed: true } : c));
    }
  }

  async function removeMapping(mapping: ProductMapping) {
    const res = await fetch(`/api/grocery/mapping/${mapping._id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setMappings(prev => prev.filter(m => m._id !== mapping._id));
      setCandidates(prev => prev.map(c => c.store === mapping.store ? { ...c, confirmed: false } : c));
    }
  }

  const grouped = CATEGORIES.reduce<Record<GroceryCategory, GroceryItem[]>>((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {} as Record<GroceryCategory, GroceryItem[]>);

  if (loading) {
    return <div className="text-center py-16 text-neutral-400 text-sm">Loading…</div>;
  }

  const categoriesInUse = CATEGORIES.filter(cat => grouped[cat].length > 0);

  return (
    <div>
      {/* Stats bar */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 mb-5 px-1">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{items.length}</span> items
          </span>
          <span className="text-neutral-200 dark:text-neutral-700">·</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-emerald-600">{cartQuantities.size}</span> in cart
          </span>
          <span className="text-neutral-200 dark:text-neutral-700">·</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{categoriesInUse.length}</span> categor{categoriesInUse.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
      )}
      {/* Add item button / form */}
      {/* Add item trigger / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-2 py-3.5 px-4 mb-6 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm font-medium"
        >
          <Plus size={15} /> Add grocery item
        </button>
      ) : (
        <div className="mb-6 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex gap-2 mb-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Item name (e.g. Tomato)"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
            />
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as GroceryCategory)}
              className="px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addItem}
              disabled={adding || !newName.trim()}
              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {adding ? 'Adding…' : 'Add Item'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Your grocery list is empty</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-600">Add items like Tomato, Milk, Rice…</p>
        </div>
      )}
      {categoriesInUse.map(cat => (
        <div key={cat} className="mb-5">
          <div className="flex items-center gap-3 mb-2 px-1">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{CATEGORY_LABEL[cat]}</span>
            <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {grouped[cat].map(item => {
              const emoji = getItemEmoji(item.name);
              const qty = cartQuantities.get(item._id) ?? 0;
              const scrapedImage = itemImages.get(item._id);
              return (
              <div
                key={item._id}
                className="group flex flex-col rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111]"
              >
                <>
                    {/* Image area — scraped photo > emoji > placeholder; emoji stays as bg fallback */}
                    <div className="relative flex items-center justify-center h-20 bg-neutral-100 dark:bg-neutral-800/50 overflow-hidden">
                      {emoji && <span className="absolute text-4xl">{emoji}</span>}
                      {!emoji && !scrapedImage && <span className="absolute text-2xl opacity-20">🛒</span>}
                      {scrapedImage && (
                        <img
                          src={scrapedImage}
                          alt={item.name}
                          className="absolute h-full w-full object-contain p-1 z-10"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                    {/* Content area */}
                    <div className="flex flex-col gap-1.5 p-2">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-white leading-snug">{item.name}</span>
                      {itemMinPrices.has(item._id) && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">from ₹{itemMinPrices.get(item._id)!.toFixed(0)}</span>
                      )}
                      <div className="flex items-center gap-0.5">
                        <a href={`https://www.zepto.com/search?query=${encodeURIComponent(item.name)}`} target="_blank" rel="noopener noreferrer" title="Search on Zepto">
                          <img src="https://www.google.com/s2/favicons?domain=zepto.com&sz=16" width={12} height={12} alt="Zepto" className="rounded-sm" />
                        </a>
                        <a href={`https://www.swiggy.com/instamart/search?query=${encodeURIComponent(item.name)}`} target="_blank" rel="noopener noreferrer" title="Search on Instamart">
                          <img src="https://www.google.com/s2/favicons?domain=swiggy.com&sz=16" width={12} height={12} alt="Instamart" className="rounded-sm" />
                        </a>
                        <button onClick={() => openMappingModal(item._id, item.name)} title="Map product" className="p-0.5 text-neutral-300 dark:text-neutral-600 hover:text-blue-500 transition-colors">
                          <SlidersHorizontal size={11} />
                        </button>
                        <div className="flex-1" />
                        <button onClick={() => startEdit(item)} title="Edit" className="p-0.5 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-opacity">
                          <Pencil size={11} />
                        </button>
                        {qty > 0 ? (
                          <button onClick={() => removeFromCart(item)} className="p-1 rounded-lg border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-500"><Trash2 size={12} /></button>
                        ) : (
                          <button onClick={() => addToCart(item)} className="p-1 rounded-lg border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600"><Plus size={12} /></button>
                        )}
                      </div>
                    </div>
                </>              
              </div>
              );
            })}
          </div>
        </div>
      ))}
      {/* Edit modal */}
      {editId && (() => {
        const editItem = items.find(i => i._id === editId);
        if (!editItem) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditId(null)}>
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">Edit item</span>
                <button onClick={() => setEditId(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"><X size={16} /></button>
              </div>
              <input
                ref={nameRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(editId); if (e.key === 'Escape') setEditId(null); }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(editId)}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { deleteItem(editId); setEditId(null); }}
                  className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
