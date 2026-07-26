'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, ChevronRight, Check } from 'lucide-react';

export interface ManifestLink {
  url: string;
  label?: string;
}

export interface ManifestItem {
  _id?: string;
  id?: string;
  text: string;
  links: ManifestLink[];
  image?: string;
  budget?: string;
  timeline?: string;
  status?: 'pending' | 'bought' | 'skipped';
  priority?: 'must' | 'nice' | 'maybe';
  note?: string;
  createdAt: string;
}

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

const PRIORITY_ICON: Record<string, string> = { must: '🔥', nice: '✨', maybe: '💭' };

export function getId(item: ManifestItem) {
  return item._id || item.id || '';
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getStoreLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return KNOWN_STORES[hostname] || hostname;
  } catch {
    return 'Link';
  }
}

export function getFavicon(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return '';
  }
}

export function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}

interface ManifestCardProps {
  item: ManifestItem;
  onDelete?: () => void;
}

export default function ManifestCard({ item, onDelete }: ManifestCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const id = getId(item);
  const links = item.links || [];
  const bought = item.status === 'bought';
  const skipped = item.status === 'skipped';
  const editable = !!onDelete;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingDelete(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    onDelete?.();
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingDelete(false);
  };

  const hue = nameToHue(item.text);

  return (
    <div className={`group relative flex items-center gap-4 p-3 rounded-xl border bg-white dark:bg-[#0d0d0d] transition-all duration-150 ${deleting ? 'opacity-30 pointer-events-none' : ''} ${bought ? 'border-[#e5e5e5] dark:border-[#1e1e1e] hover:border-[#c8c8c8] dark:hover:border-[#2e2e2e]' : 'border-[#ececec] dark:border-[#181818] hover:border-[#d8d8d8] dark:hover:border-[#232323]'}`}>

      {/* Thumbnail */}
      <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[#f5f5f5] dark:bg-[#111]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.text} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center select-none"
            style={{ background: `linear-gradient(135deg, hsl(${hue},30%,88%) 0%, hsl(${(hue + 40) % 360},25%,82%) 100%)` }}
          >
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: `hsl(${hue},25%,38%)` }}>
              {getInitials(item.text)}
            </span>
          </div>
        )}
        {item.priority && !bought && (
          <span className="absolute bottom-1 right-1 text-xs leading-none drop-shadow-sm">{PRIORITY_ICON[item.priority]}</span>
        )}
        {bought && (
          <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center shadow-sm">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0 flex flex-col gap-1.5">
        <p className={`text-sm font-medium leading-snug line-clamp-2 ${skipped ? 'text-[#bbb] dark:text-[#444]' : bought ? 'text-[#0a0a0a] dark:text-[#f0f0f0]' : 'text-[#999] dark:text-[#555]'}`}>
          {item.text}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {item.budget && (
            <span className={`text-[12px] font-semibold tabular-nums ${bought ? 'text-[#0a0a0a] dark:text-[#e0e0e0]' : 'text-[#bbb] dark:text-[#444]'}`}>
              ₹{Number(item.budget).toLocaleString('en-IN')}
            </span>
          )}
          {item.budget && item.timeline && <span className="text-[#ddd] dark:text-[#2a2a2a]">·</span>}
          {item.timeline && <span className="text-[11px] text-[#aaa] dark:text-[#555]">{item.timeline}</span>}
          {(item.budget || item.timeline) && <span className="text-[#ddd] dark:text-[#2a2a2a]">·</span>}
          <span className="text-[11px] text-[#bbb] dark:text-[#444]">{formatDate(item.createdAt)}</span>
        </div>

        {links.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {links.slice(0, 3).map((link, i) => (
              <span key={i} className="flex items-center gap-1 text-[11px] text-[#999] dark:text-[#555]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getFavicon(link.url)} alt="" className="h-3 w-3 rounded-sm opacity-60" />
                {link.label || getStoreLabel(link.url)}
              </span>
            ))}
            {links.length > 3 && (
              <span className="text-[11px] text-[#bbb] dark:text-[#444]">+{links.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="shrink-0 flex flex-col items-end gap-2 z-20">
        {bought && (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 whitespace-nowrap">
            <Check className="h-2.5 w-2.5" /> Got it
          </span>
        )}
        {skipped && (
          <span className="text-[10px] text-[#bbb] dark:text-[#444]">Skipped</span>
        )}

        {editable && (
          <div className="flex items-center gap-0.5 pointer-events-auto">
            {confirmingDelete ? (
              <>
                <button onClick={handleCancelDelete} className="text-[10px] px-1.5 py-0.5 rounded text-[#999] hover:text-[#555] dark:text-[#555] dark:hover:text-[#999] transition font-medium">
                  Cancel
                </button>
                <button onClick={handleConfirmDelete} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-medium transition hover:bg-red-600">
                  Delete
                </button>
              </>
            ) : (
              <button onClick={handleDeleteClick} className="p-1.5 rounded text-[#d8d8d8] dark:text-[#2a2a2a] hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronRight className="h-4 w-4 text-[#d0d0d0] dark:text-[#2a2a2a]" />
          </div>
        )}
      </div>

      {/* Full-card link — only when editable (own manifest) */}
      {editable && <Link href={`/manifest/${id}`} className="absolute inset-0 z-10" />}
    </div>
  );
}
