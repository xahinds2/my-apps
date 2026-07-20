'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ShoppingBag, ArrowLeft, Star, ExternalLink, Package, CheckCircle2, Check } from 'lucide-react';
import AuthButton from '@/components/AuthButton';

/* ─── Types ─────────────────────────────────────────────────── */

interface Product {
  _id: string;
  title: string;
  price?: number;
  image?: string;
  url: string;
  store: string;
  rating?: number;
  reviews?: number;
  updatedAt: string;
}

/* ─── Store config (extensible) ─────────────────────────────── */

interface StoreConfig {
  id: string;
  name: string;
  domain: string;
  searchUrl: (q: string) => string;
  /** Tailwind classes for the "found" active state */
  activeClasses: string;
  /** Tailwind classes for the dot / icon color */
  iconColor: string;
}

function favicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

const STORE_CONFIGS: StoreConfig[] = [
  {
    id: 'amazon',   name: 'Amazon',          domain: 'amazon.in',
    searchUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
    activeClasses: 'border-orange-400 bg-orange-50 dark:bg-orange-500/10',
    iconColor: 'text-orange-500 dark:text-orange-400',
  },
  {
    id: 'flipkart',  name: 'Flipkart',         domain: 'flipkart.com',
    searchUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
    activeClasses: 'border-blue-400 bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  {
    id: 'myntra',    name: 'Myntra',           domain: 'myntra.com',
    searchUrl: (q) => `https://www.myntra.com/${encodeURIComponent(q)}`,
    activeClasses: 'border-pink-400 bg-pink-50 dark:bg-pink-500/10',
    iconColor: 'text-pink-500 dark:text-pink-400',
  },
  {
    id: 'nykaa',     name: 'Nykaa',            domain: 'nykaa.com',
    searchUrl: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}`,
    activeClasses: 'border-rose-400 bg-rose-50 dark:bg-rose-500/10',
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
  {
    id: 'croma',     name: 'Croma',            domain: 'croma.com',
    searchUrl: (q) => `https://www.croma.com/searchB?q=${encodeURIComponent(q + ':relevance')}&text=${encodeURIComponent(q)}`,
    activeClasses: 'border-teal-400 bg-teal-50 dark:bg-teal-500/10',
    iconColor: 'text-teal-500 dark:text-teal-400',
  },
];

/* ─── Store chip component ───────────────────────────────────── */

