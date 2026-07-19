'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import { Plus, Trash2, Search, ShoppingBag, ArrowRight, Pencil, Check, X } from 'lucide-react';

interface Wish {
  _id?: string;
  id?: string;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = 'quickshop_wishes_v1';
const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function getId(w: Wish) { return w._id || w.id || ''; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
    if (json.data) setWishes(prev => prev.map(w => getId(w) === id ? json.data : w));
    cancelEdit();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#222] bg-black/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <ShoppingBag className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold">quick-shop</span>
          </Link>
          <div>
            {isSignedIn ? (
              <UserButton />
            ) : hasClerk ? (
              <SignInButton mode="redirect">
                <button className="text-xs text-[#666] hover:text-white transition px-3 py-1.5 border border-[#333] rounded-lg">
                  Sign In
                </button>
              </SignInButton>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Wishlist</h1>
          <p className="text-xs text-[#555] mt-1">Jot down what you want — find products when you&apos;re ready.</p>
        </div>

        {/* Add wish */}
        <form onSubmit={addWish} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='"wireless headphones under ₹2000"'
            className="flex-grow px-4 py-2.5 rounded-lg bg-[#111] border border-[#333] text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#555] transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || adding}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-[#111] border border-[#1a1a1a] animate-pulse" />)}
          </div>
        ) : wishes.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3 text-center">
            <ShoppingBag className="h-8 w-8 text-[#333]" />
            <p className="text-[#555] text-sm">No wishes yet</p>
            <p className="text-[#444] text-xs">Type anything above and press Add.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {wishes.map(wish => {
              const id = getId(wish);
              const isDeleting = deletingId === id;
              const isEditing = editingId === id;
              return (
                <li key={id} className={`bg-[#111] border border-[#222] rounded-lg transition-all duration-150 ${isDeleting ? 'opacity-30 pointer-events-none' : 'hover:border-[#333]'}`}>
                  {isEditing ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <input
                        ref={editRef}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(wish); if (e.key === 'Escape') cancelEdit(); }}
                        className="flex-grow bg-transparent text-sm text-white focus:outline-none border-b border-white/20 pb-0.5"
                      />
                      <button onClick={() => saveEdit(wish)} className="p-1.5 text-white hover:bg-white/10 rounded transition"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={cancelEdit} className="p-1.5 text-[#555] hover:bg-white/5 rounded transition"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-grow min-w-0">
                        <p className="text-sm text-white truncate">{wish.text}</p>
                        <p className="text-[11px] text-[#444] mt-0.5">{formatDate(wish.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button title="Find products" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#333] text-[#777] text-xs hover:border-[#555] hover:text-white transition">
                          <Search className="h-3 w-3" /><span>Find</span><ArrowRight className="h-3 w-3" />
                        </button>
                        <button onClick={() => startEdit(wish)} className="p-1.5 text-[#444] hover:text-white rounded transition"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteWish(wish)} className="p-1.5 text-[#444] hover:text-red-400 rounded transition"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {wishes.length > 0 && (
          <p className="text-center text-[11px] text-[#333]">
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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
    </div>
  );
  return <WishPage isSignedIn={!!isSignedIn} />;
}

export default function WishRoute() {
  if (!hasClerk) return <WishPage isSignedIn={false} />;
  return <AuthWishPage />;
}
