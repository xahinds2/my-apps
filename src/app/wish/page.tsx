'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import AuthButton from '@/components/AuthButton';
import { Plus, Trash2, ShoppingBag, Package, ChevronRight, Check } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface WishLink {
  url: string;
  label?: string;
}

interface Wish {
  _id?: string;
  id?: string;
  text: string;
  links: WishLink[];
  image?: string;
  budget?: string;
  status?: 'pending' | 'bought' | 'skipped';
  priority?: 'must' | 'nice' | 'maybe';
  createdAt: string;
}

/* ─── Constants ──────────────────────────────────────────────── */

const STORAGE_KEY = 'quickshop_wishes_v2';

const PLACEHOLDERS = [
  '"iPhone 17 Pro Max"',
  '"Dyson Airwrap"',
  '"Sony WH-1000XM5 Headphones"',
  '"Nike Air Max 95"',
  '"Kindle Paperwhite"',
  '"MacBook Pro M4"',
  '"iPad Pro 13-inch"',
  '"Samsung Galaxy Watch 7"',
  '"DJI Mini 4 Pro Drone"',
  '"Herman Miller Aeron Chair"',
];

const KNOWN_STORES: Record<string, string> = {
  'amazon.in': 'Amazon',
  'amazon.com': 'Amazon',
  'flipkart.com': 'Flipkart',
  'myntra.com': 'Myntra',
  'nykaa.com': 'Nykaa',
  'croma.com': 'Croma',
  'meesho.com': 'Meesho',
  'ajio.com': 'Ajio',
  'snapdeal.com': 'Snapdeal',
  'tatacliq.com': 'Tata CLiQ',
  'reliancedigital.in': 'Reliance Digital',
  'jiomart.com': 'JioMart',
};

/* ─── Helpers ────────────────────────────────────────────────── */

function getId(w: Wish) { return w._id || w.id || ''; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStoreLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return KNOWN_STORES[hostname] || hostname;
  } catch { return 'Link'; }
}

function getFavicon(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
  catch { return ''; }
}

function isValidUrl(url: string): boolean {
  try { const p = new URL(url); return p.protocol === 'http:' || p.protocol === 'https:'; }
  catch { return false; }
}

const PRIORITY_ICON: Record<string, string> = { must: '🔥', nice: '✨', maybe: '💭' };
const STATUS_STYLE: Record<string, string> = {
  bought: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  skipped: 'bg-[#f0f0f0] text-[#999] dark:bg-[#1a1a1a] dark:text-[#555] line-through',
};

