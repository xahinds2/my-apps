'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="font-sans min-h-screen text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition duration-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
          <span className="text-sm font-bold text-white">Dashboard</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
          <LayoutDashboard className="h-8 w-8 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Your Dashboard</h1>
        <p className="text-slate-400 text-sm max-w-md leading-relaxed">
          This is a clean placeholder. Add your features, components, and API calls here.
        </p>
        <div className="glass-panel rounded-2xl px-8 py-6 text-xs text-slate-500 font-mono border border-white/5 mt-4">
          src/app/dashboard/page.tsx
        </div>
      </main>
    </div>
  );
}
