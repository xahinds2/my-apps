'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Plus, Trash2, Search, ShoppingBag, ArrowRight, Pencil, Check, X } from 'lucide-react';

interface Wish {
  _id?: string;
  id?: string;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = 'quickshop_wishes_v1';
const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function getId(w: Wish) {
  return w._id || w.id || '';
}

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

export default function Dashboard() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const fetchWishes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/wishes');
      const json = await res.json();
      if (json.source === 'mock') {
        setIsDemoMode(true);
        setWishes(loadStorage());
      } else {
        setWishes(json.data || []);
      }
    } catch {
      setIsDemoMode(true);
      setWishes(loadStorage());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const addWish = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || adding) return;
    setAdding(true);
    setInput('');
    try {
      if (isDemoMode) {
        const newWish: Wish = { id: `local-${Date.now()}`, text, createdAt: new Date().toISOString() };
        const updated = [newWish, ...wishes];
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
      if (isDemoMode || id.startsWith('local-')) {
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

  const startEdit = (wish: Wish) => {
    setEditingId(getId(wish));
    setEditText(wish.text);
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async (wish: Wish) => {
    const id = getId(wish);
    const text = editText.trim();
    if (!text || text === wish.text) { cancelEdit(); return; }

    if (isDemoMode || id.startsWith('local-')) {
      const updated = wishes.map(w => getId(w) === id ? { ...w, text } : w);
      setWishes(updated);
      saveStorage(updated);
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
    <div className="font-sans min-h-screen text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="p-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 group-hover:bg-indigo-600/20 transition">
              <ShoppingBag className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="text-sm font-bold text-white">quick-shop</span>
          </Link>

          <div className="flex items-center space-x-3">
            {isDemoMode && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 tracking-wide">
                DEMO
              </span>
            )}
            {hasClerk ? (
              <UserButton />
            ) : (
              <Link href="/sign-in" className="text-xs text-slate-500 hover:text-white transition">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white">My Wishlist</h1>
          <p className="text-xs text-slate-500 mt-1">
            Jot down what you want — search for real products when you&apos;re ready.
          </p>
        </div>

        {/* Add wish form */}
        <form onSubmit={addWish} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='e.g. "wireless headphones under ₹2000"'
            className="flex-grow px-4 py-3 rounded-xl bg-slate-900 border border-white/8 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || adding}
            className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition duration-200 shrink-0 shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* Wish list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[72px] rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : wishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4 text-center">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5">
              <ShoppingBag className="h-8 w-8 text-slate-700" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Your wishlist is empty</p>
            <p className="text-slate-600 text-xs max-w-xs leading-relaxed">
              Type anything above — a product idea, a category, or something you&apos;re hunting for. Hit Add or press Enter.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {wishes.map(wish => {
              const id = getId(wish);
              const isDeleting = deletingId === id;
              const isEditing = editingId === id;

              return (
                <li
                  key={id}
                  className={`glass-panel rounded-2xl border border-white/5 transition-all duration-200 ${isDeleting ? 'opacity-30 scale-[0.98] pointer-events-none' : ''}`}
                >
                  {isEditing ? (
                    /* Edit mode */
                    <div className="flex items-center gap-2 px-4 py-3">
                      <input
                        ref={editRef}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(wish); if (e.key === 'Escape') cancelEdit(); }}
                        className="flex-grow bg-transparent text-sm text-slate-100 focus:outline-none border-b border-indigo-500/50 pb-0.5"
                      />
                      <button onClick={() => saveEdit(wish)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-700/60 transition">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      {/* Text + date */}
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-slate-100 leading-snug">{wish.text}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{formatDate(wish.createdAt)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Find products — will be wired in next phase */}
                        <button
                          title="Find products"
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-600/20 transition duration-200"
                        >
                          <Search className="h-3 w-3" />
                          <span>Find</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => startEdit(wish)}
                          title="Edit wish"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700/40 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteWish(wish)}
                          title="Delete wish"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Wish count */}
        {wishes.length > 0 && (
          <p className="text-center text-[11px] text-slate-700">
            {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'}
            {isDemoMode && ' · stored locally'}
          </p>
        )}
      </main>
    </div>
  );
}
