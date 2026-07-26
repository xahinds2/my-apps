'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import AuthButton from '@/components/AuthButton';
import ManifestCard, { type ManifestItem } from '@/components/ManifestCard';

interface IncomingShare {
  ownerUserId: string;
  items: ManifestItem[];
}

interface ShareableUser {
  id: string;
  name: string;
  email?: string;
}

function getOwnerLabel(ownerUserId: string, users: ShareableUser[]) {
  const match = users.find(user => user.id === ownerUserId);
  if (!match) return ownerUserId;
  return match.name || match.email || ownerUserId;
}

export default function SharedManifestPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState('');
  const [shares, setShares] = useState<IncomingShare[]>([]);
  const [users, setUsers] = useState<ShareableUser[]>([]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/shares/users');
      const json = await res.json();
      if (res.ok) {
        setUsers(Array.isArray(json?.data) ? json.data : []);
      }
    } catch {
      // Best effort for owner name mapping only.
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadIncomingShares = useCallback(async () => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({ appname: 'manifest' });
      const res = await fetch(`/api/shares/incoming?${query.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to load shared manifests');
      setShares(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load shared manifests');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      void loadIncomingShares();
      void loadUsers();
    }
  }, [isLoaded, loadIncomingShares, loadUsers]);

  const groupedShares = useMemo(() => {
    const groups: Record<string, IncomingShare[]> = {};
    for (const share of shares) {
      const key = share.ownerUserId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(share);
    }
    return groups;
  }, [shares]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-5 h-5 rounded-full border-2 border-[#0a0a0a] dark:border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-[#e0e0e0] dark:border-[#222] bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/manifest" className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-70 transition">
            <ArrowLeft className="h-4 w-4" />
            Manifest
          </Link>
          <AuthButton />
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Shared With Me</h1>
            <p className="text-xs text-[#666] dark:text-[#555] mt-1">Manifests that others shared with your account.</p>
          </div>
        </div>

        {!isSignedIn ? (
          <div className="mt-12 rounded-2xl border border-dashed border-[#d9d9d9] dark:border-[#2a2a2a] p-8 text-center">
            <p className="text-sm text-[#666] dark:text-[#555]">Sign in to view manifests shared with you.</p>
          </div>
        ) : loading || usersLoading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl border border-[#e7e7e7] dark:border-[#1f1f1f] p-5 animate-pulse space-y-3">
                <div className="h-4 w-36 bg-[#f0f0f0] dark:bg-[#111] rounded" />
                <div className="h-3 w-full bg-[#f0f0f0] dark:bg-[#111] rounded" />
                <div className="h-3 w-2/3 bg-[#f0f0f0] dark:bg-[#111] rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-red-200 dark:border-red-900/40 p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : shares.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-[#d9d9d9] dark:border-[#2a2a2a] p-8 text-center">
            <ShoppingBag className="h-6 w-6 mx-auto text-[#bbb] dark:text-[#444]" />
            <p className="mt-2 text-sm text-[#666] dark:text-[#555]">No shared manifests yet.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {Object.entries(groupedShares).map(([ownerUserId, ownerShares]) => {
              const ownerLabel = getOwnerLabel(ownerUserId, users);
      const ownerItems = ownerShares.flatMap(share => (Array.isArray(share.items) ? share.items : []));
              return (
                <section key={ownerUserId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#0f0f0f] dark:text-[#f0f0f0]">{ownerLabel}</h2>
                    <span className="text-[11px] text-[#999] dark:text-[#555]">{ownerItems.length} items</span>
                  </div>
                  {ownerItems.length === 0 ? (
                    <p className="text-xs text-[#999] dark:text-[#555]">No items available.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ownerItems.map((item, index) => (
                        <ManifestCard key={`${ownerUserId}-${item._id || item.id || index}`} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
