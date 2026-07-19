import Link from 'next/link';
import { ShoppingBag, CreditCard, Activity, BarChart2, Map, ArrowUpRight } from 'lucide-react';

const APPS = [
  { num: '01', name: 'quick-shop', slug: '/wish', icon: ShoppingBag, desc: 'Write what you want, search real products, shortlist and buy.', live: true  },
  { num: '02', name: 'flex-card',  slug: '#',     icon: CreditCard,  desc: 'Manage credit cards and track benefits, cashback, and rewards.', live: false },
  { num: '03', name: 'healthify',  slug: '#',     icon: Activity,    desc: 'Log blood reports and diet. Monitor health trends over time.',   live: false },
  { num: '04', name: 'finance',    slug: '#',     icon: BarChart2,   desc: 'Monthly finance tracker — income, expenses, savings goals.',     live: false },
  { num: '05', name: 'travel',     slug: '#',     icon: Map,         desc: 'Plan trips, save destinations, and organise itineraries.',       live: false },
] as const;

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-[#222] bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
          <span className="text-sm font-semibold">My Apps</span>
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-16 space-y-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">A suite of minimal tools</h1>
          <p className="text-[#555] text-sm">Personal apps — simple, useful, nothing extra.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APPS.map(({ num, name, slug, icon: Icon, desc, live }) => (
            <Link
              key={num}
              href={slug}
              aria-disabled={!live}
              className={`group block bg-[#111] border rounded-xl p-5 space-y-4 transition-all duration-150 ${
                live
                  ? 'border-[#333] hover:border-[#555] cursor-pointer'
                  : 'border-[#1a1a1a] opacity-50 pointer-events-none'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#444]">{num}</span>
                {live
                  ? <span className="text-[10px] font-semibold bg-white text-black px-2 py-0.5 rounded-full">LIVE</span>
                  : <span className="text-[10px] font-mono border border-[#333] text-[#555] px-2 py-0.5 rounded-full">SOON</span>}
              </div>
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="p-2 bg-black border border-[#222] rounded-lg w-fit group-hover:border-[#333] transition">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-sm font-semibold">{name}</h2>
                </div>
                {live && <ArrowUpRight className="h-4 w-4 mt-1 text-[#555] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
              </div>
              <p className="text-xs text-[#666] leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#1a1a1a] py-5 text-center text-xs text-[#333]">
        Built with Next.js 15
      </footer>
    </div>
  );
}
