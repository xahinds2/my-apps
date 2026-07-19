import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#333] bg-black/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold tracking-tight">quick-shop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-xs text-[#888] hover:text-white transition">
              Sign In
            </Link>
            <Link
              href="/"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-[#e0e0e0] transition"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-6 py-24 space-y-8">
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#333] text-xs text-[#888]">
          Wishlist · Search · Shortlist · Buy
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-white max-w-3xl">
          Your personal<br />shopping wishlist
        </h1>

        <p className="text-[#888] text-base md:text-lg max-w-lg leading-relaxed">
          Write what you want in plain text. Search real products on demand. Shortlist your favourites and buy directly on Amazon or Flipkart.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] transition"
          >
            <span>Start Wishlisting</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-up"
            className="px-6 py-2.5 rounded-lg border border-[#333] text-sm font-medium text-[#888] hover:text-white hover:border-white/30 transition text-center"
          >
            Create Account
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#222] rounded-xl overflow-hidden border border-[#222] mt-16 w-full max-w-3xl">
          {[
            { num: '01', title: 'Add a wish', desc: 'Type anything — "running shoes under ₹3000" — no forms, no categories.' },
            { num: '02', title: 'Find products', desc: 'Click Find to pull real listings from Amazon, Flipkart, and more.' },
            { num: '03', title: 'Buy', desc: 'Shortlist what you like. One click takes you directly to the seller.' },
          ].map(({ num, title, desc }) => (
            <div key={num} className="bg-black p-6 text-left space-y-2">
              <p className="text-xs text-[#555] font-mono">{num}</p>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-[#666] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#222] py-5 text-center text-xs text-[#444]">
        quick-shop · Next.js 15 · Clerk · MongoDB
      </footer>
    </div>
  );
}
