import Link from 'next/link';
import { ShoppingBag, CreditCard, Activity, BarChart2, Map, ArrowUpRight } from 'lucide-react';
import AuthButton from '@/components/AuthButton';

const LIVE_APPS = [
  {
    name: 'Manifest',
    slug: '/manifest',
    icon: ShoppingBag,
    desc: 'Track things you want. Paste store links and jump to them whenever you\'re ready to buy.',
    iconCls: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    cardHover: 'hover:border-violet-300 dark:hover:border-violet-800',
  },
  {
    name: 'Finance',
    slug: '/finance',
    icon: BarChart2,
    desc: 'Monthly budget planner. Set income, build category allocations, and track every rupee.',
    iconCls: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    cardHover: 'hover:border-blue-300 dark:hover:border-blue-800',
  },
];

const SOON_APPS = [
  {
    name: 'Flex Cards',
    icon: CreditCard,
    desc: 'Manage credit cards, track benefits, cashback, and reward points.',
    iconCls: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  },
  {
    name: 'Healthify',
    icon: Activity,
    desc: 'Upload blood reports and track health markers over time.',
    iconCls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
  {
    name: 'Travel',
    icon: Map,
    desc: 'Plan trips, save destinations, and organise itineraries.',
    iconCls: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] dark:bg-[#080808]">

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e8e8e8] dark:border-[#161616] bg-[#fafafa]/80 dark:bg-[#080808]/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 h-13 flex items-center justify-between">
          <span className="text-sm font-bold text-[#0a0a0a] dark:text-white tracking-tight">Sahin&apos;s Apps</span>
          <AuthButton />
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-3xl mx-auto w-full px-5 pt-12 pb-8">
        <p className="text-[10px] font-mono text-[#bbb] dark:text-[#333] uppercase tracking-widest mb-3">Personal software suite</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-[#0a0a0a] dark:text-white mb-3">
          Tools built for<br />
          <span className="text-[#ccc] dark:text-[#2a2a2a]">everyday life.</span>
        </h1>
        <p className="text-sm text-[#888] dark:text-[#444] leading-relaxed max-w-sm">
          Minimal apps — each doing one thing well. Built for real daily use.
        </p>
      </div>

      {/* Live Apps */}
      <main className="flex-grow max-w-3xl mx-auto w-full px-5 pb-16 space-y-10">

        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono font-semibold text-[#888] dark:text-[#444] uppercase tracking-widest">Live</span>
            <div className="h-px flex-1 bg-[#e8e8e8] dark:bg-[#161616]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LIVE_APPS.map(app => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.name}
                  href={app.slug}
                  className={`group relative bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] ${app.cardHover} rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 shadow-sm hover:shadow-md dark:shadow-none`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 border rounded-xl ${app.iconCls}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-[10px] font-semibold border px-2.5 py-0.5 rounded-full ${app.badge}`}>LIVE</span>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-[#0a0a0a] dark:text-white">{app.name}</h2>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#ccc] dark:text-[#333] transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#888] dark:group-hover:text-[#666]" />
                    </div>
                    <p className="text-xs text-[#888] dark:text-[#444] leading-relaxed">{app.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono font-semibold text-[#ccc] dark:text-[#222] uppercase tracking-widest">Coming soon</span>
            <div className="h-px flex-1 bg-[#e8e8e8] dark:bg-[#161616]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SOON_APPS.map(app => {
              const Icon = app.icon;
              return (
                <div
                  key={app.name}
                  className="bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#efefef] dark:border-[#141414] rounded-2xl p-4 flex flex-col gap-3 opacity-60"
                >
                  <div className={`p-1.5 border rounded-lg w-fit ${app.iconCls}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold text-[#555] dark:text-[#333]">{app.name}</h2>
                    <p className="text-[11px] text-[#aaa] dark:text-[#2a2a2a] leading-relaxed">{app.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#ebebeb] dark:border-[#111] py-5">
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-[11px] text-[#bbb] dark:text-[#2a2a2a]">Built as a hobby · always evolving</p>
        </div>
      </footer>

    </div>
  );
}

