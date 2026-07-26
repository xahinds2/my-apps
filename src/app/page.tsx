import Link from 'next/link';
import { ShoppingBag, CreditCard, Activity, BarChart2, Map, ArrowUpRight } from 'lucide-react';
import AuthButton from '@/components/AuthButton';

const SOCIAL = [
  {
    label: 'GitHub',
    href: 'https://github.com/xahinds2',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/xahinds2/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'LeetCode',
    href: 'https://leetcode.com/xahinds2/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
      </svg>
    ),
  },
];

const SKILLS = ['.NET', 'C#', 'MSSQL', 'AWS', 'TypeScript', 'React', 'Next.js', 'MongoDB', 'System Design'];

const BLAME: { hash: string; date: string; n: string; key: string; value: string; cls: string }[] = [
  { hash: 'a1f3c9e', date: '1998-01-01', n: '1', key: 'name',       value: '"Sahin Das"',                              cls: 'text-[#a3be8c]' },
  { hash: '3d8b22f', date: '2019-08-01', n: '2', key: 'education',  value: '"NIT Silchar"',           cls: 'text-[#a3be8c]' },
  { hash: 'f94e17a', date: '2023-06-10', n: '3', key: 'graduated',  value: '"B.Tech 2023"',                          cls: 'text-[#a3be8c]' },
  { hash: 'c52b8d1', date: '2023-07-03', n: '4', key: 'role',       value: '"Software Engineer"',                      cls: 'text-[#a3be8c]' },
  { hash: '7e1a9f4', date: '2024-01-01', n: '5', key: 'experience', value: '"3 years"',                               cls: 'text-[#ebcb8b]' },
  { hash: '2b6d05c', date: '2026-07-26', n: '6', key: 'location',   value: '"India"',                              cls: 'text-[#a3be8c]' },
  { hash: '9f3c1e8', date: '2026-07-26', n: '7', key: 'interests',  value: '["Anime", "Valorant", "Coding"]', cls: 'text-[#88c0d0]' },
  { hash: '4a7b2d6', date: '2026-07-26', n: '8', key: 'status',     value: '"open to opportunities ✨"',                cls: 'text-[#b48ead]' },
];

const LIVE_APPS = [
  {
    name: 'Manifest',
    slug: '/manifest',
    icon: ShoppingBag,
    desc: 'Wishlist tracker — save items with store links, set priorities and budgets, and jump back when ready to buy.',
    tech: ['Next.js', 'MongoDB', 'Clerk', 'Sharing'],
    iconCls: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    cardHover: 'hover:border-violet-300 dark:hover:border-violet-800',
  },
  {
    name: 'Finance',
    slug: '/finance',
    icon: BarChart2,
    desc: 'Monthly budget planner — set income, build category allocations across 12 months, and track every rupee.',
    tech: ['Next.js', 'MongoDB', 'Charts', 'Export'],
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
          <span className="text-sm font-mono text-[#0a0a0a] dark:text-white">~/sahin</span>
          <AuthButton />
        </div>
      </header>

      {/* Hero — identity */}
      <div className="max-w-3xl mx-auto w-full px-5 pt-12 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-[#0a0a0a] dark:text-white mb-0.5">Sahin Das</h1>
        <p className="text-xs text-[#888] dark:text-[#444] mb-5">Software Engineer · NITS 23&apos;</p>
      </div>

      {/* git blame — full width */}
      <div className="max-w-3xl mx-auto w-full px-5 pb-6">
        <div className="rounded-xl overflow-hidden border border-[#1e1e1e] bg-[#0d0d0d] font-mono text-[11px] leading-relaxed">
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[#1a1a1a] bg-[#111]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 text-[#3b4252] text-[9px] tracking-wide">sahin.ts — bash</span>
          </div>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[#3b4252]">❯ </span>
            <span className="text-[#616e88]">git blame sahin.ts</span>
          </div>
          <div className="px-4 pb-4 space-y-px">
            {BLAME.map(row => (
              <div key={row.n} className="flex items-baseline">
                <span className="text-[#2e3440] w-[7ch] shrink-0">{row.hash}</span>
                <span className="text-[#2e3440] mx-1">(</span>
                <span className="text-[#3b4252] w-[28ch] shrink-0">Sahin Das {row.date}</span>
                <span className="text-[#2e3440] mr-3">)</span>
                <span className="text-[#3b4252] w-[2ch] shrink-0 text-right mr-4">{row.n}</span>
                <span className="text-[#81a1c1] w-[12ch] shrink-0">{row.key}:</span>
                <span className={row.cls}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social + stack */}
      <div className="max-w-3xl mx-auto w-full px-5 pb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {SOCIAL.map(s => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e0e0e0] dark:border-[#222] text-[#555] dark:text-[#666] hover:text-[#0a0a0a] dark:hover:text-white hover:border-[#bbb] dark:hover:border-[#444] text-xs font-medium transition"
            >
              {s.icon}
              {s.label}
            </a>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SKILLS.map(t => (
            <span key={t} className="px-2 py-0.5 rounded-md bg-[#f0f0f0] dark:bg-[#111] border border-[#e8e8e8] dark:border-[#1e1e1e] text-[10px] text-[#666] dark:text-[#555] font-medium">
              {t}
            </span>
          ))}
        </div>
      </div>

      <main className="flex-grow max-w-3xl mx-auto w-full px-5 pb-20 space-y-10">

        {/* Live apps */}
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
                  <div className="flex flex-wrap gap-1">
                    {app.tech.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-[#f5f5f5] dark:bg-[#141414] text-[#888] dark:text-[#444] border border-[#ebebeb] dark:border-[#1e1e1e]">{t}</span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Coming soon */}
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

    </div>
  );
}

