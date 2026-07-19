'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, Star, ExternalLink, Package, CheckCircle2 } from 'lucide-react';
import AuthButton from '@/components/AuthButton';

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

const STORE_CONFIGS = [
  { id: 'amazon',   name: 'Amazon',   domain: 'amazon.in',   activeClasses: 'border-orange-400 bg-orange-50 dark:bg-orange-500/10', iconColor: 'text-orange-500 dark:text-orange-400' },
  { id: 'flipkart', name: 'Flipkart', domain: 'flipkart.com', activeClasses: 'border-blue-400 bg-blue-50 dark:bg-blue-500/10',     iconColor: 'text-blue-500 dark:text-blue-400'     },
  { id: 'myntra',   name: 'Myntra',   domain: 'myntra.com',  activeClasses: 'border-pink-400 bg-pink-50 dark:bg-pink-500/10',      iconColor: 'text-pink-500 dark:text-pink-400'     },
  { id: 'nykaa',    name: 'Nykaa',    domain: 'nykaa.com',   activeClasses: 'border-rose-400 bg-rose-50 dark:bg-rose-500/10',      iconColor: 'text-rose-500 dark:text-rose-400'     },
  { id: 'croma',    name: 'Croma',    domain: 'croma.com',   activeClasses: 'border-teal-400 bg-teal-50 dark:bg-teal-500/10',      iconColor: 'text-teal-500 dark:text-teal-400'     },
];

function favicon(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

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
          <img src={product.image} alt={product.title} className="object-contain w-full h-full p-3" onError={() => setImgErr(true)} />
        ) : (
          <Package className="h-10 w-10 text-[#ccc] dark:text-[#333]" />
        )}
        <div className="absolute top-2 left-2"><StoreBadge store={product.store} /></div>
      </div>
      <div className="flex flex-col gap-1.5 p-3 flex-grow">
        <p className="text-xs text-[#0a0a0a] dark:text-white font-medium leading-snug line-clamp-2">{product.title}</p>
        {product.price && <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{formatPrice(product.price)}</p>}
        {product.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] text-[#555] dark:text-[#666]">
              {product.rating.toFixed(1)}
              {product.reviews && <span className="text-[#aaa] dark:text-[#444]"> ({product.reviews.toLocaleString('en-IN')})</span>}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-[10px] text-[#bbb] dark:text-[#444]">Updated {timeAgo(product.updatedAt)}</span>
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

const PAGE_SIZE = 48;

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeStore, setActiveStore] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, store: string | null, replace: boolean) => {
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const storeQ = store ? `&store=${store}` : '';
      const res = await fetch(`/api/products?page=${p}&limit=${PAGE_SIZE}${storeQ}`);
      const json = await res.json();
      setProducts(prev => {
        if (replace) return json.data || [];
        const existingIds = new Set(prev.map((p: Product) => p._id));
        const newItems = (json.data || []).filter((p: Product) => !existingIds.has(p._id));
        return [...prev, ...newItems];
      });
      setTotal(json.total || 0);
      setHasMore(json.hasMore || false);
      setPage(p);
    } catch {
      if (replace) setProducts([]);
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchPage(1, activeStore, true); }, [activeStore, fetchPage]);

  const [storeCounts, setStoreCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch('/api/products/meta')
      .then(r => r.json())
      .then(json => setStoreCounts(json.storeCounts || {}))
      .catch(() => {});
  }, []);

  const metaTotal = Object.values(storeCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e0e0e0] dark:border-[#222] bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/wish" className="flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition">
              <ShoppingBag className="h-4 w-4 text-violet-400" />
              Wish Me
            </Link>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-10 space-y-6">
        {/* Title row */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Explore Products</h1>
            <p className="text-xs text-[#666] dark:text-[#555] mt-1">All products scraped by your extension.</p>
          </div>
          {!loading && (
            <span className="text-[11px] font-mono text-[#bbb] dark:text-[#444] uppercase tracking-widest">
              {products.length} of {total} product{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Store filter chips */}
        {metaTotal > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveStore(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                ${activeStore === null
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'border-[#e0e0e0] dark:border-[#2a2a2a] text-[#555] dark:text-[#666] hover:border-[#c0c0c0] dark:hover:border-[#444]'}`}
            >
              All
              <span className={`text-[10px] px-1 rounded-full ${activeStore === null ? 'bg-white/20' : 'bg-[#f0f0f0] dark:bg-[#1a1a1a] text-[#888] dark:text-[#555]'}`}>
                {metaTotal}
              </span>
            </button>
            {STORE_CONFIGS.filter(cfg => (storeCounts[cfg.id] || 0) > 0).map(cfg => (
              <button
                key={cfg.id}
                onClick={() => setActiveStore(activeStore === cfg.id ? null : cfg.id)}
                title={`${cfg.name} · ${storeCounts[cfg.id]} product${storeCounts[cfg.id] !== 1 ? 's' : ''}`}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-150
                  ${activeStore === cfg.id
                    ? cfg.activeClasses
                    : 'border-[#e0e0e0] dark:border-[#2a2a2a] hover:border-[#c0c0c0] dark:hover:border-[#444]'
                  }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={favicon(cfg.domain)} alt={cfg.name} className="h-4 w-4 rounded-sm" />
                <CheckCircle2 className={`h-2.5 w-2.5 ${activeStore === cfg.id ? 'text-current' : cfg.iconColor}`} />
                <span className={`text-[10px] font-semibold px-1 rounded-full
                  ${activeStore === cfg.id ? 'bg-white/30 dark:bg-black/30 text-current' : 'bg-[#f0f0f0] dark:bg-[#1a1a1a] text-[#888] dark:text-[#555]'}`}>
                  {storeCounts[cfg.id]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => fetchPage(page + 1, activeStore, false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#e0e0e0] dark:border-[#2a2a2a]
                    text-xs font-semibold text-[#555] dark:text-[#666]
                    hover:border-[#c0c0c0] dark:hover:border-[#444] hover:text-[#0a0a0a] dark:hover:text-white
                    disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {loadingMore
                    ? <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Loading…</>
                    : `Load more · ${Math.min(PAGE_SIZE, total - products.length)} more`
                  }
                </button>
              </div>
            )}
            {!hasMore && total > PAGE_SIZE && (
              <p className="text-center text-[11px] text-[#bbb] dark:text-[#333]">All {total} products loaded</p>
            )}
          </>
        ) : (
          <div className="py-20 flex flex-col items-center gap-3 text-center border border-dashed border-[#e0e0e0] dark:border-[#222] rounded-xl">
            <Package className="h-8 w-8 text-[#ccc] dark:text-[#333]" />
            <div>
              <p className="text-sm font-medium text-[#555] dark:text-[#555]">No products yet</p>
              <p className="text-xs text-[#999] dark:text-[#444] mt-1">
                Install the Chrome extension and browse Amazon or Flipkart.<br />
                Products are saved automatically as you browse.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#0a0a0a] dark:border-white border-t-transparent animate-spin" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
