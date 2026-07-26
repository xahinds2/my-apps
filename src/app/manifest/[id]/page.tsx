'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import AuthButton from '@/components/AuthButton';
import { ArrowLeft, ShoppingBag, Plus, X, Check, Pencil, Trash2, ExternalLink, Link2, Package, ImageIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

interface ManifestLink { url: string; label?: string; }
interface ManifestItem {
	_id?: string; id?: string;
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

const KNOWN_STORES: Record<string, string> = {
	'amazon.in': 'Amazon', 'amazon.com': 'Amazon',
	'flipkart.com': 'Flipkart', 'myntra.com': 'Myntra',
	'nykaa.com': 'Nykaa', 'croma.com': 'Croma',
	'meesho.com': 'Meesho', 'ajio.com': 'Ajio',
	'snapdeal.com': 'Snapdeal', 'tatacliq.com': 'Tata CLiQ',
	'reliancedigital.in': 'Reliance Digital', 'jiomart.com': 'JioMart',
};

const STORE_SEARCH = [
	{ name: 'Amazon', domain: 'amazon.in', search: (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
	{ name: 'Flipkart', domain: 'flipkart.com', search: (q: string) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
	{ name: 'Myntra', domain: 'myntra.com', search: (q: string) => `https://www.myntra.com/search?rawQuery=${encodeURIComponent(q)}` },
	{ name: 'Ajio', domain: 'ajio.com', search: (q: string) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}` },
	{ name: 'Nykaa', domain: 'nykaa.com', search: (q: string) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}` },
	{ name: 'Shein', domain: 'shein.com', search: (q: string) => `https://www.shein.com/search?src=search&q=${encodeURIComponent(q)}` },
	{ name: 'Newme', domain: 'newme.asia', search: (q: string) => `https://www.newme.asia/search?q=${encodeURIComponent(q)}` },
	{ name: 'Souled Store', domain: 'thesouledstore.com', search: (q: string) => `https://www.thesouledstore.com/search?q=${encodeURIComponent(q)}` },
	{ name: 'Bewakoof', domain: 'bewakoof.com', search: (q: string) => `https://www.bewakoof.com/search/${encodeURIComponent(q)}` },
	{ name: 'Snitch', domain: 'snitch.co.in', search: (q: string) => `https://snitch.co.in/search?q=${encodeURIComponent(q)}` },
	{ name: 'Zara', domain: 'zara.com', search: (q: string) => `https://www.zara.com/in/en/search?q=${encodeURIComponent(q)}` },
	{ name: 'H&M', domain: 'hm.com', search: (q: string) => `https://www2.hm.com/en_in/search-results.html?q=${encodeURIComponent(q)}` },
	{ name: 'Croma', domain: 'croma.com', search: (q: string) => `https://www.croma.com/searchB?q=${encodeURIComponent(q)}` },
	{ name: 'Tata CLiQ', domain: 'tatacliq.com', search: (q: string) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}` },
];

const TIMELINE_OPTIONS = ['This week', 'This month', '3 months', '6 months', 'This year', '2+ years'];

const PRIORITY_OPTIONS: { value: 'must' | 'nice' | 'maybe'; icon: string; label: string; active: string; inactive: string }[] = [
	{ value: 'must', icon: '🔥', label: 'Must have', active: 'bg-red-50 border-red-300 text-red-700 dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-400', inactive: 'bg-white dark:bg-[#111] border-[#e0e0e0] dark:border-[#2a2a2a] text-[#666] dark:text-[#555]' },
	{ value: 'nice', icon: '✨', label: 'Nice to have', active: 'bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-500/15 dark:border-violet-500/40 dark:text-violet-400', inactive: 'bg-white dark:bg-[#111] border-[#e0e0e0] dark:border-[#2a2a2a] text-[#666] dark:text-[#555]' },
	{ value: 'maybe', icon: '💭', label: 'Maybe someday', active: 'bg-[#f5f5f5] border-[#999] text-[#333] dark:bg-[#1a1a1a] dark:border-[#555] dark:text-[#ccc]', inactive: 'bg-white dark:bg-[#111] border-[#e0e0e0] dark:border-[#2a2a2a] text-[#666] dark:text-[#555]' },
];

function getId(item: ManifestItem) { return item._id || item.id || ''; }

function getStoreLabel(url: string): string {
	try { const h = new URL(url).hostname.replace(/^www\./, ''); return KNOWN_STORES[h] || h; }
	catch { return 'Link'; }
}

function getFavicon(url: string): string {
	try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
	catch { return ''; }
}

function isValidUrl(url: string): boolean {
	try { const p = new URL(url); return p.protocol === 'http:' || p.protocol === 'https:'; }
	catch { return false; }
}

function loadStorage(): ManifestItem[] {
	if (typeof window === 'undefined') return [];
	try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveStorage(data: ManifestItem[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function ManifestDetailPage({ manifestItemId, isSignedIn }: { manifestItemId: string; isSignedIn: boolean }) {
	const router = useRouter();
	const [item, setItem] = useState<ManifestItem | null>(null);
	const [loading, setLoading] = useState(true);
	const [isEditingName, setIsEditingName] = useState(false);
	const [editName, setEditName] = useState('');
	const nameRef = useRef<HTMLInputElement>(null);
	const [isAddingLink, setIsAddingLink] = useState(false);
	const [linkInput, setLinkInput] = useState('');
	const [savingLink, setSavingLink] = useState(false);
	const linkRef = useRef<HTMLInputElement>(null);

	const [isEditingImage, setIsEditingImage] = useState(false);
	const [imageInput, setImageInput] = useState('');
	const imageRef = useRef<HTMLInputElement>(null);
	const [isEditingBudget, setIsEditingBudget] = useState(false);
	const [budgetInput, setBudgetInput] = useState('');
	const budgetRef = useRef<HTMLInputElement>(null);
	const [isEditingNote, setIsEditingNote] = useState(false);
	const [noteInput, setNoteInput] = useState('');
	const noteRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => { if (isEditingName) nameRef.current?.focus(); }, [isEditingName]);
	useEffect(() => { if (isAddingLink) linkRef.current?.focus(); }, [isAddingLink]);
	useEffect(() => { if (isEditingImage) imageRef.current?.focus(); }, [isEditingImage]);
	useEffect(() => { if (isEditingBudget) budgetRef.current?.focus(); }, [isEditingBudget]);
	useEffect(() => { if (isEditingNote) noteRef.current?.focus(); }, [isEditingNote]);

	const fetchWish = useCallback(async () => {
		setLoading(true);
		try {
			if (!isSignedIn || manifestItemId.startsWith('local-')) {
				const all = loadStorage();
				setItem(all.find(existingItem => getId(existingItem) === manifestItemId) || null);
				return;
			}
			const res = await fetch(`/api/manifest/${manifestItemId}`);
			const json = await res.json();
			setItem(json.data || null);
		} catch {
			setItem(loadStorage().find(existingItem => getId(existingItem) === manifestItemId) || null);
		} finally { setLoading(false); }
	}, [manifestItemId, isSignedIn]);

	useEffect(() => { fetchWish(); }, [fetchWish]);

	const patchField = useCallback(async (fields: Partial<ManifestItem>) => {
		if (!item) return;
		const updated = { ...item, ...fields };
		setItem(updated);
		if (!isSignedIn || manifestItemId.startsWith('local-')) {
			saveStorage(loadStorage().map(existingItem => getId(existingItem) === manifestItemId ? updated : existingItem));
			return;
		}
		const res = await fetch(`/api/manifest/${manifestItemId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(fields),
		});
		const json = await res.json();
		if (json.data) setItem(json.data);
	}, [item, manifestItemId, isSignedIn]);

	const saveName = () => {
		const text = editName.trim();
		if (text && text !== item?.text) patchField({ text });
		setIsEditingName(false);
	};

	const saveImage = () => {
		const url = imageInput.trim();
		patchField({ image: isValidUrl(url) ? url : undefined });
		setIsEditingImage(false);
		setImageInput('');
	};

	const saveBudget = () => {
		patchField({ budget: budgetInput.trim() || undefined });
		setIsEditingBudget(false);
	};

	const saveNote = () => {
		patchField({ note: noteInput.trim() || undefined });
		setIsEditingNote(false);
	};

	const addLink = async () => {
		const url = linkInput.trim();
		if (!item || !isValidUrl(url)) return;
		setSavingLink(true);
		const newLinks = [...(item.links || []), { url, label: getStoreLabel(url) }];
		setLinkInput('');
		setIsAddingLink(false);
		await patchField({ links: newLinks });
		setSavingLink(false);
	};

	const removeLink = (idx: number) => {
		if (!item) return;
		patchField({ links: item.links.filter((_, i) => i !== idx) });
	};

	const [confirmDelete, setConfirmDelete] = useState(false);

	const deleteItem = async () => {
		if (!item) return;
		if (!isSignedIn || manifestItemId.startsWith('local-')) {
			saveStorage(loadStorage().filter(existingItem => getId(existingItem) !== manifestItemId));
		} else {
			await fetch(`/api/manifest/${manifestItemId}`, { method: 'DELETE' });
		}
		router.push('/manifest');
	};

	if (loading) return (
		<div className="min-h-screen flex flex-col">
			<header className="sticky top-0 z-40 w-full border-b border-[#e0e0e0] dark:border-[#222] bg-white/90 dark:bg-black/90 backdrop-blur-md">
				<div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
					<Link href="/manifest" className="flex items-center gap-2 text-sm text-[#999] hover:text-[#0a0a0a] dark:hover:text-white transition"><ArrowLeft className="h-4 w-4" /> Manifest</Link>
					<AuthButton />
				</div>
			</header>
			<main className="max-w-4xl mx-auto w-full px-6 py-10 space-y-4">
				<div className="h-7 w-48 rounded-lg bg-[#f0f0f0] dark:bg-[#111] animate-pulse" />
				{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-[#f0f0f0] dark:bg-[#111] animate-pulse" />)}
			</main>
		</div>
	);

	if (!item) return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4">
			<Package className="h-10 w-10 text-[#ccc] dark:text-[#333]" />
			<p className="text-[#666] dark:text-[#555] text-sm">Manifest item not found</p>
			<Link href="/manifest" className="text-xs text-[#999] hover:text-[#0a0a0a] dark:hover:text-white transition flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to Manifest</Link>
		</div>
	);

	const isBought = item.status === 'bought';

	return (
		<div className="min-h-screen flex flex-col">
			<header className="sticky top-0 z-40 w-full border-b border-[#e0e0e0] dark:border-[#222] bg-white/90 dark:bg-black/90 backdrop-blur-md">
				<div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
					<Link href="/manifest" className="flex items-center gap-2 text-sm text-[#999] hover:text-[#0a0a0a] dark:hover:text-white transition">
						<ArrowLeft className="h-4 w-4" /> Manifest
					</Link>
					<div className="flex items-center gap-3">
						<Link href="/manifest" className="hover:opacity-70 transition"><ShoppingBag className="h-4 w-4 text-violet-400" /></Link>
						<AuthButton />
					</div>
				</div>
			</header>

			<main className="flex-grow max-w-4xl mx-auto w-full px-6 py-8 space-y-8">
				<div
					className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#f5f5f5] dark:bg-[#111] border border-[#e5e5e5] dark:border-[#1e1e1e] flex items-center justify-center cursor-pointer group"
					onClick={() => { setImageInput(item.image || ''); setIsEditingImage(true); }}
				>
					{item.image ? (
						<>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={item.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
							<div className="absolute inset-0 bg-black/20" />
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={item.image} alt={item.text} className="relative z-10 w-full h-full object-contain drop-shadow-xl" />
						</>
					) : (
						<div className="flex flex-col items-center gap-2 text-[#ccc] dark:text-[#333]">
							<ImageIcon className="h-8 w-8" />
							<span className="text-xs">Add image</span>
						</div>
					)}
					<div className="absolute inset-0 z-30 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
						<span className="opacity-0 group-hover:opacity-100 transition text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full">
							{item.image ? 'Change image' : 'Add image URL'}
						</span>
					</div>
					{item.priority && (
						<span className="absolute top-3 left-3 z-30 text-xl leading-none drop-shadow">
							{PRIORITY_OPTIONS.find(p => p.value === item.priority)?.icon}
						</span>
					)}
					{isBought && (
						<span className="absolute top-3 right-3 z-30 flex items-center gap-1 text-[11px] font-semibold pl-2 pr-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-emerald-400 border border-emerald-400/30">
							<Check className="h-3.5 w-3.5" /> Got it
						</span>
					)}
				</div>

				{isEditingImage && (
					<div className="flex items-center gap-2 -mt-4">
						<input
							ref={imageRef}
							value={imageInput}
							onChange={e => setImageInput(e.target.value)}
							onKeyDown={e => { if (e.key === 'Enter') saveImage(); if (e.key === 'Escape') setIsEditingImage(false); }}
							placeholder="Paste image URL from Google Images, Amazon, etc."
							className="flex-grow text-sm px-4 py-2.5 rounded-lg bg-[#f5f5f5] border border-[#d4d4d4] text-[#0a0a0a] dark:bg-[#111] dark:border-[#333] dark:text-white placeholder-[#bbb] dark:placeholder-[#444] focus:outline-none focus:border-[#999] dark:focus:border-[#555] transition"
						/>
						<button onClick={saveImage} className="p-2.5 bg-[#0a0a0a] dark:bg-white text-white dark:text-black rounded-lg transition hover:bg-[#333] dark:hover:bg-[#e0e0e0]"><Check className="h-4 w-4" /></button>
						<button onClick={() => setIsEditingImage(false)} className="p-2.5 text-[#999] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition"><X className="h-4 w-4" /></button>
						{item.image && (
							<button onClick={() => { patchField({ image: undefined }); setIsEditingImage(false); }} className="p-2.5 text-[#999] hover:text-red-500 rounded-lg transition" title="Remove image">
								<Trash2 className="h-4 w-4" />
							</button>
						)}
					</div>
				)}

				<div className="flex items-start justify-between gap-4">
					<div className="flex-grow min-w-0">
						{isEditingName ? (
							<div className="flex items-center gap-2">
								<input ref={nameRef} value={editName} onChange={e => setEditName(e.target.value)}
									onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setIsEditingName(false); }}
									className="flex-grow text-xl font-bold bg-transparent focus:outline-none border-b-2 border-black/20 dark:border-white/20 text-[#0a0a0a] dark:text-white pb-0.5"
								/>
								<button onClick={saveName} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition"><Check className="h-4 w-4" /></button>
								<button onClick={() => setIsEditingName(false)} className="p-1.5 text-[#999] hover:bg-black/5 rounded transition"><X className="h-4 w-4" /></button>
							</div>
						) : (
							<div className="flex items-center gap-2 group/name">
								<h1 className={`text-xl font-bold tracking-tight ${isBought ? 'text-[#777] dark:text-[#666]' : 'text-[#0a0a0a] dark:text-white'}`}>{item.text}</h1>
								{isBought && <Check className="h-5 w-5 text-emerald-500 shrink-0" />}
								<button onClick={() => { setEditName(item.text); setIsEditingName(true); }}
									className="p-1 text-[#ccc] dark:text-[#333] hover:text-[#0a0a0a] dark:hover:text-white rounded transition opacity-0 group-hover/name:opacity-100">
									<Pencil className="h-3.5 w-3.5" />
								</button>
							</div>
						)}
						<p className="text-xs text-[#999] dark:text-[#444] mt-1">
							{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
						</p>
					</div>
					<button onClick={() => setConfirmDelete(true)} className="p-2 text-[#ccc] dark:text-[#333] hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition shrink-0" title="Delete item">
						<Trash2 className="h-4 w-4" />
					</button>
				</div>

				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-widest text-[#999] dark:text-[#444]">How bad do you want it?</p>
					<div className="flex gap-2 flex-wrap">
						{PRIORITY_OPTIONS.map(opt => (
							<button
								key={opt.value}
								onClick={() => patchField({ priority: item.priority === opt.value ? undefined : opt.value })}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition ${item.priority === opt.value ? opt.active : opt.inactive + ' hover:border-[#999] dark:hover:border-[#555]'}`}
							>
								<span>{opt.icon}</span> {opt.label}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						onClick={() => patchField({ status: isBought ? 'pending' : 'bought' })}
						className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${isBought
							? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-400'
							: 'bg-white dark:bg-[#111] border-[#e0e0e0] dark:border-[#2a2a2a] text-[#666] dark:text-[#555] hover:border-[#999] dark:hover:border-[#555]'
						}`}
					>
						{isBought ? <><Check className="h-4 w-4" /> Got it!</> : 'Still pending'}
						<span className="text-[11px] font-normal opacity-60 ml-1">{isBought ? '→ mark pending' : '→ mark bought'}</span>
					</button>
					{item.status === 'pending' && (
						<button
							onClick={() => patchField({ status: 'skipped' })}
							className="text-xs text-[#bbb] dark:text-[#444] hover:text-[#0a0a0a] dark:hover:text-white transition"
						>
							skip it
						</button>
					)}
					{item.status === 'skipped' && (
						<button
							onClick={() => patchField({ status: 'pending' })}
							className="text-xs text-[#bbb] dark:text-[#444] hover:text-[#0a0a0a] dark:hover:text-white transition"
						>
							↩ restore
						</button>
					)}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<p className="text-xs font-semibold uppercase tracking-widest text-[#999] dark:text-[#444]">💰 Budget</p>
						{isEditingBudget ? (
							<div className="flex items-center gap-2">
								<span className="text-sm text-[#999]">₹</span>
								<input ref={budgetRef} value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
									onKeyDown={e => { if (e.key === 'Enter') saveBudget(); if (e.key === 'Escape') setIsEditingBudget(false); }}
									placeholder="5,000 – 8,000"
									className="flex-grow text-sm px-3 py-1.5 rounded-lg bg-[#f5f5f5] border border-[#d4d4d4] text-[#0a0a0a] dark:bg-[#111] dark:border-[#333] dark:text-white placeholder-[#bbb] focus:outline-none focus:border-[#999] dark:focus:border-[#555] transition"
								/>
								<button onClick={saveBudget} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition"><Check className="h-3.5 w-3.5" /></button>
							</div>
						) : (
							<button
								onClick={() => { setBudgetInput(item.budget || ''); setIsEditingBudget(true); }}
								className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-[#d4d4d4] dark:border-[#2a2a2a] text-sm text-[#0a0a0a] dark:text-white hover:border-[#999] dark:hover:border-[#555] transition"
							>
								{item.budget ? <span className="font-medium text-violet-600 dark:text-violet-400">₹ {item.budget}</span> : <span className="text-[#bbb] dark:text-[#444]">Set a budget...</span>}
							</button>
						)}
					</div>

					<div className="space-y-1.5">
						<p className="text-xs font-semibold uppercase tracking-widest text-[#999] dark:text-[#444]">📅 By when?</p>
						<div className="flex flex-wrap gap-1.5">
							{TIMELINE_OPTIONS.map(opt => (
								<button
									key={opt}
									onClick={() => patchField({ timeline: item.timeline === opt ? undefined : opt })}
									className={`text-xs px-2.5 py-1 rounded-full border transition ${item.timeline === opt
										? 'bg-[#0a0a0a] border-[#0a0a0a] text-white dark:bg-white dark:border-white dark:text-black'
										: 'bg-white dark:bg-[#111] border-[#e0e0e0] dark:border-[#2a2a2a] text-[#666] dark:text-[#555] hover:border-[#999] dark:hover:border-[#555]'
									}`}
								>
									{opt}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="space-y-1.5">
					<p className="text-xs font-semibold uppercase tracking-widest text-[#999] dark:text-[#444]">📝 Note</p>
					{isEditingNote ? (
						<div className="space-y-2">
							<textarea
								ref={noteRef}
								value={noteInput}
								onChange={e => setNoteInput(e.target.value)}
								onKeyDown={e => { if (e.key === 'Escape') setIsEditingNote(false); }}
								rows={3}
								placeholder="Anything personal — size, color, model, why you want it..."
								className="w-full text-sm px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#d4d4d4] text-[#0a0a0a] dark:bg-[#111] dark:border-[#333] dark:text-white placeholder-[#bbb] focus:outline-none focus:border-[#999] dark:focus:border-[#555] transition resize-none"
							/>
							<div className="flex gap-2">
								<button onClick={saveNote} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0a0a] text-white dark:bg-white dark:text-black text-xs font-semibold hover:bg-[#333] dark:hover:bg-[#e0e0e0] transition"><Check className="h-3 w-3" /> Save</button>
								<button onClick={() => setIsEditingNote(false)} className="px-3 py-1.5 rounded-lg text-xs text-[#999] hover:bg-black/5 dark:hover:bg-white/5 transition">Cancel</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => { setNoteInput(item.note || ''); setIsEditingNote(true); }}
							className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-[#d4d4d4] dark:border-[#2a2a2a] text-sm hover:border-[#999] dark:hover:border-[#555] transition"
						>
							{item.note
								? <span className="text-[#444] dark:text-[#aaa] whitespace-pre-wrap">{item.note}</span>
								: <span className="text-[#bbb] dark:text-[#444]">Add a note — size, colour, why you want it...</span>}
						</button>
					)}
				</div>

				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-widest text-[#999] dark:text-[#444]">Search on stores</p>
					<div className="flex flex-wrap gap-2">
						{STORE_SEARCH.map(store => (
							<a key={store.name} href={store.search(item.text)} target="_blank" rel="noopener noreferrer"
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e0e0e0] dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-xs text-[#555] dark:text-[#888] hover:border-[#0a0a0a] hover:text-[#0a0a0a] dark:hover:border-white dark:hover:text-white transition">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={`https://www.google.com/s2/favicons?domain=${store.domain}&sz=32`} alt="" className="h-3.5 w-3.5 rounded-sm" />
								{store.name}
							</a>
						))}
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-xs font-semibold uppercase tracking-widest text-[#999] dark:text-[#444]">Shortlisted links</p>
						{item.links.length > 0 && <span className="text-[11px] text-[#bbb] dark:text-[#333]">{item.links.length} {item.links.length === 1 ? 'link' : 'links'}</span>}
					</div>

					{isAddingLink ? (
						<div className="flex items-center gap-2">
							<input ref={linkRef} value={linkInput} onChange={e => setLinkInput(e.target.value)}
								onKeyDown={e => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') { setIsAddingLink(false); setLinkInput(''); } }}
								placeholder="Paste store URL..."
								className="flex-grow text-sm px-4 py-2.5 rounded-lg bg-[#f5f5f5] border border-[#d4d4d4] text-[#0a0a0a] dark:bg-[#111] dark:border-[#333] dark:text-white placeholder-[#bbb] focus:outline-none focus:border-[#999] dark:focus:border-[#555] transition"
							/>
							<button onClick={addLink} disabled={savingLink || !isValidUrl(linkInput.trim())}
								className="px-3 py-2.5 rounded-lg bg-[#0a0a0a] text-white dark:bg-white dark:text-black text-sm hover:bg-[#222] dark:hover:bg-[#e0e0e0] disabled:opacity-30 transition shrink-0">
								<Check className="h-4 w-4" />
							</button>
							<button onClick={() => { setIsAddingLink(false); setLinkInput(''); }} className="p-2.5 text-[#999] hover:bg-black/5 rounded-lg transition shrink-0">
								<X className="h-4 w-4" />
							</button>
						</div>
					) : (
						<button onClick={() => setIsAddingLink(true)}
							className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-[#d4d4d4] dark:border-[#2a2a2a] text-sm text-[#999] dark:text-[#444] hover:border-[#0a0a0a] hover:text-[#0a0a0a] dark:hover:border-white dark:hover:text-white transition">
							<Plus className="h-4 w-4" /> Add store link
						</button>
					)}

					{/* 2-column chips */}
					{item.links.length > 0 && (
						<div className="grid grid-cols-2 gap-2">
							{item.links.map((link, i) => {
								const hostname = (() => { try { return new URL(link.url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
								return (
									<div key={i} className="group flex items-center gap-2.5 p-3 rounded-xl bg-[#f8f8f8] dark:bg-[#0d0d0d] border border-[#e5e5e5] dark:border-[#1e1e1e] hover:border-[#c8c8c8] dark:hover:border-[#2e2e2e] transition">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img src={getFavicon(link.url)} alt="" className="h-6 w-6 rounded-md shrink-0" />
										<div className="flex-grow min-w-0">
											<p className="text-xs font-medium text-[#0a0a0a] dark:text-white truncate leading-tight">{link.label || getStoreLabel(link.url)}</p>
											<p className="text-[10px] text-[#bbb] dark:text-[#444] truncate">{hostname}</p>
										</div>
										<div className="shrink-0 flex items-center gap-0.5">
											<a href={link.url} target="_blank" rel="noopener noreferrer"
												className="p-1 rounded text-[#bbb] dark:text-[#333] hover:text-[#0a0a0a] dark:hover:text-white transition">
												<ExternalLink className="h-3 w-3" />
											</a>
											<button onClick={() => removeLink(i)}
												className="p-1 rounded text-[#ccc] dark:text-[#333] hover:text-red-400 transition opacity-0 group-hover:opacity-100">
												<X className="h-3 w-3" />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</main>

			{confirmDelete && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(false)}>
					<div className="bg-white dark:bg-[#111] border border-[#e0e0e0] dark:border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
						<h2 className="text-base font-semibold text-[#0a0a0a] dark:text-white">Delete item?</h2>
						<p className="mt-1 text-sm text-[#666] dark:text-[#555]">&ldquo;{item.text}&rdquo; will be permanently removed from Manifest.</p>
						<div className="flex gap-3 mt-5">
							<button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-[#e0e0e0] dark:border-[#2a2a2a] text-sm font-medium text-[#0a0a0a] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition">
								Cancel
							</button>
							<button onClick={deleteItem} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition">
								Delete
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function AuthManifestDetailPage({ manifestItemId }: { manifestItemId: string }) {
	const { isSignedIn, isLoaded } = useAuth();
	if (!isLoaded) return (
		<div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
			<div className="w-5 h-5 rounded-full border-2 border-[#0a0a0a] dark:border-white border-t-transparent animate-spin" />
		</div>
	);
	return <ManifestDetailPage manifestItemId={manifestItemId} isSignedIn={!!isSignedIn} />;
}

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function ManifestDetailRoute() {
	const params = useParams();
	const manifestItemId = params?.id as string;
	if (!manifestItemId) return null;
	if (!hasClerk) return <ManifestDetailPage manifestItemId={manifestItemId} isSignedIn={false} />;
	return <AuthManifestDetailPage manifestItemId={manifestItemId} />;
}