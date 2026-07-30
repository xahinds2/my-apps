'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import AuthButton from '@/components/AuthButton';
import { ShoppingBasket, List, ShoppingCart } from 'lucide-react';
import GroceryList from '@/components/GroceryList';
import GroceryCart from '@/components/GroceryCart';

type Tab = 'list' | 'cart';

export default function GroceryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab: Tab = searchParams.get('tab') === 'cart' ? 'cart' : 'list';

  function setTab(id: Tab) {
    router.replace(id === 'cart' ? '/grocery?tab=cart' : '/grocery');
  }

  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-5">
          <div className="flex items-center gap-2">
            <ShoppingBasket size={18} className="text-emerald-500" />
            <h1 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Grocery</h1>
          </div>
          <AuthButton />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl mb-6">
          {([
            { id: 'list', label: 'List', icon: List },
            { id: 'cart', label: 'Cart', icon: ShoppingCart },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                tab === id
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {!isLoaded ? (
          <div className="py-20 flex justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-neutral-200 dark:border-neutral-700 border-t-emerald-500 animate-spin" />
          </div>
        ) : !isSignedIn ? (
          <div className="text-center py-20 text-neutral-400 text-sm">
            Sign in to use Grocery tracker.
          </div>
        ) : (
          <>
            {tab === 'list' && <GroceryList />}
            {tab === 'cart' && <GroceryCart />}
          </>
        )}
      </div>
    </main>
  );
}
