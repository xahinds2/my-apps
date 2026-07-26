'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import AuthButton from '@/components/AuthButton';
import { Plus, Trash2, ShoppingBag, ChevronRight, Check } from 'lucide-react';

interface ManifestLink {
	url: string;
	label?: string;
}

interface ManifestItem {
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

const STORAGE_KEY = 'quickshop_manifest_items_v1';

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

function getId(item: ManifestItem) { return item._id || item.id || ''; }

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

const PRIORITY_ICON: Record<string, string> = { must: '🔥', nice: '✨', maybe: '💭' };

function loadStorage(): ManifestItem[] {
	if (typeof window === 'undefined') return [];
	try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveStorage(data: ManifestItem[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function nameToHue(name: string): number {
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
	return Math.abs(hash) % 360;
}

function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}

function isLocalManifestItem(item: ManifestItem): boolean {
	return getId(item).startsWith('local-');
}

function ManifestCard({ item, onDelete }: {
	item: ManifestItem;
	onDelete: () => void;
}) {
	const [deleting, setDeleting] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const id = getId(item);
	const links = item.links || [];

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

	const bought = item.status === 'bought';
	const skipped = item.status === 'skipped';

	return (
		<div className={`group relative flex items-center gap-4 p-3 rounded-xl border bg-white dark:bg-[#0d0d0d] transition-all duration-150 ${deleting ? 'opacity-30 pointer-events-none' : ''} ${bought ? 'border-[#e5e5e5] dark:border-[#1e1e1e] hover:border-[#c8c8c8] dark:hover:border-[#2e2e2e]' : 'border-[#ececec] dark:border-[#181818] hover:border-[#d8d8d8] dark:hover:border-[#232323]'}`}>

			{/* Thumbnail */}
			<div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[#f5f5f5] dark:bg-[#111]">
				{item.image ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						src={item.image}
						alt={item.text}
						className="w-full h-full object-cover"
					/>
				) : (() => {
					const hue = nameToHue(item.text);
					return (
						<div
							className="w-full h-full flex items-center justify-center select-none"
							style={{ background: `linear-gradient(135deg, hsl(${hue},30%,88%) 0%, hsl(${(hue + 40) % 360},25%,82%) 100%)` }}
						>
							<span
								className="text-[15px] font-semibold tracking-tight"
								style={{ color: `hsl(${hue},25%,38%)` }}
							>
								{getInitials(item.text)}
							</span>
						</div>
					);
				})()}
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
			</div>

			{/* Full-card link */}
			<Link href={`/manifest/${id}`} className="absolute inset-0 z-10" />
		</div>
	);
}

function ManifestPage({ isSignedIn }: { isSignedIn: boolean }) {
	const [items, setItems] = useState<ManifestItem[]>([]);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [adding, setAdding] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const [phIdx, setPhIdx] = useState(0);
	const [phVisible, setPhVisible] = useState(true);
	const [inputFocused, setInputFocused] = useState(false);
	const syncAttemptedRef = useRef(false);

	useEffect(() => {
		const timer = setInterval(() => {
			setPhVisible(false);
			setTimeout(() => { setPhIdx(i => (i + 1) % PLACEHOLDERS.length); setPhVisible(true); }, 350);
		}, 2500);
		return () => clearInterval(timer);
	}, []);

	const syncLocalWishesToCloud = useCallback(async () => {
		const localItems = loadStorage().filter(isLocalManifestItem);

		if (!isSignedIn || syncAttemptedRef.current || localItems.length === 0) {
			return;
		}

		syncAttemptedRef.current = true;

		try {
			const responses = await Promise.all(
				localItems.map(async item => {
					const res = await fetch('/api/manifest', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							text: item.text,
							links: item.links || [],
							image: item.image,
							budget: item.budget,
							timeline: item.timeline,
							status: item.status,
							priority: item.priority,
							note: item.note,
						}),
					});

					if (!res.ok) {
						throw new Error(`Failed to sync local item: ${item.text}`);
					}

					return res.json();
				})
			);

			if (responses.every(response => response?.data)) {
				saveStorage(loadStorage().filter(item => !isLocalManifestItem(item)));
			}
		} catch (error) {
			syncAttemptedRef.current = false;
			console.error('Failed to sync local Manifest items after sign-in:', error);
		}
	}, [isSignedIn]);

	const fetchWishes = useCallback(async () => {
		setIsLoading(true);
		try {
			if (!isSignedIn) { setItems(loadStorage()); return; }
			await syncLocalWishesToCloud();
			const res = await fetch('/api/manifest');
			const json = await res.json();
			setItems(json.data || []);
		} catch { setItems(loadStorage()); }
		finally { setIsLoading(false); }
	}, [isSignedIn, syncLocalWishesToCloud]);

	useEffect(() => { fetchWishes(); }, [fetchWishes]);

