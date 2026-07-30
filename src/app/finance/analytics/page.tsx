'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetItem {
  id: string;
  name: string;
  amounts: number[];
}

interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  order: number;
  items: BudgetItem[];
}

interface BudgetPlan {
  year: number;
  incomes: number[];
  categories: BudgetCategory[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const COLOR_HEX: Record<string, string> = {
  blue:   '#60a5fa',
  green:  '#34d399',
  red:    '#fb7185',
  purple: '#c084fc',
  yellow: '#fbbf24',
  gray:   '#94a3b8',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000)   return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

function fmtINRFull(n: number): string {
  return `₹${Math.abs(n).toLocaleString('en-IN')}`;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function catMonthTotal(cat: BudgetCategory, mi: number): number {
  return cat.items.reduce((s, item) => s + (item.amounts[mi] ?? 0), 0);
}

function catYearTotal(cat: BudgetCategory): number {
  return MONTHS.reduce((s, _, mi) => s + catMonthTotal(cat, mi), 0);
}

function planMonthTotal(plan: BudgetPlan, mi: number): number {
  return plan.categories.reduce((s, cat) => s + catMonthTotal(cat, mi), 0);
}

function activeMonths(plan: BudgetPlan): number[] {
  return MONTHS.map((_, mi) => mi).filter(
    mi => (plan.incomes[mi] ?? 0) > 0 || planMonthTotal(plan, mi) > 0
  );
}

function niceMax(val: number): number {
  if (val <= 50000)  return Math.ceil(val / 10000) * 10000;
  if (val <= 200000) return Math.ceil(val / 50000) * 50000;
  return Math.ceil(val / 100000) * 100000;
}

function fmtAxis(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(0)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, trend }: {
  label: string; value: string; sub?: string; accent?: string; trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4 space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#aaa] dark:text-[#555]">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${accent ?? 'text-[#111] dark:text-white'}`}>{value}</p>
      {sub && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-[#aaa] dark:text-[#555]">
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-400" />}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

// ─── Stacked Monthly Bars ─────────────────────────────────────────────────────

function StackedMonthlyChart({ plan }: { plan: BudgetPlan }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = activeMonths(plan);
  if (active.length === 0) return null;
  const sortedCats = [...plan.categories].sort((a, b) => a.order - b.order);
  const W = 560, H = 220;
  const PAD = { t: 16, r: 16, b: 32, l: 48 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const incomeMax = Math.max(...active.map(mi => plan.incomes[mi] ?? 0), 1);
  const spendMax  = Math.max(...active.map(mi => planMonthTotal(plan, mi)), 1);
  const max = niceMax(Math.max(incomeMax, spendMax));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * max));
  const slotW = chartW / active.length;
  const barW  = Math.max(20, slotW * 0.68);
  const xBase = (i: number) => PAD.l + i * slotW + slotW / 2 - barW / 2;
  const yScale = (v: number) => PAD.t + chartH - (v / max) * chartH;
  const barH  = (v: number) => (v / max) * chartH;

  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#111] dark:text-white">Monthly Spending Breakdown</p>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {sortedCats.map(cat => (
            <span key={cat.id} className="flex items-center gap-1 text-[10px] text-[#777] dark:text-[#555]">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: COLOR_HEX[cat.color] ?? '#94a3b8' }} />
              {cat.name}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-[#777] dark:text-[#555]">
            <span className="inline-block w-4 border-t-2 border-dashed border-emerald-400" />
            Income
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '200px' }}>
        {/* Grid lines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.l} y1={yScale(v)} x2={W - PAD.r} y2={yScale(v)}
              stroke="#e8e8e8" strokeWidth={1} className="dark:stroke-[#1f1f1f]" />
            <text x={PAD.l - 4} y={yScale(v) + 3.5} textAnchor="end" fontSize={8} fill="#bbb">{fmtAxis(v)}</text>
          </g>
        ))}
        {/* Stacked bars */}
        {active.map((mi, i) => {
          const x = xBase(i);
          const inc = plan.incomes[mi] ?? 0;
          let cumY = PAD.t + chartH;
          const totalH = barH(planMonthTotal(plan, mi));
          const segments = sortedCats.map(cat => {
            const v = catMonthTotal(cat, mi);
            return { cat, v };
          }).filter(s => s.v > 0);
          return (
            <g key={mi} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
              {/* Bar shadow */}
              <rect x={x + 1} y={PAD.t + chartH - totalH + 1} width={barW} height={totalH}
                fill="#000" opacity={0.06} rx={3} />
              {/* Segments */}
              {segments.map(({ cat, v }, si) => {
                const h = barH(v);
                const isTop = si === segments.length - 1;
                cumY -= h;
                return (
                  <rect key={cat.id} x={x} y={cumY} width={barW} height={h + (isTop ? 0 : 0.5)}
                    fill={COLOR_HEX[cat.color] ?? '#94a3b8'}
                    opacity={hovered === i ? 1 : 0.85}
                    rx={isTop ? 3 : 0}
                    ry={isTop ? 3 : 0}
                  />
                );
              })}
              {/* Income dashed line */}
              {inc > 0 && (
                <line
                  x1={x - 4} y1={yScale(inc)} x2={x + barW + 4} y2={yScale(inc)}
                  stroke="#34d399" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.8}
                />
              )}
              {/* Hover label */}
              {hovered === i && (
                <text x={x + barW / 2} y={yScale(planMonthTotal(plan, mi)) - 7}
                  textAnchor="middle" fontSize={8.5} fill="#60a5fa" fontWeight={700}>
                  {fmtAxis(planMonthTotal(plan, mi))}
                </text>
              )}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={8.5}
                fill={hovered === i ? '#60a5fa' : '#999'} fontWeight={hovered === i ? 700 : 400}>
                {MONTHS[mi]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Investment Rate Trend ────────────────────────────────────────────────────

function InvestmentRateChart({ plan }: { plan: BudgetPlan }) {
  const investCat = plan.categories.find(c => c.name.toLowerCase().includes('invest'));
  const active = activeMonths(plan).filter(mi => (plan.incomes[mi] ?? 0) > 0);
  const [hovered, setHovered] = useState<number | null>(null);
  if (!investCat || active.length === 0) return null;

  const rates = active.map(mi => ({
    mi,
    rate: pct(catMonthTotal(investCat, mi), plan.incomes[mi] ?? 0),
    inv:  catMonthTotal(investCat, mi),
  }));

  const W = 560, H = 160;
  const PAD = { t: 20, r: 16, b: 28, l: 40 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const xScale = (i: number) => PAD.l + (i / (rates.length - 1 || 1)) * chartW;
  const yScale = (r: number) => PAD.t + chartH - (r / 100) * chartH;
  const points = rates.map((r, i) => `${xScale(i)},${yScale(r.rate)}`).join(' ');
  const avgRate = Math.round(rates.reduce((s, r) => s + r.rate, 0) / rates.length);

  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs font-semibold text-[#111] dark:text-white">Investment Rate Trend</p>
          <p className="text-[10px] text-[#aaa] dark:text-[#555] mt-0.5">% of income allocated to investments each month</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-400 tabular-nums">{avgRate}%</p>
          <p className="text-[10px] text-[#aaa] dark:text-[#555]">avg this year</p>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '140px' }}>
        {[25, 50, 75].map(v => (
          <g key={v}>
            <line x1={PAD.l} y1={yScale(v)} x2={W - PAD.r} y2={yScale(v)}
              stroke={v === 50 ? '#60a5fa' : '#e8e8e8'} strokeWidth={1}
              strokeDasharray={v === 50 ? '4,3' : undefined} opacity={v === 50 ? 0.4 : 1}
              className={v !== 50 ? 'dark:stroke-[#1f1f1f]' : ''} />
            <text x={PAD.l - 4} y={yScale(v) + 3.5} textAnchor="end" fontSize={8} fill={v === 50 ? '#60a5fa' : '#bbb'}>{v}%</text>
          </g>
        ))}
        {rates.length > 1 && (
          <>
            <polygon
              points={`${points} ${xScale(rates.length - 1)},${PAD.t + chartH} ${xScale(0)},${PAD.t + chartH}`}
              fill="#60a5fa" opacity={0.08} />
            <polyline points={points} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {rates.map((r, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <circle cx={xScale(i)} cy={yScale(r.rate)} r={hovered === i ? 5 : 3.5}
              fill={r.rate >= 50 ? '#34d399' : '#fb7185'} stroke="white" strokeWidth={1.5} style={{ cursor: 'default' }} />
            {hovered === i && (
              <text x={xScale(i)} y={yScale(r.rate) - 8} textAnchor="middle" fontSize={8.5} fill="#60a5fa" fontWeight={600}>
                {r.rate}% · {fmtAxis(r.inv)}
              </text>
            )}
            <text x={xScale(i)} y={H - 4} textAnchor="middle" fontSize={8} fill={hovered === i ? '#60a5fa' : '#bbb'}>{MONTHS[r.mi]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Income Growth ────────────────────────────────────────────────────────────

function IncomeGrowthChart({ plan }: { plan: BudgetPlan }) {
  const active = activeMonths(plan).filter(mi => (plan.incomes[mi] ?? 0) > 0);
  if (active.length < 2) return null;
  const incomes = active.map(mi => ({ mi, val: plan.incomes[mi] ?? 0 }));
  const first = incomes[0].val, last = incomes[incomes.length - 1].val;
  const growth = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const W = 560, H = 120;
  const PAD = { t: 16, r: 16, b: 28, l: 48 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const min = Math.min(...incomes.map(r => r.val)) * 0.97;
  const max = niceMax(Math.max(...incomes.map(r => r.val)));
  const xScale = (i: number) => PAD.l + (i / (incomes.length - 1 || 1)) * chartW;
  const yScale = (v: number) => PAD.t + chartH - ((v - min) / (max - min)) * chartH;
  const points = incomes.map((r, i) => `${xScale(i)},${yScale(r.val)}`).join(' ');

  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-[#111] dark:text-white">Income Growth</p>
        {growth !== 0 && (
          <span className={`flex items-center gap-1 text-[11px] font-semibold ${growth > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {growth > 0 ? '+' : ''}{growth}% over period
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '100px' }}>
        {incomes.length > 1 && (
          <>
            <polygon points={`${points} ${xScale(incomes.length - 1)},${PAD.t + chartH} ${xScale(0)},${PAD.t + chartH}`} fill="#34d399" opacity={0.1} />
            <polyline points={points} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {incomes.map((r, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(r.val)} r={3} fill="#34d399" stroke="white" strokeWidth={1.5} />
            <text x={xScale(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#bbb">{MONTHS[r.mi]}</text>
          </g>
        ))}
        <text x={xScale(0)} y={yScale(first) - 6} textAnchor="middle" fontSize={8} fill="#aaa">{fmtAxis(first)}</text>
        <text x={xScale(incomes.length - 1)} y={yScale(last) - 6} textAnchor="middle" fontSize={8} fill="#34d399" fontWeight={600}>{fmtAxis(last)}</text>
      </svg>
    </div>
  );
}

// ─── Spending Spikes ──────────────────────────────────────────────────────────

function SpikesChart({ plan }: { plan: BudgetPlan }) {
  const active = activeMonths(plan);
  if (active.length < 2) return null;

  type Spike = { item: string; cat: string; catColor: string; month: number; amount: number; avg: number; delta: number };
  const spikes: Spike[] = [];

  for (const cat of plan.categories) {
    for (const item of cat.items) {
      const vals = active.map(mi => item.amounts[mi] ?? 0).filter(v => v > 0);
      if (vals.length < 2) continue;
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      for (const mi of active) {
        const v = item.amounts[mi] ?? 0;
        if (v === 0) continue;
        const delta = v - avg;
        if (Math.abs(delta) > avg * 0.3 && Math.abs(delta) > 2000) {
          spikes.push({ item: item.name, cat: cat.name, catColor: cat.color, month: mi, amount: v, avg: Math.round(avg), delta: Math.round(delta) });
        }
      }
    }
  }

  if (spikes.length === 0) return null;
  spikes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const visible = spikes.slice(0, 6);

  const ROW_H = 40;
  const LABEL_W = 130;
  const PAD_R = 60;
  const W = 560;
  const H = visible.length * ROW_H + 24;
  const chartW = W - LABEL_W - PAD_R;
  const maxVal = Math.max(...visible.map(s => s.amount), 1);
  const xScale = (v: number) => LABEL_W + (v / maxVal) * chartW;

  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <p className="text-xs font-semibold text-[#111] dark:text-white">Spending Spikes</p>
        <span className="text-[10px] text-[#aaa] dark:text-[#555]">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400/40 border border-slate-400" /> avg
          </span>
          {' → '}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400" /> actual
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: `${H}px` }}>
        {visible.map((s, i) => {
          const cy = 12 + i * ROW_H + ROW_H / 2;
          const xAvg = xScale(s.avg);
          const xActual = xScale(s.amount);
          const hex = COLOR_HEX[s.catColor] ?? '#94a3b8';
          const isOver = s.delta > 0;
          const dotColor = isOver ? '#fb7185' : '#34d399';

          return (
            <g key={i}>
              {/* Row bg */}
              {i % 2 === 0 && (
                <rect x={0} y={cy - ROW_H / 2} width={W} height={ROW_H} fill="#f9f9f9" opacity={0.5}
                  className="dark:fill-[#0a0a0a]" rx={4} />
              )}
              {/* Label */}
              <text x={0} y={cy - 5} fontSize={8.5} fill="#444" className="dark:fill-[#ccc]" fontWeight={600}>
                {s.item.length > 14 ? s.item.slice(0, 13) + '…' : s.item}
              </text>
              <text x={0} y={cy + 7} fontSize={7.5} fill="#aaa">{MONTHS[s.month]} · {s.cat}</text>

              {/* Track line */}
              <line x1={LABEL_W} y1={cy} x2={W - PAD_R} y2={cy} stroke="#e8e8e8" strokeWidth={1}
                className="dark:stroke-[#222]" />

              {/* Connector between avg and actual */}
              <line x1={Math.min(xAvg, xActual)} y1={cy} x2={Math.max(xAvg, xActual)} y2={cy}
                stroke={dotColor} strokeWidth={2.5} opacity={0.5} />

              {/* Avg dot (hollow) */}
              <circle cx={xAvg} cy={cy} r={5} fill="#1a1a1a" stroke={hex} strokeWidth={1.5}
                className="dark:fill-[#0d0d0d]" />

              {/* Actual dot (filled) */}
              <circle cx={xActual} cy={cy} r={6} fill={dotColor} stroke="white" strokeWidth={1.5} />

              {/* Delta label */}
              <text
                x={W - PAD_R + 6} y={cy + 4}
                fontSize={8.5} fontWeight={700}
                fill={isOver ? '#fb7185' : '#34d399'}
              >
                {isOver ? '+' : ''}{fmtINR(s.delta)}
              </text>
            </g>
          );
        })}
        {/* x-axis ticks */}
        {[0, 0.5, 1].map(f => {
          const v = Math.round(f * maxVal);
          const x = xScale(v);
          return (
            <g key={f}>
              <line x1={x} y1={H - 10} x2={x} y2={H - 6} stroke="#ddd" strokeWidth={1} className="dark:stroke-[#333]" />
              <text x={x} y={H - 1} textAnchor="middle" fontSize={7.5} fill="#bbb">{fmtAxis(v)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ plan }: { plan: BudgetPlan }) {
  const cats = plan.categories
    .map(cat => ({ name: cat.name, color: cat.color, total: catYearTotal(cat) }))
    .filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const grand = cats.reduce((s, c) => s + c.total, 0);

  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[#111] dark:text-white">Category Split</p>
      <div className="space-y-2.5">
        {cats.map(c => {
          const p = pct(c.total, grand);
          const hex = COLOR_HEX[c.color] ?? '#94a3b8';
          return (
            <div key={c.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                  <span className="text-[#555] dark:text-[#999]">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-[10px] text-[#aaa] dark:text-[#555]">{p}%</span>
                  <span className="font-medium text-[#111] dark:text-white">{fmtINR(c.total)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#f0f0f0] dark:bg-[#1a1a1a] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: hex }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Monthly Table ────────────────────────────────────────────────────────────

function MonthlyTable({ plan }: { plan: BudgetPlan }) {
  const investCat = plan.categories.find(c => c.name.toLowerCase().includes('invest'));
  const rows = activeMonths(plan)
    .filter(mi => (plan.incomes[mi] ?? 0) > 0)
    .map(mi => ({
      mi,
      inc:     plan.incomes[mi] ?? 0,
      inv:     investCat ? catMonthTotal(investCat, mi) : 0,
      spd:     planMonthTotal(plan, mi),
      invRate: pct(investCat ? catMonthTotal(investCat, mi) : 0, plan.incomes[mi] ?? 0),
    }));

  if (rows.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4">
      <p className="text-xs font-semibold text-[#111] dark:text-white mb-3">Monthly Snapshot</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#f0f0f0] dark:border-[#1a1a1a]">
              {['Month','Income','Invested','Invest %','Total Spent'].map(h => (
                <th key={h} className="pb-2 text-left font-medium text-[#aaa] dark:text-[#555] first:text-left text-right px-2 first:px-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.mi} className="border-b border-[#f8f8f8] dark:border-[#111] last:border-0">
                <td className="py-2 font-medium text-[#333] dark:text-[#ccc]">{MONTHS[r.mi]}</td>
                <td className="py-2 px-2 text-right tabular-nums text-[#555] dark:text-[#777]">{fmtINRFull(r.inc)}</td>
                <td className="py-2 px-2 text-right tabular-nums text-blue-400 font-medium">{r.inv > 0 ? fmtINRFull(r.inv) : '—'}</td>
                <td className="py-2 px-2 text-right tabular-nums">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    r.invRate >= 50 ? 'bg-emerald-500/10 text-emerald-500' :
                    r.invRate >= 30 ? 'bg-blue-500/10 text-blue-400' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>{r.invRate}%</span>
                </td>
                <td className="py-2 px-2 text-right tabular-nums text-[#555] dark:text-[#777]">{fmtINRFull(r.spd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Year Comparison ──────────────────────────────────────────────────────────

function YearComparison({ plans }: { plans: BudgetPlan[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  if (plans.length < 2) return null;
  const [p1, p2] = [...plans].sort((a, b) => a.year - b.year);

  const totalIncome = (p: BudgetPlan) =>
    activeMonths(p).filter(mi => (p.incomes[mi] ?? 0) > 0).reduce((s, mi) => s + (p.incomes[mi] ?? 0), 0);
  const totalInv = (p: BudgetPlan) => {
    const c = p.categories.find(cat => cat.name.toLowerCase().includes('invest'));
    return c ? catYearTotal(c) : 0;
  };
  const avgInvRate = (p: BudgetPlan) => pct(totalInv(p), totalIncome(p));
  const activeCount = (p: BudgetPlan) => activeMonths(p).filter(mi => (p.incomes[mi] ?? 0) > 0).length;
  const getCatTotal = (p: BudgetPlan, name: string) => {
    const c = p.categories.find(cat => cat.name === name);
    return c ? catYearTotal(c) : 0;
  };
  const getColor = (name: string) =>
    (p2.categories.find(c => c.name === name) ?? p1.categories.find(c => c.name === name))?.color ?? 'gray';

  const catNames = Array.from(new Set([...p1.categories.map(c => c.name), ...p2.categories.map(c => c.name)]));
  const globalMax = Math.max(...catNames.flatMap(n => [getCatTotal(p1, n), getCatTotal(p2, n)]), 1);

  // grouped horizontal bar chart
  const LABEL_W = 100;
  const PAD_R   = 56;
  const W = 560;
  const CAT_H = 56;  // height per category group
  const BAR_H = 11;
  const GAP   = 5;
  const H = catNames.length * CAT_H + 24;
  const chartW = W - LABEL_W - PAD_R;
  const xScale = (v: number) => LABEL_W + (v / globalMax) * chartW;

  const summaryMetrics = [
    { label: 'Avg Monthly Income',
      v1: activeCount(p1) > 0 ? Math.round(totalIncome(p1) / activeCount(p1)) : 0,
      v2: activeCount(p2) > 0 ? Math.round(totalIncome(p2) / activeCount(p2)) : 0,
      fmt: fmtINR },
    { label: 'Total Invested', v1: totalInv(p1), v2: totalInv(p2), fmt: fmtINR },
    { label: 'Avg Invest Rate', v1: avgInvRate(p1), v2: avgInvRate(p2), fmt: (n: number) => `${n}%` },
  ];

  return (
    <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#111] dark:text-white">Year-over-Year</p>
        <div className="flex items-center gap-3 text-[10px] text-[#777] dark:text-[#555]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-2 rounded-sm bg-slate-400/35 border border-slate-400/60" />
            {p1.year}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-2 rounded-sm bg-blue-400" />
            {p2.year}
          </span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 pb-4 border-b border-[#f0f0f0] dark:border-[#1a1a1a]">
        {summaryMetrics.map(({ label, v1, v2, fmt }) => {
          const diff = v1 > 0 ? Math.round(((v2 - v1) / v1) * 100) : null;
          return (
            <div key={label} className="space-y-0.5">
              <p className="text-[10px] text-[#aaa] dark:text-[#555] uppercase tracking-wider leading-tight">{label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-[#aaa] dark:text-[#555] tabular-nums line-through">{fmt(v1)}</span>
                <span className="text-sm font-bold text-[#111] dark:text-white tabular-nums">{fmt(v2)}</span>
              </div>
              {diff !== null && (
                <p className={`text-[10px] font-semibold flex items-center gap-0.5 ${diff >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {diff >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {diff >= 0 ? '+' : ''}{diff}% YoY
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Grouped horizontal bar chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: `${H}px` }}>
        {/* Axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const v = Math.round(f * globalMax);
          const x = xScale(v);
          return (
            <g key={f}>
              <line x1={x} y1={0} x2={x} y2={H - 14} stroke="#e8e8e8" strokeWidth={1} className="dark:stroke-[#1f1f1f]" />
              <text x={x} y={H - 4} textAnchor="middle" fontSize={7.5} fill="#bbb">{fmtAxis(v)}</text>
            </g>
          );
        })}

        {catNames.map((name, ci) => {
          const t1 = getCatTotal(p1, name);
          const t2 = getCatTotal(p2, name);
          const hex = COLOR_HEX[getColor(name)] ?? '#94a3b8';
          const diff = t1 > 0 && t2 > 0 ? Math.round(((t2 - t1) / t1) * 100) : null;
          const isInvest = name.toLowerCase().includes('invest');
          const diffGood = diff !== null && (isInvest ? diff >= 0 : diff <= 0);
          const yBase = ci * CAT_H + 8;
          const y1 = yBase;
          const y2 = yBase + BAR_H + GAP;
          const isHov = hovered === name;

          return (
            <g key={name}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}
            >
              {/* Category label */}
              <text x={0} y={y1 + BAR_H - 1} fontSize={9} fill={isHov ? hex : '#777'}
                fontWeight={isHov ? 700 : 400} className="dark:fill-[#888]">
                {name}
              </text>

              {/* 2025 bar */}
              {t1 > 0 && (
                <>
                  <rect x={LABEL_W} y={y1} width={xScale(t1) - LABEL_W} height={BAR_H}
                    fill={hex} opacity={isHov ? 0.5 : 0.3} rx={2} />
                  <text x={xScale(t1) + 4} y={y1 + BAR_H - 1} fontSize={8} fill="#aaa" className="dark:fill-[#555]">
                    {fmtINR(t1)}
                  </text>
                </>
              )}

              {/* 2026 bar */}
              {t2 > 0 && (
                <>
                  <rect x={LABEL_W} y={y2} width={xScale(t2) - LABEL_W} height={BAR_H}
                    fill={hex} opacity={isHov ? 1 : 0.85} rx={2} />
                  <text x={xScale(t2) + 4} y={y2 + BAR_H - 1} fontSize={8} fontWeight={600}
                    fill={isHov ? hex : '#666'} className="dark:fill-[#aaa]">
                    {fmtINR(t2)}
                  </text>
                </>
              )}

              {/* YoY badge */}
              {diff !== null && (
                <text x={W - 4} y={y1 + BAR_H + GAP / 2 + 3} textAnchor="end" fontSize={8.5} fontWeight={700}
                  fill={diffGood ? '#34d399' : '#fb7185'}>
                  {diff >= 0 ? '+' : ''}{diff}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const nowYear = new Date().getFullYear();
  const [activeYear, setActiveYear] = useState(nowYear);
  const [plans, setPlans] = useState<Record<number, BudgetPlan>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/budget-plan?years=2025,2026')
      .then(r => r.json())
      .then(json => {
        const map: Record<number, BudgetPlan> = {};
        if (Array.isArray(json.data)) for (const d of json.data) map[d.year] = d;
        setPlans(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const plan        = plans[activeYear];
  const allPlans    = Object.values(plans);
  const investCat   = plan?.categories.find(c => c.name.toLowerCase().includes('invest'));
  const activeInc   = plan ? activeMonths(plan).filter(mi => (plan.incomes[mi] ?? 0) > 0).reduce((s, mi) => s + (plan.incomes[mi] ?? 0), 0) : 0;
  const totalInv    = investCat ? catYearTotal(investCat) : 0;
  const invRate     = pct(totalInv, activeInc);
  const fixedCats   = plan?.categories.filter(c => !c.name.toLowerCase().includes('invest') && !c.name.toLowerCase().includes('want')) ?? [];
  const fixedTotal  = fixedCats.reduce((s, c) => s + catYearTotal(c), 0);
  const activeCount = plan ? activeMonths(plan).filter(mi => (plan.incomes[mi] ?? 0) > 0).length : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-[#eee] dark:hover:bg-[#1a1a1a] text-[#666] dark:text-[#555] transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-sm font-semibold text-[#111] dark:text-white tabular-nums">{activeYear}</span>
          <button onClick={() => setActiveYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-[#eee] dark:hover:bg-[#1a1a1a] text-[#666] dark:text-[#555] transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-[#aaa] dark:text-[#555]">{activeCount > 0 ? `${activeCount} active months` : 'No data'}</p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-[#f0f0f0] dark:bg-[#111] animate-pulse" />)}
        </div>
      )}

      {!loading && !plan && (
        <div className="text-center py-16 text-sm text-[#aaa] dark:text-[#555]">No budget data for {activeYear}.</div>
      )}

      {!loading && plan && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Income" value={fmtINRFull(activeInc)} sub={`${activeCount} months`} />
            <KpiCard label="Total Invested" value={totalInv > 0 ? fmtINRFull(totalInv) : '—'} accent="text-blue-400"
              sub={totalInv > 0 ? `${invRate}% of income` : undefined} trend={invRate >= 40 ? 'up' : undefined} />
            <KpiCard label="Investment Rate" value={`${invRate}%`}
              accent={invRate >= 50 ? 'text-emerald-400' : invRate >= 30 ? 'text-blue-400' : 'text-amber-400'}
              sub={invRate >= 50 ? 'Excellent savings habit' : invRate >= 30 ? 'Good savings habit' : 'Room to grow'}
              trend={invRate >= 30 ? 'up' : 'down'} />
            <KpiCard label="Fixed Costs / mo" value={fmtINR(activeCount > 0 ? Math.round(fixedTotal / activeCount) : 0)}
              sub="Essentials + EMI avg" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
            <StackedMonthlyChart plan={plan} />
            <CategoryBreakdown plan={plan} />
          </div>

          <InvestmentRateChart plan={plan} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <IncomeGrowthChart plan={plan} />
            <SpikesChart plan={plan} />
          </div>

          <MonthlyTable plan={plan} />
        </>
      )}

      {!loading && allPlans.length >= 2 && <YearComparison plans={allPlans} />}
    </div>
  );
}
