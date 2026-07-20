'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import AuthButton from '@/components/AuthButton';
import { Plus, Trash2, Search, ShoppingBag, ArrowRight, Pencil, Check, X, LayoutGrid, TrendingDown } from 'lucide-react';

interface PriceHistoryEntry {
  price: number;
  store: string;
  date: string;
}

interface PriceData {
  loading: boolean;
  latestPrice?: number;
  latestStore?: string;
  currency?: string;
  productCount?: number;
  lowestPrice6m?: number | null;
  lowestStore6m?: string | null;
  lowestDate6m?: string | null;
  alternatives?: { title: string; price: number; store: string; url: string; image: string }[];
}

interface Wish {
  _id?: string;
  id?: string;
  text: string;
  createdAt: string;
  priceSnapshot?: {
    latestPrice?: number;
    latestStore?: string;
    currency?: string;
    productCount?: number;
    checkedAt?: string;
  };
  priceHistory?: PriceHistoryEntry[];
}

const STORAGE_KEY = 'quickshop_wishes_v1';

const PLACEHOLDERS = [
  '"iPhone 17 Pro Max"',
  '"Dyson Airwrap"',
  '"Sony WH-1000XM5 Headphones"',
  '"Nike Air Max 95"',
  '"Kindle Paperwhite"',
  '"Samsung Galaxy Watch 7"',
  '"MacBook Pro M4"',
  '"iPad Pro 13-inch"',
  '"Apple AirPods Pro"',
  '"DJI Mini 4 Pro Drone"',
  '"PlayStation 5 Slim"',
  '"Xbox Series X"',
  '"Bose QuietComfort 45"',
  '"GoPro Hero 13"',
  '"Levi\'s 501 Jeans"',
  '"Canon EOS R50 Camera"',
  '"Garmin Fenix 8"',
  '"Nintendo Switch OLED"',
  '"Theragun Pro"',
  '"Dyson V15 Vacuum"',
  '"Samsung 65" OLED TV"',
  '"Herman Miller Aeron Chair"',
  '"Vitamix Blender"',
  '"Le Creuset Dutch Oven"',
  '"Lululemon Define Jacket"',
  '"Ray-Ban Meta Smart Glasses"',
  '"Meta Quest 3"',
  '"Sonos Era 300"',
  '"Nespresso Vertuo Pop"',
  '"Weber Genesis Grill"',
];

