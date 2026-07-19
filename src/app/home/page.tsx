import React from 'react';
import Link from 'next/link';
import { ArrowRight, Layers, Zap, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="font-sans min-h-screen text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            quick-shop
          </span>
          <Link
            href="/"
            className="px-4 py-1.5 text-xs font-bold rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 hover:text-white hover:border-white/20 transition duration-300 flex items-center space-x-1.5"
          >
            <span>Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
          <Zap className="h-3.5 w-3.5" />
          <span>Next.js 15 · Clerk · MongoDB · Tailwind</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight text-white max-w-3xl">
          Build something{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
            great
          </span>
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed">
          A clean, production-ready starter with authentication, database, and a premium dark UI — ready for your next feature.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold hover:from-indigo-500 hover:to-indigo-400 transition duration-300 shadow-[0_4px_24px_rgba(99,102,241,0.35)] flex items-center justify-center space-x-2 border border-indigo-400/20"
          >
            <span>Start Wishlisting</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-3 rounded-xl bg-slate-900 border border-white/5 text-slate-300 font-semibold hover:bg-slate-800 hover:text-white transition duration-300 text-center"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-6 py-3 rounded-xl bg-slate-900 border border-white/5 text-slate-300 font-semibold hover:bg-slate-800 hover:text-white transition duration-300 text-center"
          >
            Sign Up
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-3xl">
          {[
            { icon: Shield, title: 'Auth Ready', desc: 'Clerk integration with demo-mode fallback when no credentials are set.' },
            { icon: Layers, title: 'Database', desc: 'Mongoose + MongoDB with global connection caching for serverless.' },
            { icon: Zap, title: 'Edge Fast', desc: 'Turbopack dev server, App Router, React 19, and Tailwind v4.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-panel rounded-2xl p-5 text-left space-y-2">
              <div className="p-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 w-fit">
                <Icon className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-600">
        Built with Next.js 15 · Tailwind · Clerk · Mongoose
      </footer>
    </div>
  );
}
