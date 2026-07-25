'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Color = 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'gray';

interface BudgetItem {
  id: string;
  name: string;
  order: number;
  amounts: number[]; // 12 elements
}

interface BudgetCategory {
  id: string;
  name: string;
  color: Color;
  order: number;
  items: BudgetItem[];
}

interface BudgetPlanDoc {
  year: number;
  incomes: number[];
  categories: BudgetCategory[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLOR_MAP: Record<Color, { border: string; bg: string; text: string; bar: string; swatch: string }> = {
  blue:   { border: 'border-blue-400',    bg: 'bg-blue-500/10',    text: 'text-blue-400',    bar: 'bg-blue-400',    swatch: 'bg-blue-400'    },
  green:  { border: 'border-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-400', swatch: 'bg-emerald-400' },
  red:    { border: 'border-rose-400',    bg: 'bg-rose-500/10',    text: 'text-rose-400',    bar: 'bg-rose-400',    swatch: 'bg-rose-400'    },
  purple: { border: 'border-purple-400',  bg: 'bg-purple-500/10',  text: 'text-purple-400',  bar: 'bg-purple-400',  swatch: 'bg-purple-400'  },
  yellow: { border: 'border-amber-400',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   bar: 'bg-amber-400',   swatch: 'bg-amber-400'   },
  gray:   { border: 'border-slate-400',   bg: 'bg-slate-500/10',   text: 'text-slate-400',   bar: 'bg-slate-400',   swatch: 'bg-slate-400'   },
};

const COLOR_ORDER: Color[] = ['blue', 'green', 'red', 'purple', 'yellow', 'gray'];

// ─── Utilities ───────────────────────────────────────────────────────────────

function nanoid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function emptyPlan(year: number): BudgetPlanDoc {
  return { year, incomes: Array(12).fill(0) as number[], categories: [] };
}

function padAmounts(arr: unknown): number[] {
  const base = Array.isArray(arr) ? (arr as unknown[]).map(a => (typeof a === 'number' ? a : 0)) : [];
  while (base.length < 12) base.push(0);
  return base.slice(0, 12);
}

function normalizePlan(raw: unknown): BudgetPlanDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  return {
    year: typeof d.year === 'number' ? d.year : new Date().getFullYear(),
    incomes: padAmounts(d.incomes),
    categories: Array.isArray(d.categories)
      ? (d.categories as unknown[]).map((c): BudgetCategory | null => {
          if (!c || typeof c !== 'object') return null;
          const cat = c as Record<string, unknown>;
          return {
            id: String(cat.id ?? nanoid()),
            name: String(cat.name ?? 'Category'),
            color: COLOR_ORDER.includes(cat.color as Color) ? (cat.color as Color) : 'blue',
            order: typeof cat.order === 'number' ? cat.order : 0,
            items: Array.isArray(cat.items)
              ? (cat.items as unknown[]).map((it): BudgetItem | null => {
                  if (!it || typeof it !== 'object') return null;
                  const item = it as Record<string, unknown>;
                  return {
                    id: String(item.id ?? nanoid()),
                    name: String(item.name ?? 'Item'),
                    order: typeof item.order === 'number' ? item.order : 0,
                    amounts: padAmounts(item.amounts),
                  };
                }).filter(Boolean) as BudgetItem[]
              : [],
          };
        }).filter(Boolean) as BudgetCategory[]
      : [],
  };
}

function parseAmount(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) || n < 0 ? 0 : Math.round(n);
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

// ─── Guest Migration ─────────────────────────────────────────────────────────

function GuestMigration({
  guestIdRef,
  onMigrated,
}: {
  guestIdRef: React.RefObject<string>;
  onMigrated: () => void;
}) {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || attemptedRef.current) return;
    const storageKey = `qs_migrated_${userId}`;
    if (localStorage.getItem(storageKey)) return;

    const guestId = guestIdRef.current;
    if (!guestId) return;

