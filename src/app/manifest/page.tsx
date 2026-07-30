'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import AuthButton from '@/components/AuthButton';
import { Plus, ShoppingBag, Share2, Globe, Users } from 'lucide-react';
import ManifestCard, { type ManifestItem, getId } from '@/components/ManifestCard';

interface AppShareRecord {
	_id: string;
	owner: string;
	appname: string;
	public: boolean;
	viewableUsers: string[];
}

interface ShareableUser {
	id: string;
	name: string;
	email?: string;
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



function loadStorage(): ManifestItem[] {
	if (typeof window === 'undefined') return [];
	try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveStorage(data: ManifestItem[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function isLocalManifestItem(item: ManifestItem): boolean {
	return getId(item).startsWith('local-');
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
	const [shareOpen, setShareOpen] = useState(false);
	const [shareLoading, setShareLoading] = useState(false);
	const [shareSaving, setShareSaving] = useState(false);
	const [shareError, setShareError] = useState('');
	const [shareSuccess, setShareSuccess] = useState('');
	const [isPublic, setIsPublic] = useState(false);
	const [shareUsers, setShareUsers] = useState<ShareableUser[]>([]);
	const [shareUsersLoading, setShareUsersLoading] = useState(false);
	const [shareUsersError, setShareUsersError] = useState('');
	const [selectedShareUserIds, setSelectedShareUserIds] = useState<string[]>([]);
	const [userSearch, setUserSearch] = useState('');
	const [userSearchOpen, setUserSearchOpen] = useState(false);
	const [existingShare, setExistingShare] = useState<AppShareRecord | null>(null);
	const [revokeConfirming, setRevokeConfirming] = useState(false);

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

	const hydrateShareUi = useCallback((share: AppShareRecord | null) => {
		setExistingShare(share);
		if (!share) {
			setIsPublic(false);
			setSelectedShareUserIds([]);
			return;
		}
		setIsPublic(share.public);
		setSelectedShareUserIds(Array.isArray(share.viewableUsers) ? share.viewableUsers : []);
	}, []);

	const loadShareUsers = useCallback(async () => {
		if (!isSignedIn) return;
		setShareUsersLoading(true);
		setShareUsersError('');
		try {
			const res = await fetch('/api/shares/users');
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Unable to load users');
			setShareUsers(Array.isArray(json?.data) ? json.data : []);
		} catch (error) {
			setShareUsersError(error instanceof Error ? error.message : 'Unable to load users');
		} finally {
			setShareUsersLoading(false);
		}
	}, [isSignedIn]);

	const loadManifestShare = useCallback(async () => {
		if (!isSignedIn) return;
		setShareLoading(true);
		setShareError('');
		try {
			const res = await fetch('/api/share?appname=manifest');
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Unable to load share settings');
			hydrateShareUi((json?.data as AppShareRecord) ?? null);
		} catch (error) {
			setShareError(error instanceof Error ? error.message : 'Unable to load share settings');
		} finally {
			setShareLoading(false);
		}
	}, [hydrateShareUi, isSignedIn]);

	useEffect(() => {
		if (shareOpen && isSignedIn) {
			loadManifestShare();
			loadShareUsers();
		}
	}, [shareOpen, isSignedIn, loadManifestShare, loadShareUsers]);

	const toggleShareUser = useCallback((id: string) => {
		setSelectedShareUserIds(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]));
	}, []);

	const saveManifestShare = useCallback(async () => {
		if (!isSignedIn) {
			setShareError('Sign in required to share your Manifest.');
			return;
		}

		setShareSaving(true);
		setShareError('');
		setShareSuccess('');

		try {
			const res = await fetch('/api/share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ appname: 'manifest', public: isPublic, viewableUsers: selectedShareUserIds }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Unable to save share settings');
			setExistingShare((json?.data as AppShareRecord) ?? null);
			setShareSuccess('Share settings saved.');
		} catch (error) {
			setShareError(error instanceof Error ? error.message : 'Unable to save share settings');
		} finally {
			setShareSaving(false);
		}
	}, [isPublic, isSignedIn, selectedShareUserIds]);

	const clearManifestShare = useCallback(async () => {
		setShareSaving(true);
		setShareError('');
		setShareSuccess('');
		try {
			const res = await fetch('/api/share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ appname: 'manifest', public: false, viewableUsers: [] }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Unable to clear share');
			hydrateShareUi(null);
			setShareSuccess('Sharing cleared.');
		} catch (error) {
			setShareError(error instanceof Error ? error.message : 'Unable to clear share');
		} finally {
			setShareSaving(false);
		}
	}, [hydrateShareUi]);

	const selectedShareUsers = selectedShareUserIds
		.map(id => shareUsers.find(user => user.id === id))
		.filter((user): user is ShareableUser => Boolean(user));

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
				<div className="flex items-start justify-between gap-3">
					<div>
						<h1 className="text-xl font-bold tracking-tight">Manifest</h1>
						<p className="text-xs text-[#666] dark:text-[#555] mt-1">
							Keep the things you want in one place. Paste store links and jump back when you&apos;re ready.
						</p>
					</div>
					<div className="shrink-0 flex items-center gap-2">
						<Link href="/manifest/shared" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#d8d8d8] dark:border-[#2a2a2a] text-xs font-medium text-[#333] dark:text-[#ddd] hover:border-[#b8b8b8] dark:hover:border-[#444] transition">
							Shared With Me
						</Link>
						<button
							type="button"
							onClick={() => {
								setShareOpen(true);
								setShareError('');
								setShareSuccess('');
								setUserSearch('');
								setUserSearchOpen(false);
							}}
							disabled={!isSignedIn}
							className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#d8d8d8] dark:border-[#2a2a2a] text-xs font-medium text-[#333] dark:text-[#ddd] hover:border-[#b8b8b8] dark:hover:border-[#444] disabled:opacity-40 disabled:cursor-not-allowed transition"
						>
							<Share2 className="h-3.5 w-3.5" />
							Share Manifest
						</button>
					</div>
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

				{shareOpen && (
					<div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => { setShareOpen(false); setRevokeConfirming(false); }}>
						<div className="w-full max-w-lg rounded-2xl border border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] shadow-xl p-5" onClick={e => e.stopPropagation()}>
							<div className="flex items-start justify-between gap-3">
								<div>
									<h2 className="text-sm font-semibold text-[#0a0a0a] dark:text-white">Share Entire Manifest</h2>
									<p className="mt-1 text-xs text-[#777] dark:text-[#555]">One share setting for your full Manifest list.</p>
								</div>
								<button onClick={() => { setShareOpen(false); setRevokeConfirming(false); }} className="text-xs text-[#999] dark:text-[#555] hover:text-[#555] dark:hover:text-[#bbb] transition">Close</button>
							</div>

							{!isSignedIn && (
								<p className="mt-4 text-xs text-amber-600 dark:text-amber-400">Sign in to enable sharing.</p>
							)}

							{isSignedIn && (
							<div className="mt-4 space-y-4">
								{shareLoading ? (
									<p className="text-xs text-[#888] dark:text-[#555]">Loading current share settings...</p>
								) : (
									<>
										{/* Public toggle */}
										<button
											type="button"
											onClick={() => setIsPublic(v => !v)}
											className={`w-full px-3 py-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-2 transition ${isPublic ? 'border-[#0a0a0a] dark:border-white text-[#0a0a0a] dark:text-white bg-[#f5f5f5] dark:bg-[#1a1a1a]' : 'border-[#ddd] dark:border-[#2a2a2a] text-[#777] dark:text-[#555]'}`}
										>
											<Globe className="h-3.5 w-3.5" />
											<span>{isPublic ? 'Public — anyone can see your manifest' : 'Public sharing is off'}</span>
										</button>

										{/* Specific users */}
										<div className="relative">
											<label className="flex items-center gap-1.5 text-[11px] font-medium text-[#666] dark:text-[#555] mb-1.5">
												<Users className="h-3 w-3" /> Share with specific users
											</label>
											<input
												type="text"
												placeholder="Click to search users..."
												value={userSearch}
												onChange={e => setUserSearch(e.target.value)}
												onFocus={() => setUserSearchOpen(true)}
												onBlur={() => setTimeout(() => setUserSearchOpen(false), 150)}
												className="w-full px-2.5 py-1.5 rounded-lg border border-[#dcdcdc] dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-xs placeholder:text-[#aaa] dark:placeholder:text-[#555] focus:outline-none focus:border-[#aaa] dark:focus:border-[#555] transition"
											/>
											{userSearchOpen && (
												<div className="absolute z-10 mt-1 w-full rounded-lg border border-[#dcdcdc] dark:border-[#2a2a2a] bg-white dark:bg-[#111] shadow-lg p-2 max-h-44 overflow-auto space-y-1">
													{shareUsersLoading ? (
														<p className="text-[11px] text-[#888] dark:text-[#555] px-1 py-1">Loading users...</p>
													) : shareUsers.length === 0 ? (
														<p className="text-[11px] text-[#888] dark:text-[#555] px-1 py-1">No users available.</p>
													) : (() => {
														const q = userSearch.trim().toLowerCase();
														const filtered = shareUsers
															.filter(u => !selectedShareUserIds.includes(u.id))
															.filter(u => !q || u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q));
														if (filtered.length === 0) {
															return <p className="text-[11px] text-[#888] dark:text-[#555] px-1 py-1">No users match.</p>;
														}
														return filtered.map(user => {
															return (
																<button
																	type="button"
																	key={user.id}
																	onClick={() => { toggleShareUser(user.id); setUserSearch(''); }}
																	className="w-full text-left px-2 py-1.5 rounded-md border border-transparent hover:border-[#e0e0e0] dark:hover:border-[#2a2a2a] transition"
																>
																	<p className="text-xs font-medium text-[#222] dark:text-[#e5e5e5] truncate">{user.name}</p>
																	{user.email && <p className="text-[10px] text-[#999] dark:text-[#555] truncate">{user.email}</p>}
																</button>
															);
														});
													})()}
												</div>
											)}
											{shareUsersError && <p className="mt-1 text-[11px] text-red-500">{shareUsersError}</p>}
											{selectedShareUsers.length > 0 && (
												<div className="mt-2 flex flex-wrap gap-1">
													{selectedShareUsers.map(u => (
														<span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#ddd] dark:border-[#2a2a2a] text-[11px] text-[#333] dark:text-[#ccc]">
															{u.name}
															<button type="button" onClick={() => toggleShareUser(u.id)} className="text-[#aaa] hover:text-[#555] dark:hover:text-[#ccc] leading-none">&times;</button>
														</span>
													))}
												</div>
											)}
										</div>

										{shareError && <p className="text-xs text-red-500">{shareError}</p>}
										{shareSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400">{shareSuccess}</p>}

										<div className="flex items-center justify-between gap-2 pt-1">
										{revokeConfirming ? (
											<div className="flex items-center gap-2">
												<span className="text-xs text-[#555] dark:text-[#aaa]">Remove all sharing?</span>
												<button
													type="button"
													onClick={() => setRevokeConfirming(false)}
													disabled={shareSaving}
													className="px-2.5 py-1.5 rounded-lg border border-[#ddd] dark:border-[#2a2a2a] text-xs text-[#555] dark:text-[#aaa] disabled:opacity-40"
												>
													No
												</button>
												<button
													type="button"
													onClick={() => { setRevokeConfirming(false); clearManifestShare(); }}
													disabled={shareSaving}
													className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium disabled:opacity-40"
												>
													Yes, revoke
												</button>
											</div>
										) : (
											<button
												type="button"
												onClick={() => setRevokeConfirming(true)}
												disabled={(!existingShare && !isPublic && selectedShareUserIds.length === 0) || shareSaving}
												className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs disabled:opacity-40"
											>
												Revoke
											</button>
										)}
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => { setShareOpen(false); setRevokeConfirming(false); }}
												disabled={shareSaving}
												className="px-3 py-2 rounded-lg border border-[#ddd] dark:border-[#2a2a2a] text-xs text-[#555] dark:text-[#aaa] disabled:opacity-40"
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={saveManifestShare}
												disabled={shareSaving}
												className="px-3 py-2 rounded-lg bg-[#0a0a0a] dark:bg-white text-white dark:text-black text-xs font-semibold disabled:opacity-40"
											>
												{shareSaving ? 'Saving...' : 'Save'}
											</button>
										</div>
										</div>
									</>
								)}
							</div>
						)}
						</div>
					</div>
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