function getId(w: Wish) { return w._id || w.id || ''; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPrice(price: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}

function capitalizeStore(store?: string | null) {
  if (!store) return '';
  return store.charAt(0).toUpperCase() + store.slice(1);
}

function computeLow6m(history?: PriceHistoryEntry[]) {
  if (!history?.length) return null;
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const recent = history.filter(h => new Date(h.date).getTime() >= cutoff);
  if (!recent.length) return null;
  return recent.reduce((min, h) => (h.price < min.price ? h : min), recent[0]);
}

/* ─── Price metadata sub-component ──────────────────────────── */

function PriceMeta({ pd }: { pd?: PriceData }) {
  if (!pd) return null;
  if (pd.loading) return (
    <div className="mt-2 flex gap-2">
      <div className="h-2.5 w-16 bg-[#ebebeb] dark:bg-[#1a1a1a] rounded animate-pulse" />
      <div className="h-2.5 w-20 bg-[#ebebeb] dark:bg-[#1a1a1a] rounded animate-pulse" />
    </div>
  );
  const hasPrice = !!pd.latestPrice;
  const showLow = hasPrice && pd.lowestPrice6m != null && pd.lowestPrice6m < pd.latestPrice!;
  const showAlts = !hasPrice && (pd.alternatives?.length ?? 0) > 0;
  return (
    <div className="mt-1.5 space-y-1">
      {hasPrice && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-[11px] font-medium text-[#333] dark:text-[#ccc]">
            {formatPrice(pd.latestPrice!, pd.currency)}
            <span className="font-normal text-[#999] dark:text-[#555]"> · {capitalizeStore(pd.latestStore)}</span>
          </span>
          {showLow && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <TrendingDown className="h-2.5 w-2.5" />
              6m low {formatPrice(pd.lowestPrice6m!, pd.currency)} · {capitalizeStore(pd.lowestStore6m)}
            </span>
          )}
          {pd.productCount !== undefined && (
            <span className="text-[11px] text-[#bbb] dark:text-[#444]">{pd.productCount} {pd.productCount === 1 ? 'match' : 'matches'}</span>
          )}
        </div>
      )}
      {showAlts && (
        <div className="space-y-0.5">
          <p className="text-[11px] text-[#bbb] dark:text-[#444]">Not found · similar items:</p>
          {pd.alternatives!.slice(0, 3).map((alt, i) => (
            <a key={i} href={alt.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#888] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white transition">
              <ArrowRight className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{alt.title}</span>
              <span className="shrink-0 text-[#bbb] dark:text-[#444]">· {formatPrice(alt.price)} · {capitalizeStore(alt.store)}</span>
            </a>
          ))}
        </div>
      )}
      {!hasPrice && !showAlts && (
        <p className="text-[11px] text-[#bbb] dark:text-[#444]">Not found in database yet</p>
      )}
    </div>
  );
}

function loadStorage(): Wish[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveStorage(data: Wish[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function WishPage({ isSignedIn }: { isSignedIn: boolean }) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const [phIdx, setPhIdx] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const fetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPhIdx(i => (i + 1) % PLACEHOLDERS.length);
        setPhVisible(true);
      }, 350);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const fetchPriceData = useCallback(async (wish: Wish) => {
    const id = getId(wish);
    setPriceData(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      // Unauthenticated or local wish → stateless summary API
      if (!isSignedIn || !id || id.startsWith('local-')) {
        const res = await fetch(`/api/products/summary?q=${encodeURIComponent(wish.text)}`);
        const json = await res.json();
        setPriceData(prev => ({ ...prev, [id]: { loading: false, ...json } }));
        return;
      }

      // Signed-in: use cached snapshot if fresh and has a price
      const snap = wish.priceSnapshot;
      const age = snap?.checkedAt ? Date.now() - new Date(snap.checkedAt).getTime() : Infinity;
      if (age < 3_600_000 && snap?.latestPrice) {
        const low = computeLow6m(wish.priceHistory);
        setPriceData(prev => ({
          ...prev,
          [id]: {
            loading: false,
            latestPrice: snap.latestPrice,
            latestStore: snap.latestStore,
            currency: snap.currency,
            productCount: snap.productCount,
            lowestPrice6m: low?.price ?? null,
            lowestStore6m: low?.store ?? null,
            lowestDate6m: low?.date ?? null,
          },
        }));
        return;
      }

      // Stale or no snapshot → fetch fresh from server
      const res = await fetch(`/api/wishes/${id}/snapshot`, { method: 'POST' });
      const json = await res.json();
      setPriceData(prev => ({ ...prev, [id]: { loading: false, ...json } }));
    } catch {
      setPriceData(prev => ({ ...prev, [id]: { loading: false } }));
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoading) return;
    const toFetch = wishes.filter(w => !fetchedIds.current.has(getId(w)));
    toFetch.forEach(w => {
      fetchedIds.current.add(getId(w));
      fetchPriceData(w);
    });
  }, [wishes, isLoading, fetchPriceData]);

  const fetchWishes = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSignedIn) { setWishes(loadStorage()); return; }
      const res = await fetch('/api/wishes');
      const json = await res.json();
      setWishes(json.data || []);
    } catch {
      setWishes(loadStorage());
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);
  useEffect(() => { if (editingId) editRef.current?.focus(); }, [editingId]);

  const addWish = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || adding) return;
    setAdding(true);
    setInput('');
    try {
      if (!isSignedIn) {
        const w: Wish = { id: `local-${Date.now()}`, text, createdAt: new Date().toISOString() };
        const updated = [w, ...wishes];
        setWishes(updated);
        saveStorage(updated);
        return;
      }
      const res = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.data) setWishes(prev => [json.data, ...prev]);
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  };

  const deleteWish = async (wish: Wish) => {
    const id = getId(wish);
    setDeletingId(id);
    try {
      if (!isSignedIn || id.startsWith('local-')) {
        const updated = wishes.filter(w => getId(w) !== id);
        setWishes(updated);
        saveStorage(updated);
        return;
      }
      await fetch(`/api/wishes/${id}`, { method: 'DELETE' });
      setWishes(prev => prev.filter(w => getId(w) !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (wish: Wish) => { setEditingId(getId(wish)); setEditText(wish.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (wish: Wish) => {
    const id = getId(wish);
    const text = editText.trim();
    if (!text || text === wish.text) { cancelEdit(); return; }
    if (!isSignedIn || id.startsWith('local-')) {
      setWishes(prev => prev.map(w => getId(w) === id ? { ...w, text } : w));
      saveStorage(wishes.map(w => getId(w) === id ? { ...w, text } : w));
      cancelEdit();
      return;
    }
    const res = await fetch(`/api/wishes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    if (json.data) {
      setWishes(prev => prev.map(w => getId(w) === id ? json.data : w));
      // Text changed — clear stale price data so it re-fetches
      fetchedIds.current.delete(id);
      setPriceData(prev => { const next = { ...prev }; delete next[id]; return next; });
    }
    cancelEdit();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e0e0e0] dark:border-[#222] bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/wish" className="flex items-center gap-2 hover:opacity-70 transition">
            <ShoppingBag className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold">Wish Me</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/wish/explore"
              className="flex items-center gap-1.5 text-xs text-[#999] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white transition"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Explore
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Wishlist</h1>
          <p className="text-xs text-[#666] dark:text-[#555] mt-1">Jot down what you want — find products when you&apos;re ready.</p>
        </div>

        {/* Add wish */}
        <form onSubmit={addWish} className="flex gap-2">
          <div className="relative flex-grow">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              className="w-full px-4 py-2.5 rounded-lg bg-[#f5f5f5] border border-[#d4d4d4] text-[#0a0a0a] dark:bg-[#111] dark:border-[#333] dark:text-white text-sm focus:outline-none focus:border-[#999] dark:focus:border-[#555] transition"
            />
            {!input && !inputFocused && (
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#aaa] dark:text-[#444] pointer-events-none select-none transition-opacity duration-300"
                style={{ opacity: phVisible ? 1 : 0 }}
              >
                {PLACEHOLDERS[phIdx]}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!input.trim() || adding}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0a0a0a] text-white dark:bg-white dark:text-black text-sm font-semibold hover:bg-[#222] dark:hover:bg-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-[#f0f0f0] border border-[#e5e5e5] dark:bg-[#111] dark:border-[#1a1a1a] animate-pulse" />)}
          </div>
        ) : wishes.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3 text-center">
            <ShoppingBag className="h-8 w-8 text-[#ccc] dark:text-[#333]" />
            <p className="text-[#666] dark:text-[#555] text-sm">No wishes yet</p>
            <p className="text-[#999] dark:text-[#444] text-xs">Type anything above and press Add.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {wishes.map(wish => {
              const id = getId(wish);
              const isDeleting = deletingId === id;
              const isEditing = editingId === id;
              return (
                <li key={id} className={`bg-[#f8f8f8] border border-[#e5e5e5] dark:bg-[#111] dark:border-[#222] rounded-lg transition-all duration-150 ${isDeleting ? 'opacity-30 pointer-events-none' : 'hover:border-[#d0d0d0] dark:hover:border-[#333]'}`}>
                  {isEditing ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <input
                        ref={editRef}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(wish); if (e.key === 'Escape') cancelEdit(); }}
                        className="flex-grow bg-transparent text-sm text-[#0a0a0a] dark:text-white focus:outline-none border-b border-black/20 dark:border-white/20 pb-0.5"
                      />
                      <button onClick={() => saveEdit(wish)} className="p-1.5 text-[#0a0a0a] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded transition"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={cancelEdit} className="p-1.5 text-[#999] dark:text-[#555] hover:bg-black/5 dark:hover:bg-white/5 rounded transition"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-grow min-w-0">
                          <p className="text-sm text-[#0a0a0a] dark:text-white truncate">{wish.text}</p>
                          <p className="text-[11px] text-[#999] dark:text-[#444] mt-0.5">{formatDate(wish.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Link
                            href={`/wish/find?q=${encodeURIComponent(wish.text)}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#d4d4d4] dark:border-[#333] text-[#999] dark:text-[#777] text-xs hover:border-[#999] hover:text-[#0a0a0a] dark:hover:border-[#555] dark:hover:text-white transition"
                          >
                            <Search className="h-3 w-3" /><span>Find</span><ArrowRight className="h-3 w-3" />
                          </Link>
                          <button onClick={() => startEdit(wish)} className="p-1.5 text-[#bbb] hover:text-[#0a0a0a] dark:text-[#444] dark:hover:text-white rounded transition"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteWish(wish)} className="p-1.5 text-[#bbb] hover:text-red-500 dark:text-[#444] dark:hover:text-red-400 rounded transition"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <PriceMeta pd={priceData[id]} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {wishes.length > 0 && (
          <p className="text-center text-[11px] text-[#bbb] dark:text-[#333]">
            {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'}{!isSignedIn && ' · local'}
          </p>
        )}
      </main>
    </div>
  );
}

function AuthWishPage() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-[#0a0a0a] dark:border-white border-t-transparent animate-spin" />
    </div>
  );
  return <WishPage isSignedIn={!!isSignedIn} />;
}

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function WishRoute() {
  if (!hasClerk) return <WishPage isSignedIn={false} />;
  return <AuthWishPage />;
}
