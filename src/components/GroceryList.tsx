'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, X, SlidersHorizontal } from 'lucide-react';
import ProductMappingModal from '@/components/ProductMappingModal';
import GroceryImportExport from '@/components/GroceryImportExport';
import { CATEGORIES, type GroceryCategory } from '@/features/grocery/types';

interface GroceryItem {
  _id: string;
  name: string;
  category: GroceryCategory;
}

interface PriceEntry {
  _id: string;
  itemId: string;
  store: 'zepto' | 'instamart' | 'flipkart_minutes' | 'amazon_fresh';
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
  store: 'zepto' | 'instamart' | 'flipkart_minutes' | 'amazon_fresh';
  productName: string;
  unit?: string;
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

const CATEGORY_LABEL: Record<string, string> = {
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

function getCategoryLabel(cat: string): string {
  return CATEGORY_LABEL[cat] ?? `📦 ${cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
}

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
  const [editCategory, setEditCategory] = useState<GroceryCategory>('vegetables');
  const [editCategoryInput, setEditCategoryInput] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Mapping modal
  const [mappingItem, setMappingItem] = useState<{ itemId: string; itemName: string } | null>(null);
  const [candidates, setCandidates] = useState<PriceEntry[]>([]);
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);

  // itemId → best available scraped imageUrl
  const [itemImages, setItemImages] = useState<Map<string, string>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(false);
  // itemId → min price (mapped products first, fallback to all scraped prices)
  const [itemMinPrices, setItemMinPrices] = useState<Map<string, number>>(new Map());
  const nameRef = useRef<HTMLInputElement>(null);
  const cartIdRef = useRef<string | null>(null);
  const pendingQty = useRef<Map<string, { item: GroceryItem; qty: number }>>(new Map());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { cartIdRef.current = activeCartId; }, [activeCartId]);
  useEffect(() => { fetchAll(); }, []);

  // Flush remaining ops on unmount
  useEffect(() => () => { if (flushTimer.current) { clearTimeout(flushTimer.current); void flushNow(); } }, []);

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
    flushTimer.current = setTimeout(flushNow, 500);
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

      const allCarts: { status: string; _id: string; cartType?: string; items?: { itemId: string; quantity: number }[] }[] = cartJson.data ?? [];
      const active = allCarts.find(s => s.cartType === 'main' && s.status === 'active') ?? allCarts.find(s => s.status === 'active');
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
          setImagesLoaded(true);

          const avgPriceMap = new Map<string, number>();
          for (const itm of fetched) {
            const iid = itm._id;
            const itemPrices = prices.filter(p => p.itemId === iid);
            if (itemPrices.length === 0) continue;
            const confirmedNames = new Set(
              allMappings.filter(m => String(m.itemId) === iid).map(m => m.productName)
            );
            const mapped = itemPrices.filter(p => confirmedNames.has(p.productName));
            if (mapped.length === 0) continue;
            avgPriceMap.set(iid, Math.min(...mapped.map(p => p.price)));
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
        body: JSON.stringify({ name: newName.trim(), category: newCategory === '__new__' ? (newCategoryInput.trim() || 'other') : newCategory }),
      });
      const json = await res.json();
      if (json.data) { setItems(prev => [...prev, json.data]); resetForm(); }
    } finally {
      setAdding(false);
    }
  }

  function resetForm() {
    setNewName(''); setNewCategory('vegetables'); setNewCategoryInput('');
    setShowForm(false);
  }

  function startEdit(item: GroceryItem) {
    setEditId(item._id); setEditName(item.name); setEditCategory(item.category);
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/grocery/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, category: editCategory === '__new__' ? (editCategoryInput.trim() || 'other') : editCategory }),
    });
    const json = await res.json();
    if (json.data) setItems(prev => prev.map(i => i._id === id ? json.data : i));
    setEditId(null);
  }

  async function addToCart(item: GroceryItem) {
    let cartId = activeCartId;
    if (!cartId) {
      // Ensure main cart exists
      const res = await fetch('/api/grocery/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartType: 'main' }) });
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
    setCartQuantities(prev => { const m = new Map(prev); if (newQty === 0) m.delete(item._id); else m.set(item._id, newQty); return m; });
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

  async function confirmMapping(itemId: string, store: 'zepto' | 'instamart' | 'flipkart_minutes' | 'amazon_fresh', productName: string, unit: string) {
    const res = await fetch('/api/grocery/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, store, productName, unit }),
    });
    const json = await res.json();
    if (json.data) {
      setMappings(prev => [
        ...prev.filter(m => !(String(m.itemId) === itemId && m.store === store && m.productName === productName && (m.unit ?? '') === unit)),
        json.data,
      ]);
      setCandidates(prev => prev.map(c => c.store === store && c.productName === productName && (c.unit ?? '') === unit ? { ...c, confirmed: true } : c));
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

  const customCatsInItems = Array.from(
    new Set(items.map(i => i.category).filter(c => !(CATEGORIES as readonly string[]).includes(c)))
  ).sort();
  const allCategoryOptions = [...CATEGORIES, ...customCatsInItems];

  const grouped: Record<string, GroceryItem[]> = {};
  for (const cat of allCategoryOptions) {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) grouped[cat] = catItems;
  }

  if (loading) {
    return <div className="text-center py-16 text-neutral-400 text-sm">Loading…</div>;
  }

  const categoriesInUse = allCategoryOptions.filter(cat => grouped[cat]?.length > 0);

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
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 flex items-center gap-2 py-3.5 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm font-medium"
          >
            <Plus size={15} /> Add grocery item
          </button>
          <GroceryImportExport items={items} onApply={next => setItems(next)} />
        </div>
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
              onChange={e => { setNewCategory(e.target.value as GroceryCategory); setNewCategoryInput(''); }}
              className="px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 outline-none"
            >
              {allCategoryOptions.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
              <option value="__new__">✚ New category…</option>
            </select>
          </div>
          {newCategory === '__new__' && (
            <input
              autoFocus
              value={newCategoryInput}
              onChange={e => setNewCategoryInput(e.target.value)}
              placeholder="Category name (e.g. Frozen Food)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none mb-2"
            />
          )}
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
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{getCategoryLabel(cat)}</span>
            <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {grouped[cat].map(item => {
              const emoji = getItemEmoji(item.name);
              const qty = cartQuantities.get(item._id) ?? 0;
              const scrapedImage = itemImages.get(item._id);
              const inCart = qty > 0;
              return (
              <div
                key={item._id}
                className="group relative flex flex-col rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111] transition-shadow duration-200 hover:shadow-md"
              >
                {/* Image area */}
                <div className="relative flex items-center justify-center h-28 sm:h-36 bg-neutral-50 dark:bg-neutral-800/40 overflow-hidden">
                  {imagesLoaded && emoji && !scrapedImage && <span className="text-4xl">{emoji}</span>}
                  {imagesLoaded && !emoji && !scrapedImage && <span className="text-2xl opacity-15">🛒</span>}
                  {scrapedImage && (
                    <img
                      src={scrapedImage}
                      alt={item.name}
                      className="absolute inset-0 h-full w-full object-contain p-1.5"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  {/* Hover actions */}
                  <div className="absolute inset-0 z-10 flex items-start justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openMappingModal(item._id, item.name)} title="Map product" className="p-1.5 rounded-lg bg-white/90 dark:bg-black/60 backdrop-blur-sm text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors shadow-sm">
                      <SlidersHorizontal size={12} />
                    </button>
                    <button onClick={() => startEdit(item)} title="Edit" className="p-1.5 rounded-lg bg-white/90 dark:bg-black/60 backdrop-blur-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors shadow-sm">
                      <Pencil size={12} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 px-2 py-1.5">
                  <span className="text-[13px] font-semibold text-neutral-900 dark:text-white leading-tight line-clamp-2">{item.name}</span>
                  <div className="mt-auto pt-1 flex items-end justify-between">
                    {itemMinPrices.has(item._id) ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">₹{itemMinPrices.get(item._id)!.toFixed(0)}</span>
                    ) : (
                      <span className="text-xs text-neutral-300 dark:text-neutral-700">—</span>
                    )}
                    {inCart ? (
                      <button onClick={() => removeFromCart(item)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/90 dark:bg-red-600/90 text-white hover:bg-red-600 dark:hover:bg-red-500 text-xs font-medium transition-colors shadow-sm">
                        <Trash2 size={12} /> Remove
                      </button>
                    ) : (
                      <button onClick={() => addToCart(item)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 dark:bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500 text-xs font-medium transition-colors">
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>
                </div>
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none mb-3"
              />
              <select
                value={editCategory}
                onChange={e => { setEditCategory(e.target.value as GroceryCategory); setEditCategoryInput(''); }}
                className={`w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 outline-none ${editCategory === '__new__' ? 'mb-2' : 'mb-4'}`}
              >
                {allCategoryOptions.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                <option value="__new__">✚ New category…</option>
              </select>
              {editCategory === '__new__' && (
                <input
                  value={editCategoryInput}
                  onChange={e => setEditCategoryInput(e.target.value)}
                  placeholder="Category name (e.g. Frozen Food)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none mb-4"
                />
              )}
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