	const addWish = async (e: React.FormEvent) => {
		e.preventDefault();
		const text = input.trim();
		if (!text || adding) return;
		setAdding(true);
		setInput('');
		try {
			if (!isSignedIn) {
				const item: ManifestItem = { id: `local-${Date.now()}`, text, links: [], createdAt: new Date().toISOString() };
				const updated = [item, ...items];
				setItems(updated);
				saveStorage(updated);
				return;
			}
			const res = await fetch('/api/manifest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text }),
			});
			const json = await res.json();
			if (json.data) setItems(prev => [json.data, ...prev]);
		} finally { setAdding(false); inputRef.current?.focus(); }
	};

	const deleteItem = useCallback(async (item: ManifestItem) => {
		const id = getId(item);
		setItems(prev => {
			const next = prev.filter(existingItem => getId(existingItem) !== id);
			if (!isSignedIn) saveStorage(next);
			return next;
		});
		if (isSignedIn && !id.startsWith('local-')) {
			await fetch(`/api/manifest/${id}`, { method: 'DELETE' });
		}
	}, [isSignedIn]);

	return (
		<div className="min-h-screen flex flex-col">
			<header className="sticky top-0 z-40 w-full border-b border-[#e0e0e0] dark:border-[#222] bg-white/90 dark:bg-black/90 backdrop-blur-md">
				<div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
					<Link href="/manifest" className="flex items-center gap-2 hover:opacity-70 transition">
						<ShoppingBag className="h-4 w-4 text-violet-400" />
						<span className="text-sm font-semibold">Manifest</span>
					</Link>
					<AuthButton />
				</div>
			</header>

			<main className="flex-grow max-w-4xl mx-auto w-full px-6 py-10 space-y-8">
				<div>
					<h1 className="text-xl font-bold tracking-tight">Manifest</h1>
					<p className="text-xs text-[#666] dark:text-[#555] mt-1">
						Keep the things you want in one place. Paste store links and jump back when you&apos;re ready.
					</p>
				</div>

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

				{isLoading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{[1, 2, 3].map(i => (
							<div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-[#e5e5e5] dark:border-[#1e1e1e] animate-pulse">
								<div className="shrink-0 w-20 h-20 rounded-lg bg-[#f0f0f0] dark:bg-[#111]" />
								<div className="flex-grow space-y-2.5">
									<div className="h-3.5 rounded bg-[#f0f0f0] dark:bg-[#111] w-3/5" />
									<div className="h-3 rounded bg-[#f0f0f0] dark:bg-[#111] w-1/4" />
									<div className="h-3 rounded bg-[#f0f0f0] dark:bg-[#111] w-2/5" />
								</div>
							</div>
						))}
					</div>
				) : items.length === 0 ? (
					<div className="py-32 flex flex-col items-center gap-3 text-center">
						<ShoppingBag className="h-8 w-8 text-[#ccc] dark:text-[#333]" />
						<p className="text-[#666] dark:text-[#555] text-sm">No entries yet</p>
						<p className="text-[#999] dark:text-[#444] text-xs">Type anything above and press Add.</p>
					</div>
				) : (() => {
					const byNew = (a: ManifestItem, b: ManifestItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
					const pending = items.filter(i => i.status !== 'bought').sort(byNew);
					const done = items.filter(i => i.status === 'bought').sort(byNew);
					return (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
							{/* Left — manifest (pending/skipped) */}
							<div className="flex flex-col gap-2">
								<p className="text-[11px] font-medium text-[#aaa] dark:text-[#555] uppercase tracking-wider px-1">Manifest · {pending.length}</p>
								{pending.length === 0 ? (
									<p className="text-[12px] text-[#ccc] dark:text-[#333] px-1">Nothing pending</p>
								) : pending.map(item => (
									<ManifestCard key={getId(item)} item={item} onDelete={() => deleteItem(item)} />
								))}
							</div>
							{/* Right — done */}
							<div className="flex flex-col gap-2">
								<p className="text-[11px] font-medium text-[#aaa] dark:text-[#555] uppercase tracking-wider px-1">Done · {done.length}</p>
								{done.length === 0 ? (
									<p className="text-[12px] text-[#ccc] dark:text-[#333] px-1">Nothing yet</p>
								) : done.map(item => (
									<ManifestCard key={getId(item)} item={item} onDelete={() => deleteItem(item)} />
								))}
							</div>
						</div>
					);
				})()}

				{items.length > 0 && (
					<p className="text-center text-[11px] text-[#bbb] dark:text-[#333]">
						{items.length} {items.length === 1 ? 'item' : 'items'}
						{!isSignedIn && ' · saved locally'}
					</p>
				)}
			</main>
		</div>
	);
}

function AuthManifestPage() {
	const { isSignedIn, isLoaded } = useAuth();
	if (!isLoaded) return (
		<div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
			<div className="w-5 h-5 rounded-full border-2 border-[#0a0a0a] dark:border-white border-t-transparent animate-spin" />
		</div>
	);
	return <ManifestPage isSignedIn={!!isSignedIn} />;
}

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function ManifestRoute() {
	if (!hasClerk) return <ManifestPage isSignedIn={false} />;
	return <AuthManifestPage />;
}