    attemptedRef.current = true;
    fetch('/api/budget-plan/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    })
      .then(r => r.json())
      .then(json => {
        localStorage.setItem(storageKey, '1');
        if ((json.migrated ?? 0) > 0) onMigrated();
      })
      .catch(() => {
        attemptedRef.current = false; // allow retry
      });
  }, [isLoaded, isSignedIn, userId, guestIdRef, onMigrated]);

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BudgetPlanner() {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const [activeYear, setActiveYear] = useState(nowYear);
  const [activeMonth, setActiveMonth] = useState(nowMonth);
  const [plans, setPlans] = useState<Record<number, BudgetPlanDoc>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // UI state
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState<Color>('blue');
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [renamingItem, setRenamingItem] = useState<{ catId: string; itemId: string } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedYears = useRef(new Set<number>());
  const guestIdRef = useRef<string>('');
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // ── Guest ID init ─────────────────────────────────────────────────────────

  useEffect(() => {
    let id = localStorage.getItem('qs_guest_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('qs_guest_id', id);
    }
    guestIdRef.current = id;
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (loadedYears.current.has(activeYear)) {
      setLoading(false);
      return;
    }
    loadedYears.current.add(activeYear);
    setLoading(true);

    fetch(`/api/budget-plan?years=${activeYear}`, {
      headers: guestIdRef.current ? { 'X-Guest-Id': guestIdRef.current } : {},
    })
      .then(r => r.json())
      .then(json => {
        const doc = normalizePlan(json.data?.[0]);
        setPlans(prev => ({ ...prev, [activeYear]: doc ?? emptyPlan(activeYear) }));
      })
      .catch(() => {
        setPlans(prev => ({ ...prev, [activeYear]: emptyPlan(activeYear) }));
      })
      .finally(() => setLoading(false));
  }, [activeYear, fetchTrigger]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const doSave = useCallback(async (plan: BudgetPlanDoc) => {
    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (guestIdRef.current) headers['X-Guest-Id'] = guestIdRef.current;
      await fetch('/api/budget-plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ year: plan.year, categories: plan.categories, incomes: plan.incomes }),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      // silent — will retry on next edit
    } finally {
      setSaving(false);
    }
  }, []);

  function scheduleSave(plan: BudgetPlanDoc) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(plan), 600);
  }

  function updatePlan(updater: (p: BudgetPlanDoc) => BudgetPlanDoc) {
    setPlans(prev => {
      const current = prev[activeYear] ?? emptyPlan(activeYear);
      const updated = updater({ ...current, year: activeYear });
      scheduleSave(updated);
      return { ...prev, [activeYear]: updated };
    });
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const plan = plans[activeYear] ?? emptyPlan(activeYear);
  const income = plan.incomes[activeMonth] ?? 0;
  const totalBudgeted = plan.categories.reduce(
    (s, cat) => s + cat.items.reduce((ss, item) => ss + (item.amounts[activeMonth] ?? 0), 0),
    0
  );
  const remaining = income - totalBudgeted;
  const allocPct = income > 0 ? Math.min(100, Math.round((totalBudgeted / income) * 100)) : 0;

  function catTotal(cat: BudgetCategory) {
    return cat.items.reduce((s, item) => s + (item.amounts[activeMonth] ?? 0), 0);
  }

  const reloadAfterMigration = useCallback(() => {
    loadedYears.current.clear();
    setPlans({});
    setFetchTrigger(t => t + 1);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function setIncome(val: number) {
    updatePlan(p => {
      const incomes = [...p.incomes];
      incomes[activeMonth] = val;
      return { ...p, incomes };
    });
  }

  function setItemAmount(catId: string, itemId: string, val: number) {
    updatePlan(p => ({
      ...p,
      categories: p.categories.map(cat =>
        cat.id !== catId ? cat : {
          ...cat,
          items: cat.items.map(item =>
            item.id !== itemId ? item : {
              ...item,
              amounts: item.amounts.map((a, i) => (i === activeMonth ? val : a)),
            }
          ),
        }
      ),
    }));
  }

  function addCategory() {
    if (!newCatName.trim()) return;
    const cat: BudgetCategory = {
      id: nanoid(),
      name: newCatName.trim(),
      color: newCatColor,
      order: plan.categories.length,
      items: [],
    };
    updatePlan(p => ({ ...p, categories: [...p.categories, cat] }));
    setNewCatName('');
    setNewCatColor('blue');
    setShowAddCat(false);
  }

  function deleteCategory(catId: string) {
    updatePlan(p => ({ ...p, categories: p.categories.filter(c => c.id !== catId) }));
  }

  function renameCategory(catId: string, name: string) {
    if (!name.trim()) return;
    updatePlan(p => ({
      ...p,
      categories: p.categories.map(c => (c.id === catId ? { ...c, name: name.trim() } : c)),
    }));
  }

  function addItem(catId: string) {
    if (!newItemName.trim()) return;
    const item: BudgetItem = {
      id: nanoid(),
      name: newItemName.trim(),
      order: plan.categories.find(c => c.id === catId)?.items.length ?? 0,
      amounts: Array(12).fill(0) as number[],
    };
    updatePlan(p => ({
      ...p,
      categories: p.categories.map(c =>
        c.id !== catId ? c : { ...c, items: [...c.items, item] }
      ),
    }));
    setNewItemName('');
    setAddingItemFor(null);
  }

  function deleteItem(catId: string, itemId: string) {
    updatePlan(p => ({
      ...p,
      categories: p.categories.map(c =>
        c.id !== catId ? c : { ...c, items: c.items.filter(i => i.id !== itemId) }
      ),
    }));
  }

  function renameItem(catId: string, itemId: string, name: string) {
    if (!name.trim()) return;
    updatePlan(p => ({
      ...p,
      categories: p.categories.map(c =>
        c.id !== catId ? c : {
          ...c,
          items: c.items.map(i => (i.id === itemId ? { ...i, name: name.trim() } : i)),
        }
      ),
    }));
  }

  function toggleCollapse(catId: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(catId)) { next.delete(catId); } else { next.add(catId); }
      return next;
    });
  }

  function handleYearChange(delta: number) {
    setActiveYear(y => y + delta);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#080808]">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5">

        {/* ── Year nav + save status ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleYearChange(-1)}
              className="p-1.5 rounded-lg hover:bg-[#eee] dark:hover:bg-[#1a1a1a] transition-colors text-[#666] dark:text-[#555]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-sm font-semibold text-[#111] dark:text-white tabular-nums">
              {activeYear}
            </span>
            <button
              onClick={() => handleYearChange(1)}
              className="p-1.5 rounded-lg hover:bg-[#eee] dark:hover:bg-[#1a1a1a] transition-colors text-[#666] dark:text-[#555]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {(activeYear !== nowYear || activeMonth !== nowMonth) && (
              <button
                onClick={() => { setActiveYear(nowYear); setActiveMonth(nowMonth); }}
                className="ml-1 px-2 py-1 rounded-full text-[10px] font-medium bg-[#0a0a0a] text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity"
              >
                Today
              </button>
            )}
          </div>
          <span className={`text-xs transition-opacity duration-300 ${saving || savedFlash ? 'opacity-100' : 'opacity-0'}`}>
            {saving
              ? <span className="text-[#aaa] dark:text-[#555]">Saving…</span>
              : <span className="text-emerald-500 font-medium">✓ Saved</span>
            }
          </span>
        </div>

        {/* ── Month strip ── */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setActiveMonth(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                i === activeMonth
                  ? 'bg-[#0a0a0a] text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-[#777] hover:text-[#111] hover:bg-[#eee] dark:text-[#555] dark:hover:text-white dark:hover:bg-[#1a1a1a]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-3 gap-3">
          <IncomeCard income={income} onSave={setIncome} />

          <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4">
            <p className="text-[10px] font-medium text-[#aaa] dark:text-[#555] uppercase tracking-wider mb-2">Budgeted</p>
            <p className="text-base font-bold text-[#111] dark:text-white leading-none">
              {totalBudgeted > 0 ? fmtINR(totalBudgeted) : <span className="text-[#ccc] dark:text-[#333]">—</span>}
            </p>
            {income > 0 && totalBudgeted > 0 && (
              <p className="text-[10px] text-[#aaa] dark:text-[#555] mt-1">{allocPct}% of income</p>
            )}
          </div>

          <div className={`rounded-xl p-4 border transition-colors ${
            income === 0 || totalBudgeted === 0
              ? 'bg-white dark:bg-[#0d0d0d] border-[#e8e8e8] dark:border-[#1f1f1f]'
              : remaining >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
          }`}>
            <p className="text-[10px] font-medium text-[#aaa] dark:text-[#555] uppercase tracking-wider mb-2">Remaining</p>
            <p className={`text-base font-bold leading-none ${
              income === 0 || totalBudgeted === 0
                ? 'text-[#ccc] dark:text-[#333]'
                : remaining >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-500'
            }`}>
              {income === 0 || totalBudgeted === 0 ? '—' : fmtINR(Math.abs(remaining))}
            </p>
            {income > 0 && totalBudgeted > 0 && remaining < 0 && (
              <p className="text-[10px] text-rose-400 mt-1">Over budget</p>
            )}
          </div>
        </div>

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl bg-[#f0f0f0] dark:bg-[#111] animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && plan.categories.length === 0 && !showAddCat && (
          <div className="text-center py-12 space-y-3">
            <p className="text-2xl">📊</p>
            <p className="text-sm font-medium text-[#555] dark:text-[#666]">No categories yet</p>
            <p className="text-xs text-[#aaa] dark:text-[#444]">
              Add categories like Investment, Essentials, or Wants to start planning.
            </p>
          </div>
        )}

        {/* ── Category cards ── */}
        {!loading && (
          <div className="space-y-3">
            {[...plan.categories].sort((a, b) => a.order - b.order).map(cat => {
              const meta = COLOR_MAP[cat.color] ?? COLOR_MAP.blue;
              const total = catTotal(cat);
              const pct = income > 0 ? Math.min(100, Math.round((total / income) * 100)) : 0;
              const isCollapsed = collapsed.has(cat.id);

              return (
                <div
                  key={cat.id}
                  className={`group/card bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl overflow-hidden border-l-[3px] ${meta.border}`}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    {/* Category name */}
                    <div className="flex-1 min-w-0">
                      {renamingCat === cat.id ? (
                        <input
                          autoFocus
                          defaultValue={cat.name}
                          maxLength={80}
                          className="w-full bg-transparent text-sm font-semibold text-[#111] dark:text-white border-b border-[#ddd] dark:border-[#333] outline-none pb-0.5"
                          onBlur={e => { renameCategory(cat.id, e.target.value); setRenamingCat(null); }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { renameCategory(cat.id, e.currentTarget.value); setRenamingCat(null); }
                            if (e.key === 'Escape') setRenamingCat(null);
                          }}
                        />
                      ) : (
                        <button
                          className={`text-sm font-semibold truncate max-w-full text-left ${meta.text}`}
                          onDoubleClick={() => setRenamingCat(cat.id)}
                          onClick={() => toggleCollapse(cat.id)}
                          title="Click to expand/collapse · Double-click to rename"
                        >
                          {cat.name}
                        </button>
                      )}
                    </div>

                    {/* Total */}
                    <span className="text-sm font-medium text-[#555] dark:text-[#666] flex-shrink-0 tabular-nums">
                      {total > 0 ? fmtINR(total) : <span className="text-[#ccc] dark:text-[#333]">—</span>}
                    </span>

                    {/* % badge */}
                    {income > 0 && total > 0 && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${meta.bg} ${meta.text}`}>
                        {pct}%
                      </span>
                    )}

                    {/* Delete — shown on hover */}
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="opacity-0 group-hover/card:opacity-100 p-1.5 rounded-lg text-[#ccc] dark:text-[#444] hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all flex-shrink-0"
                      title="Delete category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleCollapse(cat.id)}
                      className="p-1.5 rounded-lg text-[#bbb] dark:text-[#444] hover:bg-[#f0f0f0] dark:hover:bg-[#1a1a1a] transition-colors flex-shrink-0"
                    >
                      {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Allocation bar */}
                  {income > 0 && total > 0 && (
                    <div className="h-0.5 mx-4 rounded-full bg-[#f0f0f0] dark:bg-[#1a1a1a] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* Items list */}
                  {!isCollapsed && (
                    <div className="px-4 pb-3 pt-2 space-y-0.5">
                      {[...cat.items].sort((a, b) => a.order - b.order).map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          activeMonth={activeMonth}
                          isRenaming={renamingItem?.catId === cat.id && renamingItem.itemId === item.id}
                          onStartRename={() => setRenamingItem({ catId: cat.id, itemId: item.id })}
                          onRename={name => { renameItem(cat.id, item.id, name); setRenamingItem(null); }}
                          onCancelRename={() => setRenamingItem(null)}
                          onAmountChange={val => setItemAmount(cat.id, item.id, val)}
                          onDelete={() => deleteItem(cat.id, item.id)}
                        />
                      ))}

                      {/* Add item inline */}
                      {addingItemFor === cat.id ? (
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            autoFocus
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            placeholder="Item name…"
                            maxLength={80}
                            className="flex-1 text-sm bg-[#f5f5f5] dark:bg-[#151515] border border-[#e0e0e0] dark:border-[#222] rounded-lg px-3 py-1.5 outline-none focus:border-[#bbb] dark:focus:border-[#444] text-[#111] dark:text-white placeholder-[#bbb] dark:placeholder-[#444]"
                            onKeyDown={e => {
                              if (e.key === 'Enter') addItem(cat.id);
                              if (e.key === 'Escape') { setAddingItemFor(null); setNewItemName(''); }
                            }}
                          />
                          <button
                            onClick={() => addItem(cat.id)}
                            className="p-1.5 rounded-lg bg-[#111] dark:bg-white text-white dark:text-black hover:opacity-75 transition-opacity"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setAddingItemFor(null); setNewItemName(''); }}
                            className="p-1.5 rounded-lg hover:bg-[#f0f0f0] dark:hover:bg-[#1a1a1a] text-[#aaa] transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingItemFor(cat.id); setNewItemName(''); }}
                          className={`flex items-center gap-1.5 text-xs transition-colors mt-1 pt-1 ${meta.text} opacity-60 hover:opacity-100`}
                        >
                          <Plus className="h-3 w-3" />
                          Add item
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Add Category ── */}
            {!loading && showAddCat ? (
              <div className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4 space-y-3">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. Essentials)"
                  maxLength={80}
                  className="w-full text-sm bg-[#f5f5f5] dark:bg-[#151515] border border-[#e0e0e0] dark:border-[#222] rounded-lg px-3 py-2 outline-none focus:border-[#bbb] dark:focus:border-[#444] text-[#111] dark:text-white placeholder-[#bbb] dark:placeholder-[#444]"
                  onKeyDown={e => {
                    if (e.key === 'Enter') addCategory();
                    if (e.key === 'Escape') { setShowAddCat(false); setNewCatName(''); }
                  }}
                />
                {/* Color swatches */}
                <div className="flex items-center gap-2">
                  {COLOR_ORDER.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      className={`w-5 h-5 rounded-full transition-all ${COLOR_MAP[c].swatch} ${
                        newCatColor === c
                          ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0d0d0d] ring-current scale-110'
                          : 'opacity-50 hover:opacity-80'
                      }`}
                      title={c}
                    />
                  ))}
                  <div className="flex-1" />
                  <button
                    onClick={addCategory}
                    disabled={!newCatName.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#111] dark:bg-white text-white dark:text-black text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-30"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddCat(false); setNewCatName(''); }}
                    className="px-3 py-1.5 rounded-lg text-xs text-[#aaa] hover:bg-[#f0f0f0] dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : !loading && (
              <button
                onClick={() => setShowAddCat(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#ddd] dark:border-[#222] rounded-xl text-sm text-[#aaa] dark:text-[#444] hover:border-[#bbb] dark:hover:border-[#333] hover:text-[#666] dark:hover:text-[#888] transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            )}
          </div>
        )}
      </div>
      {!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && (
        <GuestMigration guestIdRef={guestIdRef} onMigrated={reloadAfterMigration} />
      )}
    </div>
  );
}

// ─── IncomeCard ───────────────────────────────────────────────────────────────

function IncomeCard({ income, onSave }: { income: number; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  function startEdit() {
    setVal(income > 0 ? String(income) : '');
    setEditing(true);
  }

  function commit() {
    onSave(parseAmount(val));
    setEditing(false);
  }

  return (
    <div
      className="bg-white dark:bg-[#0d0d0d] border border-[#e8e8e8] dark:border-[#1f1f1f] rounded-xl p-4 cursor-pointer hover:border-[#ccc] dark:hover:border-[#333] transition-colors"
      onClick={() => !editing && startEdit()}
    >
      <p className="text-[10px] font-medium text-[#aaa] dark:text-[#555] uppercase tracking-wider mb-2">Income</p>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Tab') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="0"
          className="w-full bg-transparent text-base font-bold text-[#111] dark:text-white outline-none border-b border-[#ccc] dark:border-[#444] pb-0.5"
        />
      ) : (
        <p className="text-base font-bold leading-none text-[#111] dark:text-white">
          {income > 0 ? fmtINR(income) : <span className="text-[#ccc] dark:text-[#333] text-sm font-medium">Click to set</span>}
        </p>
      )}
    </div>
  );
}

// ─── ItemRow ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: BudgetItem;
  activeMonth: number;
  isRenaming: boolean;
  onStartRename: () => void;
  onRename: (name: string) => void;
  onCancelRename: () => void;
  onAmountChange: (val: number) => void;
  onDelete: () => void;
}

function ItemRow({
  item, activeMonth, isRenaming,
  onStartRename, onRename, onCancelRename,
  onAmountChange, onDelete,
}: ItemRowProps) {
  const amount = item.amounts[activeMonth] ?? 0;

  return (
    <div className="group/item flex items-center gap-3 py-1.5 rounded-lg px-2 -mx-2 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors">
      {/* Name */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            autoFocus
            defaultValue={item.name}
            maxLength={80}
            className="w-full bg-transparent text-sm text-[#111] dark:text-white border-b border-[#ddd] dark:border-[#333] outline-none pb-0.5"
            onBlur={e => onRename(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRename(e.currentTarget.value);
              if (e.key === 'Escape') onCancelRename();
            }}
          />
        ) : (
          <span
            className="text-sm text-[#555] dark:text-[#999] cursor-default select-none"
            onDoubleClick={onStartRename}
            title="Double-click to rename"
          >
            {item.name}
          </span>
        )}
      </div>

      {/* Amount */}
      <AmountCell value={amount} onChange={onAmountChange} />

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover/item:opacity-100 p-1 rounded text-[#ccc] dark:text-[#444] hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all flex-shrink-0"
        title="Delete item"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── AmountCell ───────────────────────────────────────────────────────────────

function AmountCell({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  function startEdit() {
    setVal(value > 0 ? String(value) : '');
    setEditing(true);
  }

  function commit() {
    onChange(parseAmount(val));
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'Tab') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        placeholder="0"
        className="w-28 text-right text-sm font-medium bg-[#f5f5f5] dark:bg-[#151515] border border-[#ddd] dark:border-[#333] rounded-lg px-2 py-1 outline-none focus:border-[#aaa] dark:focus:border-[#555] text-[#111] dark:text-white"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className={`w-28 text-right text-sm font-medium rounded-lg px-2 py-1 transition-colors tabular-nums ${
        value > 0
          ? 'text-[#111] dark:text-white hover:bg-[#f0f0f0] dark:hover:bg-[#151515]'
          : 'text-[#ccc] dark:text-[#444] hover:text-[#888] dark:hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#151515]'
      }`}
    >
      {value > 0 ? fmtINR(value) : '+ Add'}
    </button>
  );
}
