'use client';

import { X, Plus, Minus } from 'lucide-react';

export interface MappingCandidate {
  _id: string;
  itemId: string;
  store: 'zepto' | 'instamart';
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
  store: 'zepto' | 'instamart';
  productName: string;
  productUrl?: string;
}

interface Props {
  item: { itemId: string; itemName: string } | null;
  candidates: MappingCandidate[];
  mappings: MappingEntry[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (itemId: string, store: 'zepto' | 'instamart', productName: string) => void;
  onRemove: (mapping: MappingEntry) => void;
}

function priceAge(scrapedAt: string): string {
  const diff = Date.now() - new Date(scrapedAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export default function ProductMappingModal({ item, candidates, mappings, loading, onClose, onConfirm, onRemove }: Props) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden"
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
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-sm text-neutral-400 py-8">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="text-center text-sm text-neutral-400 py-8">
              No scraped prices yet. Use the extension on Zepto or Instamart first.
            </p>
          ) : (
            (['zepto', 'instamart'] as const).map(store => {
              const storeCandidates = candidates.filter(c => c.store === store);
              if (storeCandidates.length === 0) return null;
              const hasConfirmed = mappings.some(m => m.store === store);
              return (
                <div key={store} className="mb-5 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${store === 'zepto' ? 'zepto.com' : 'swiggy.com'}&sz=16`}
                      width={14} height={14} alt={store} className="rounded-sm"
                    />
                    <span className={`text-xs font-semibold uppercase tracking-wide ${store === 'zepto' ? 'text-purple-500' : 'text-orange-500'}`}>
                      {store === 'zepto' ? 'Zepto' : 'Instamart'}
                    </span>
                    {hasConfirmed && (
                      <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ mapped</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {storeCandidates.map(c => {
                      const isConfirmed = mappings.some(m => m.store === store && m.productName === c.productName);
                      const thisMapping = mappings.find(m => m.store === store && m.productName === c.productName);
                      return (
                        <div
                          key={c._id}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors ${
                            isConfirmed
                              ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950'
                              : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'
                          }`}
                        >
                          {c.imageUrl && (
                            <img
                              src={c.imageUrl} alt={c.productName}
                              className="w-10 h-10 rounded-lg object-contain shrink-0 bg-white"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            {c.productUrl ? (
                              <a href={c.productUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-900 dark:text-white truncate hover:underline block">
                                {c.productName}
                              </a>
                            ) : (
                              <div className="font-medium text-neutral-900 dark:text-white truncate">{c.productName}</div>
                            )}
                            <div className="text-xs text-neutral-400 mt-0.5">
                              ₹{c.price.toFixed(0)}{c.unit ? ` · ${c.unit}` : ''} · {priceAge(c.scrapedAt)}
                            </div>
                          </div>
                          {isConfirmed ? (
                            <button
                              onClick={() => onRemove(thisMapping!)}
                              className="shrink-0 p-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                          ) : (
                            <button
                              onClick={() => onConfirm(item.itemId, store, c.productName)}
                              className="shrink-0 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
