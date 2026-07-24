import Link from 'next/link';
import { ShoppingBag, CreditCard, Activity, BarChart2, Map, ArrowUpRight } from 'lucide-react';
import AuthButton from '@/components/AuthButton';

const APPS = [
  {
    num: '01', name: 'Wish Me', slug: '/wish', live: true,
    icon: ShoppingBag,
    desc: 'Track things you want. Paste store links and jump to them whenever you\u2019re ready to buy.',
    accent: 'bg-violet-500',
    iconCls: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    badge: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  },
  {
    num: '02', name: 'Flex Cards', slug: null, live: false,
    icon: CreditCard,
    desc: 'Manage all your credit cards in one place. Track benefits, cashback rates, and reward points.',
    accent: 'bg-amber-500',
    iconCls: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    badge: '',
  },
  {
    num: '03', name: 'Healthify', slug: null, live: false,
    icon: Activity,
    desc: 'Upload blood reports and track key health markers over time. Simple diet logging included.',
    accent: 'bg-emerald-500',
    iconCls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    badge: '',
  },
  {
    num: '04', name: 'Finance', slug: null, live: false,
    icon: BarChart2,
    desc: 'Monthly income and expense tracker. Set savings goals and see exactly where your money goes.',
    accent: 'bg-blue-500',
    iconCls: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    badge: '',
  },
  {
    num: '05', name: 'Travel', slug: null, live: false,
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
          <span className="text-[10px] font-mono text-[#bbb] dark:text-[#2a2a2a]">{num}</span>
          {live ? (
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${badge}`}>LIVE</span>
          ) : (
            <span className="text-[10px] font-mono border border-[#ddd] text-[#aaa] dark:border-[#222] dark:text-[#333] px-2 py-0.5 rounded-full">SOON</span>
          )}
        </div>

        {/* Icon + arrow */}
        <div className="flex items-start justify-between">
          <div className={`p-2 border rounded-lg w-fit ${iconCls}`}>
            <Icon className="h-4 w-4" />
          </div>
          {live && (
            <ArrowUpRight className="h-4 w-4 text-[#bbb] dark:text-[#333] mt-0.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#888]" />
          )}
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-white">{name}</h2>
          <p className="text-xs text-[#777] dark:text-[#444] leading-relaxed">{desc}</p>
        </div>
      </div>
    </>
  );

  const base = 'group relative bg-[#f8f8f8] dark:bg-[#0a0a0a] border rounded-xl overflow-hidden transition-all duration-200';

  if (live && slug) {
    return (
      <Link href={slug} className={`${base} border-[#e0e0e0] hover:border-[#c0c0c0] dark:border-[#2a2a2a] dark:hover:border-[#444]`}>
        {inner}
      </Link>
    );
  }
  return <div className={`${base} border-[#efefef] dark:border-[#141414] opacity-50`}>{inner}</div>;
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e5e5e5] dark:border-[#1a1a1a] bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-white">Sahin&apos;s Apps</span>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              {STACK.map(s => (
                <span key={s} className="text-[10px] text-[#aaa] dark:text-[#333] border border-[#e5e5e5] dark:border-[#1a1a1a] px-2 py-0.5 rounded-full font-mono">
                  {s}
                </span>
              ))}
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto w-full px-6 pt-16 pb-10">
        <div className="space-y-4 max-w-lg">
          <p className="text-[11px] font-mono text-[#aaa] dark:text-[#333] uppercase tracking-widest">
            Personal software suite
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
            Tools built for<br />
            <span className="text-[#ccc] dark:text-[#333]">everyday life.</span>
          </h1>
          <p className="text-[#666] dark:text-[#444] text-sm leading-relaxed">
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
      <footer className="border-t border-[#ebebeb] dark:border-[#111] py-6">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-[#aaa] dark:text-[#2a2a2a]">Built as a hobby · always evolving</p>
          <div className="flex sm:hidden items-center gap-1">
            {STACK.map(s => (
              <span key={s} className="text-[10px] text-[#aaa] dark:text-[#2a2a2a] border border-[#e5e5e5] dark:border-[#1a1a1a] px-2 py-0.5 rounded-full font-mono">
                {s}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
