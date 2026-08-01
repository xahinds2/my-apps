'use client';

import { useState, useMemo, useEffect } from 'react';
import { ListChecks, X } from 'lucide-react';
import { CATEGORIES, type GroceryCategory } from '@/features/grocery/types';

interface GroceryItem {
  _id: string;
  name: string;
  category: GroceryCategory;
}

interface Props {
  items: GroceryItem[];
  onApply: (next: GroceryItem[]) => void;
}

const CATEGORY_LABEL: Record<GroceryCategory, string> = {
  vegetables:    '🥦 Vegetables',
  fruits:        '🍎 Fruits',
  dairy:         '🥛 Dairy & Eggs',
  grains:        '🌾 Rice, Atta & Dal',
  snacks:        '🍿 Snacks',
  beverages:     '☕ Beverages',
  household:     '🏠 Household',
  personal_care: '🧴 Personal Care',
  other:         '📦 Other',
};

function parseLines(text: string): { name: string; category: GroceryCategory }[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [rawName, rawCat] = line.split(':').map(s => s.trim());
      const name = (rawName ?? '').slice(0, 100);
      const category: GroceryCategory = (CATEGORIES as readonly string[]).includes(rawCat ?? '')
        ? (rawCat as GroceryCategory)
        : 'other';
      return { name, category };
    })
    .filter(r => r.name.length > 0);
}

export default function GroceryQuickEdit({ items, onApply }: Props) {
  const [open, setOpen] = useState(false);
  // kept[id] = true means the existing item is kept, false = will be removed
  const [kept, setKept] = useState<Record<string, boolean>>({});
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState(false);

  function openModal() {
    const init: Record<string, boolean> = {};
    for (const i of items) init[i._id] = true;
    setKept(init);
    setPasteText('');
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setPasteText('');
    setSaving(false);
  }

  // position:fixed is the only reliable cross-browser scroll lock (incl. iOS Safari)
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // position:fixed is the only reliable cross-browser scroll lock (incl. iOS Safari)
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const newRows = useMemo(() => parseLines(pasteText), [pasteText]);

  const toRemove = items.filter(i => !kept[i._id]);
  const toAdd    = newRows;

  async function applyChanges() {
    setSaving(true);
    try {
      await Promise.all(toRemove.map(i => fetch(`/api/grocery/items/${i._id}`, { method: 'DELETE' })));
      const results = await Promise.all(
        toAdd.map(r =>
          fetch('/api/grocery/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: r.name, category: r.category }),
          }).then(res => res.json())
        )
      );
      const created = results.filter(j => j.data).map(j => j.data as GroceryItem);
      const keptItems = items.filter(i => kept[i._id]);
      onApply([...keptItems, ...created]);
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = toRemove.length > 0 || toAdd.length > 0;

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 py-3.5 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors text-sm font-medium"
      >
        <ListChecks size={15} />
        <span className="hidden sm:inline">Quick edit</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[88vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">Quick edit list</span>
              <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
              {/* Paste area */}
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">Paste items to add</p>
                <textarea
                  autoFocus
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={'Tomato:vegetables\nApple:fruits\nMilk:dairy\nRice:grains\nChips:snacks\nCoffee:beverages\nDetergent:household\nShampoo:personal_care\nToothpicks:other'}
                  rows={9}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-emerald-500 resize-none font-mono placeholder:font-sans placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                />
                {/* Live-parsed new rows */}
                {newRows.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {newRows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200 truncate">{r.name}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">{CATEGORY_LABEL[r.category]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Existing items */}
              {items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Existing items</p>
                    <button
                      onClick={() => setKept(prev => {
                        const allKept = Object.values(prev).every(Boolean);
                        const next: Record<string, boolean> = {};
                        for (const id of Object.keys(prev)) next[id] = !allKept;
                        return next;
                      })}
                      className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline underline-offset-2"
                    >
                      {Object.values(kept).every(Boolean) ? 'Unselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const isKept = kept[item._id] ?? true;
                      return (
                        <label
                          key={item._id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isKept ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800' : 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isKept}
                            onChange={() => setKept(prev => ({ ...prev, [item._id]: !prev[item._id] }))}
                            className="accent-emerald-600 w-4 h-4 shrink-0"
                          />
                          <span className={`flex-1 text-sm truncate ${isKept ? 'text-neutral-800 dark:text-neutral-200' : 'line-through text-neutral-400 dark:text-neutral-600'}`}>
                            {item.name}
                          </span>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">{CATEGORY_LABEL[item.category]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0 space-y-2">
              {hasChanges && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  {toRemove.length > 0 && <span className="text-red-500">{toRemove.length} removed</span>}
                  {toRemove.length > 0 && toAdd.length > 0 && <span className="mx-1.5">·</span>}
                  {toAdd.length > 0 && <span className="text-emerald-600">{toAdd.length} added</span>}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={applyChanges}
                  disabled={saving || !hasChanges}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : 'Apply changes'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
