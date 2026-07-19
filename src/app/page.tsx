import Link from 'next/link';
import { ShoppingBag, CreditCard, Activity, BarChart2, Map, ArrowUpRight } from 'lucide-react';

const APPS = [
  {
    num: '01', name: 'wish me', slug: '/wish', live: true,
    icon: ShoppingBag,
    desc: 'Write what you want in plain text. Search real products and buy directly from Amazon or Flipkart.',
    accent: 'bg-violet-500',
    iconCls: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    badge: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  },
  {
    num: '02', name: 'flex-card', slug: null, live: false,
    icon: CreditCard,
    desc: 'Manage all your credit cards in one place. Track benefits, cashback rates, and reward points.',
    accent: 'bg-amber-500',
    iconCls: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    badge: '',
  },
  {
    num: '03', name: 'healthify', slug: null, live: false,
    icon: Activity,
    desc: 'Upload blood reports and track key health markers over time. Simple diet logging included.',
    accent: 'bg-emerald-500',
    iconCls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    badge: '',
  },
  {
    num: '04', name: 'finance', slug: null, live: false,
    icon: BarChart2,
    desc: 'Monthly income and expense tracker. Set savings goals and see exactly where your money goes.',
    accent: 'bg-blue-500',
    iconCls: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    badge: '',
  },
  {
    num: '05', name: 'travel', slug: null, live: false,
    icon: Map,
    desc: 'Plan trips, save destinations, and organise your itineraries and packing lists.',
    accent: 'bg-sky-500',
    iconCls: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    badge: '',
  },
];

const STACK = ['Next.js 15', 'TypeScript', 'MongoDB', 'Tailwind CSS', 'Clerk'];

function AppCard({ num, name, slug, live, icon: Icon, desc, accent, iconCls, badge }: typeof APPS[number]) {
  const inner = (
    <>
      {/* Color accent line */}
      <div className={`h-px w-full ${accent} opacity-20 group-hover:opacity-50 transition-opacity duration-200`} />

      <div className="p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#2a2a2a]">{num}</span>
          {live ? (
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${badge}`}>LIVE</span>
          ) : (
            <span className="text-[10px] font-mono border border-[#222] text-[#333] px-2 py-0.5 rounded-full">SOON</span>
          )}
        </div>

        {/* Icon + arrow */}
        <div className="flex items-start justify-between">
          <div className={`p-2 border rounded-lg w-fit ${iconCls}`}>
            <Icon className="h-4 w-4" />
          </div>
          {live && (
            <ArrowUpRight className="h-4 w-4 text-[#333] mt-0.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#888]" />
          )}
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h2 className="text-sm font-bold text-white">{name}</h2>
          <p className="text-xs text-[#444] leading-relaxed">{desc}</p>
        </div>
      </div>
    </>
  );

  const base = 'group relative bg-[#0a0a0a] border rounded-xl overflow-hidden transition-all duration-200';

  if (live && slug) {
    return (
      <Link href={slug} className={`${base} border-[#2a2a2a] hover:border-[#444]`}>
        {inner}
      </Link>
    );
  }
  return <div className={`${base} border-[#141414] opacity-50`}>{inner}</div>;
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1a1a1a] bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-white">my apps</span>
          <div className="hidden sm:flex items-center gap-1.5">
            {STACK.map(s => (
              <span key={s} className="text-[10px] text-[#333] border border-[#1a1a1a] px-2 py-0.5 rounded-full font-mono">
                {s}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto w-full px-6 pt-16 pb-10">
        <div className="space-y-4 max-w-lg">
          <p className="text-[11px] font-mono text-[#333] uppercase tracking-widest">
            Personal software suite
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
            Tools built for<br />
            <span className="text-[#333]">everyday life.</span>
          </h1>
          <p className="text-[#444] text-sm leading-relaxed">
            A growing collection of minimal apps — each one does exactly one thing,
            and does it well. Built as hobby projects, designed for real daily use.
          </p>
        </div>
      </div>

      {/* Grid */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APPS.map(app => <AppCard key={app.num} {...app} />)}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#111] py-6">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-[#2a2a2a]">Built as a hobby · always evolving</p>
          <div className="flex sm:hidden items-center gap-1">
            {STACK.map(s => (
              <span key={s} className="text-[10px] text-[#2a2a2a] border border-[#1a1a1a] px-2 py-0.5 rounded-full font-mono">
                {s}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