function loadStorage(): Wish[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveStorage(data: Wish[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

/* ─── WishCard ───────────────────────────────────────────────── */

function WishCard({ wish, onDelete }: {
  wish: Wish;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const id = getId(wish);
  const links = wish.links || [];

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingDelete(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    onDelete();
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingDelete(false);
  };

  const hasImage = !!wish.image;

  return (
    <div className={`group relative rounded-xl overflow-hidden border border-[#e5e5e5] dark:border-[#1e1e1e] transition-all duration-150 aspect-square ${deleting ? 'opacity-30 pointer-events-none' : 'hover:border-[#c0c0c0] dark:hover:border-[#333]'}`}>

      {/* Background: image or placeholder */}
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={wish.image} alt={wish.text} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5] dark:bg-[#111]">
          <Package className="h-8 w-8 text-[#ddd] dark:text-[#2a2a2a]" />
        </div>
      )}

      {/* Gradient scrim at bottom (only when image present) */}
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      )}

      {/* Priority badge */}
      {wish.priority && (
        <span className="absolute top-3 left-3 text-lg leading-none z-20">{PRIORITY_ICON[wish.priority]}</span>
      )}
      {/* Status badge */}
      {wish.status === 'bought' && (
        <span className="absolute top-3 right-3 z-20 flex items-center gap-1 text-[10px] font-semibold pl-1.5 pr-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-emerald-400 border border-emerald-400/30">
          <Check className="h-3 w-3" /> Got it
        </span>
      )}
      {wish.status === 'skipped' && (
        <span className="absolute top-3 right-3 z-20 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white/60">Skipped</span>
      )}

      {/* Full-card link */}
      <Link href={`/wish/${id}`} className="absolute inset-0 z-10" />

      {/* Bottom overlay content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 pointer-events-none">
        <p className={`text-sm font-semibold line-clamp-2 leading-snug ${hasImage ? (wish.status === 'bought' ? 'text-white/50' : 'text-white') : wish.status === 'bought' ? 'text-[#aaa] dark:text-[#555]' : 'text-[#0a0a0a] dark:text-white'}`}>
          {wish.text}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className={`text-[11px] ${hasImage ? 'text-white/50' : 'text-[#999] dark:text-[#444]'}`}>{formatDate(wish.createdAt)}</p>
          {wish.budget && (
            <span className={`text-[11px] font-medium ${hasImage ? 'text-violet-300' : 'text-violet-600 dark:text-violet-400'}`}>₹ {wish.budget}</span>
          )}
        </div>

        {/* Link chips */}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {links.slice(0, 3).map((link, i) => (
              <span key={i} className={`flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 ${hasImage ? 'bg-white/15 text-white/70' : 'text-[#888] dark:text-[#555] bg-white dark:bg-[#111] border border-[#e0e0e0] dark:border-[#2a2a2a]'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getFavicon(link.url)} alt="" className="h-3 w-3 rounded-sm" />
                {link.label || getStoreLabel(link.url)}
              </span>
            ))}
            {links.length > 3 && (
              <span className={`text-[11px] px-1 py-0.5 ${hasImage ? 'text-white/40' : 'text-[#bbb] dark:text-[#444]'}`}>+{links.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className={`text-[11px] ${hasImage ? 'text-white/30' : 'text-[#bbb] dark:text-[#333]'}`}>
            {links.length} {links.length === 1 ? 'link' : 'links'}
          </span>
          <div className="flex items-center gap-1 pointer-events-auto">
            {confirmingDelete ? (
              <>
                <button onClick={handleCancelDelete} className={`text-[10px] px-1.5 py-0.5 rounded transition font-medium ${hasImage ? 'text-white/60 hover:text-white' : 'text-[#999] hover:text-[#555]'}`}>Cancel</button>
                <button onClick={handleConfirmDelete} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-medium transition hover:bg-red-600">Delete</button>
              </>
            ) : (
              <button onClick={handleDeleteClick} className={`p-1.5 rounded transition opacity-0 group-hover:opacity-100 ${hasImage ? 'text-white/40 hover:text-red-400' : 'text-[#ccc] dark:text-[#2a2a2a] hover:text-red-500 dark:hover:text-red-400'}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronRight className={`h-3.5 w-3.5 ${hasImage ? 'text-white/30' : 'text-[#ccc] dark:text-[#2a2a2a]'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

function WishPage({ isSignedIn }: { isSignedIn: boolean }) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [phIdx, setPhIdx] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => { setPhIdx(i => (i + 1) % PLACEHOLDERS.length); setPhVisible(true); }, 350);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const fetchWishes = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSignedIn) { setWishes(loadStorage()); return; }
      const res = await fetch('/api/wishes');
      const json = await res.json();
      setWishes(json.data || []);
    } catch { setWishes(loadStorage()); }
    finally { setIsLoading(false); }
  }, [isSignedIn]);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);

  const addWish = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || adding) return;
    setAdding(true);
    setInput('');
    try {
      if (!isSignedIn) {
        const w: Wish = { id: `local-${Date.now()}`, text, links: [], createdAt: new Date().toISOString() };
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
    } finally { setAdding(false); inputRef.current?.focus(); }
  };

  const updateWish = useCallback((updated: Wish) => {
    setWishes(prev => {
      const next = prev.map(w => getId(w) === getId(updated) ? updated : w);
      if (!isSignedIn) saveStorage(next);
      return next;
    });
  }, [isSignedIn]);

  const deleteWish = useCallback(async (wish: Wish) => {
    const id = getId(wish);
    setWishes(prev => {
      const next = prev.filter(w => getId(w) !== id);
      if (!isSignedIn) saveStorage(next);
      return next;
    });
    if (isSignedIn && !id.startsWith('local-')) {
      await fetch(`/api/wishes/${id}`, { method: 'DELETE' });
    }
  }, [isSignedIn]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e0e0e0] dark:border-[#222] bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/wish" className="flex items-center gap-2 hover:opacity-70 transition">
            <ShoppingBag className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold">Wish Me</span>
          </Link>
          <AuthButton />
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Wishlist</h1>
          <p className="text-xs text-[#666] dark:text-[#555] mt-1">
            Track things you want. Paste store links to jump there when you&apos;re ready.
          </p>
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

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-xl bg-[#f0f0f0] dark:bg-[#111] animate-pulse" />
            ))}
          </div>
        ) : wishes.length === 0 ? (
          <div className="py-32 flex flex-col items-center gap-3 text-center">
            <ShoppingBag className="h-8 w-8 text-[#ccc] dark:text-[#333]" />
            <p className="text-[#666] dark:text-[#555] text-sm">No wishes yet</p>
            <p className="text-[#999] dark:text-[#444] text-xs">Type anything above and press Add.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishes.map(wish => (
              <WishCard
                key={getId(wish)}
                wish={wish}
                onDelete={() => deleteWish(wish)}
              />
            ))}
          </div>
        )}

        {wishes.length > 0 && (
          <p className="text-center text-[11px] text-[#bbb] dark:text-[#333]">
            {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'}
            {!isSignedIn && ' · saved locally'}
          </p>
        )}
      </main>
    </div>
  );
}

/* ─── Auth wrapper ───────────────────────────────────────────── */

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
