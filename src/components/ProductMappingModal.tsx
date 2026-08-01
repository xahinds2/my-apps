'use client';

import { X, Plus, Minus } from 'lucide-react';
import { STORES, type GroceryStore } from '@/features/grocery/types';

export interface MappingCandidate {
  _id: string;
  itemId: string;
  store: GroceryStore;
  productName: string;
  productUrl?: string;
  imageUrl?: string;
  price: number;
  unit: string;
  scrapedAt: string;
  confirmed: boolean;
}

export interface MappingEntry {
  _id: string;
  itemId: string;
  store: GroceryStore;
  productName: string;
  productUrl?: string;
}

const STORE_META: Record<GroceryStore, { label: string; favicon: string; color: string }> = {
  zepto:            { label: 'Zepto',    favicon: 'zepto.com',    color: 'text-purple-500' },
  instamart:        { label: 'Instamart', favicon: 'swiggy.com',  color: 'text-orange-500' },
  flipkart_minutes: { label: 'Flipkart', favicon: 'flipkart.com', color: 'text-blue-500' },
  amazon_fresh:     { label: 'Amazon',   favicon: 'amazon.in',    color: 'text-yellow-600' },
};

interface Props {
  item: { itemId: string; itemName: string } | null;
  candidates: MappingCandidate[];
  mappings: MappingEntry[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (itemId: string, store: GroceryStore, productName: string) => void;
  onRemove: (mapping: MappingEntry) => void;
}

export default function ProductMappingModal({ item, candidates, mappings, loading, onClose, onConfirm, onRemove }: Props) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">{item.itemName}</div>
            <div className="text-xs text-neutral-400 mt-0.5">Confirm which product maps to this item</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-sm text-neutral-400 py-8">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="text-center text-sm text-neutral-400 py-8">
              No scraped prices yet. Use the extension on Zepto or Instamart first.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-100 dark:divide-neutral-800">
              {STORES.map(store => {
                const storeCandidates = candidates.filter(c => c.store === store);
                const meta = STORE_META[store];
                const confirmedMapping = mappings.find(m => m.store === store);
                return (
                  <div key={store} className="flex flex-col min-w-0">
                    {/* Store column header */}
                    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 sticky top-0">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${meta.favicon}&sz=16`}
                        width={13} height={13} alt={store} className="rounded-sm shrink-0"
                      />
                      <span className={`text-xs font-bold uppercase tracking-wide truncate ${meta.color}`}>{meta.label}</span>
                      {confirmedMapping && <span className="ml-auto text-emerald-500 text-xs shrink-0">✓</span>}
                    </div>
                    {/* Candidates */}
                    <div className="p-2 space-y-2">
                      {storeCandidates.length === 0 ? (
                        <p className="text-xs text-neutral-400 dark:text-neutral-600 text-center py-4">No results</p>
                      ) : storeCandidates.map(c => {
                        const isConfirmed = mappings.some(m => m.store === store && m.productName === c.productName);
                        const thisMapping = mappings.find(m => m.store === store && m.productName === c.productName);
                        return (
                          <div
                            key={c._id}
                            className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-colors ${
                              isConfirmed
                                ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                            }`}
                          >
                            {c.imageUrl && (
                              <img
                                src={c.imageUrl} alt={c.productName}
                                className="w-full aspect-square object-contain rounded-lg bg-white"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <div className="min-w-0">
                              {c.productUrl ? (
                                <a href={c.productUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs font-medium text-neutral-900 dark:text-white line-clamp-2 leading-tight hover:underline block">
                                  {c.productName}
                                </a>
                              ) : (
                                <p className="text-xs font-medium text-neutral-900 dark:text-white line-clamp-2 leading-tight">{c.productName}</p>
                              )}
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {c.price != null ? `₹${c.price.toFixed(0)}` : '—'}{c.unit ? ` · ${c.unit}` : ''}
                              </p>
                            </div>
                            {isConfirmed ? (
                              <button
                                onClick={() => onRemove(thisMapping!)}
                                className="w-full py-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-1 text-xs"
                              >
                                <Minus size={11} /> Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => onConfirm(item.itemId, store, c.productName)}
                                className="w-full py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center justify-center gap-1 text-xs"
                              >
                                <Plus size={11} /> Map
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