function StoreChip({
  config,
  count,
  active,
  query,
  clicked,
  searchMode,
  onFind,
  onSelect,
}: {
  config: StoreConfig;
  count: number;
  active: boolean;
  query: string;
  clicked: boolean;
  searchMode: boolean;
  onFind: () => void;
  onSelect: () => void;
}) {
  const found = count > 0;

  // Link: no products (find) or search mode with products (open store search)
  if (!found || searchMode) {
    return (
      <a
        href={config.searchUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        title={!found && clicked
          ? `Opened ${config.name} — browse to save products`
          : `Search "${query}" on ${config.name}`}
        onClick={!found ? onFind : undefined}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-150 hover:opacity-80
          ${!found && clicked
            ? 'border-green-400 dark:border-green-500/50 bg-green-50 dark:bg-green-500/10'
            : config.activeClasses
          }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={favicon(config.domain)} alt={config.name} className="h-4 w-4 rounded-sm" />
        {!found && clicked
          ? <Check className="h-2.5 w-2.5 text-green-500 dark:text-green-400" />
          : <Search className={`h-2.5 w-2.5 ${config.iconColor}`} />
        }
        {found && (
          <span className="text-[10px] font-semibold px-1 rounded-full bg-white/30 dark:bg-black/30">
            {count}
          </span>
        )}
      </a>
    );
  }

  // Filter button: has products, filter mode
  return (
    <button
      onClick={onSelect}
      title={`${config.name} · ${count} result${count !== 1 ? 's' : ''}`}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-150
        ${active
          ? config.activeClasses
          : 'border-[#e0e0e0] dark:border-[#2a2a2a] hover:border-[#c0c0c0] dark:hover:border-[#444]'
        }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={favicon(config.domain)} alt={config.name} className="h-4 w-4 rounded-sm" />
      <CheckCircle2 className={`h-2.5 w-2.5 ${active ? 'text-current' : config.iconColor}`} />
      <span className={`text-[10px] font-semibold px-1 rounded-full
        ${active ? 'bg-white/30 dark:bg-black/30 text-current' : 'bg-[#f0f0f0] dark:bg-[#1a1a1a] text-[#888] dark:text-[#555]'}`}>
        {count}
      </span>
    </button>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatPrice(price?: number) {
  if (!price) return null;
  return `₹${price.toLocaleString('en-IN')}`;
}

function StoreBadge({ store }: { store: string }) {
  const cfg = STORE_CONFIGS.find(s => s.id === store);
  if (!cfg) return null;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold pl-1 pr-1.5 py-0.5 rounded-full border ${cfg.activeClasses}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={favicon(cfg.domain)} alt={cfg.name} className="h-3 w-3 rounded-sm" />
      {cfg.name}
    </span>
  );
}

/* ─── Product card ───────────────────────────────────────────── */

function ProductCard({ product }: { product: Product }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-[#f8f8f8] dark:bg-[#0d0d0d] border border-[#e5e5e5] dark:border-[#1e1e1e]
        rounded-xl overflow-hidden hover:border-[#c0c0c0] dark:hover:border-[#333]
        transition-all duration-150 hover:scale-[1.01]"
    >
      <div className="relative aspect-square bg-white dark:bg-[#111] flex items-center justify-center overflow-hidden">
        {product.image && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.title}
            className="object-contain w-full h-full p-3"
            onError={() => setImgErr(true)}
          />
        ) : (
          <Package className="h-10 w-10 text-[#ccc] dark:text-[#333]" />
        )}
        <div className="absolute top-2 left-2">
          <StoreBadge store={product.store} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-3 flex-grow">
        <p className="text-xs text-[#0a0a0a] dark:text-white font-medium leading-snug line-clamp-2">
          {product.title}
        </p>
        {product.price && (
          <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
            {formatPrice(product.price)}
          </p>
        )}
        {product.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] text-[#555] dark:text-[#666]">
              {product.rating.toFixed(1)}
              {product.reviews && (
                <span className="text-[#aaa] dark:text-[#444]">
                  {' '}({product.reviews.toLocaleString('en-IN')})
                </span>
              )}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-[10px] text-[#bbb] dark:text-[#444]">
            Updated {timeAgo(product.updatedAt)}
          </span>
          <ExternalLink className="h-3 w-3 text-[#ccc] dark:text-[#333] group-hover:text-[#888] transition" />
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden border border-[#e5e5e5] dark:border-[#1e1e1e]">
      <div className="aspect-square bg-[#f0f0f0] dark:bg-[#111] animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#e5e5e5] dark:bg-[#1e1e1e] rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-[#e5e5e5] dark:bg-[#1e1e1e] rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-[#e5e5e5] dark:bg-[#1e1e1e] rounded animate-pulse mt-2" />
      </div>
    </div>
  );
}

/* ─── Main content ───────────────────────────────────────────── */

function FindContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get('q') || '';

  const [query, setQuery] = useState(initial);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [clickedStores, setClickedStores] = useState<Set<string>>(new Set());
  const [searchMode, setSearchMode] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastQuery, setLastQuery] = useState(initial);
  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});

  const fetchMeta = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/products/meta?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setStoreCounts(json.storeCounts || {});
    } catch {
      setStoreCounts({});
    }
  }, []);

  const fetchProducts = useCallback(async (q: string, store: string | null, pageNum: number) => {
    if (pageNum === 1) {
      setLoading(true);
      setAllProducts([]);
    } else {
      setLoadingMore(true);
    }
    try {
      const storeParam = store ? `&store=${encodeURIComponent(store)}` : '';
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=48&page=${pageNum}${storeParam}`);
      const json = await res.json();
      if (pageNum === 1) {
        setAllProducts(json.data || []);
      } else {
        setAllProducts(prev => [...prev, ...(json.data || [])]);
      }
      setHasMore(json.hasMore ?? false);
      setTotal(json.total ?? 0);
      setPage(pageNum);
    } catch {
      if (pageNum === 1) setAllProducts([]);
    } finally {
      if (pageNum === 1) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    await fetchProducts(lastQuery, activeStore, page + 1);
  }, [fetchProducts, lastQuery, activeStore, page]);

  const selectStore = useCallback((store: string | null) => {
    setActiveStore(store);
    fetchProducts(lastQuery, store, 1);
  }, [fetchProducts, lastQuery]);

  useEffect(() => {
    if (initial) {
      setLastQuery(initial);
      fetchMeta(initial);
      fetchProducts(initial, null, 1);
    } else {
      setLoading(false);
    }
  }, [initial, fetchMeta, fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setActiveStore(null);
    setClickedStores(new Set());
    setLastQuery(q);
    fetchMeta(q);
    fetchProducts(q, null, 1);
  };

  const metaTotal = Object.values(storeCounts).reduce((a, b) => a + b, 0);

  // Auto-activate search mode when no products are available
  useEffect(() => {
    if (!loading && lastQuery && metaTotal === 0) {
      setSearchMode(true);
    }
  }, [loading, lastQuery, metaTotal]);

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

      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-10 space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[#999] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to wishes
        </button>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa] dark:text-[#444] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-10 pr-28 py-3 rounded-xl bg-[#f5f5f5] dark:bg-[#111] border border-[#d4d4d4] dark:border-[#333]
              text-[#0a0a0a] dark:text-white text-sm font-medium
              placeholder:text-[#bbb] dark:placeholder:text-[#444]
              focus:outline-none focus:border-[#999] dark:focus:border-[#555] transition"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition"
          >
            Search
          </button>
        </form>

        {/* Store chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search/Filter mode toggle */}
          <button
            onClick={() => setSearchMode(prev => !prev)}
            title={searchMode ? 'Switch to filter mode' : 'Switch to search mode'}
            className={`flex items-center justify-center h-7 w-7 rounded-full border transition-all duration-150
              ${searchMode
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-[#e0e0e0] dark:border-[#2a2a2a] text-[#aaa] dark:text-[#444] hover:border-[#c0c0c0] dark:hover:border-[#444] hover:text-[#555] dark:hover:text-[#777]'
              }`}
          >
            <Search className="h-3 w-3" />
          </button>

          {/* All chip */}
          {!searchMode && metaTotal > 0 && (
            <button
              onClick={() => selectStore(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                ${activeStore === null
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'border-[#e0e0e0] dark:border-[#2a2a2a] text-[#555] dark:text-[#666] hover:border-[#c0c0c0] dark:hover:border-[#444]'
                }`}
            >
              All
              <span className={`text-[10px] px-1 rounded-full ${activeStore === null ? 'bg-white/20' : 'bg-[#f0f0f0] dark:bg-[#1a1a1a] text-[#888] dark:text-[#555]'}`}>
                {metaTotal}
              </span>
            </button>
          )}

          {STORE_CONFIGS.filter(cfg => !!lastQuery || (storeCounts[cfg.id] || 0) > 0).map(cfg => (
            <StoreChip
              key={cfg.id}
              config={cfg}
              count={storeCounts[cfg.id] || 0}
              active={activeStore === cfg.id}
              query={lastQuery}
              clicked={clickedStores.has(cfg.id)}
              searchMode={searchMode}
              onFind={() => setClickedStores(prev => new Set(prev).add(cfg.id))}
              onSelect={() => selectStore(activeStore === cfg.id ? null : cfg.id)}
            />
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : allProducts.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] font-mono text-[#aaa] dark:text-[#444] uppercase tracking-widest">
              {activeStore
                ? `${allProducts.length} of ${total} result${total !== 1 ? 's' : ''} · ${STORE_CONFIGS.find(s => s.id === activeStore)?.name}`
                : `${allProducts.length} of ${total} result${total !== 1 ? 's' : ''} · all stores`
              }
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allProducts.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {loadingMore && (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-14 flex flex-col items-center gap-3 text-center border border-dashed border-[#e0e0e0] dark:border-[#222] rounded-xl">
            <Package className="h-8 w-8 text-[#ccc] dark:text-[#333]" />
            <div>
              <p className="text-sm font-medium text-[#555] dark:text-[#555]">No products in your database yet</p>
              <p className="text-xs text-[#999] dark:text-[#444] mt-1">
                Install the Chrome extension, then browse Amazon or Flipkart search pages.<br />
                Products are saved automatically as you browse.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function FindPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#0a0a0a] dark:border-white border-t-transparent animate-spin" />
      </div>
    }>
      <FindContent />
    </Suspense>
  );
}
