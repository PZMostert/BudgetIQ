import { useState, useEffect, useMemo } from "react";
import type { FC } from "react";
import { CATEGORY_COLORS } from "../services/categorizer";
import { getTransactions } from "../storage/localStorage";
import { getBudgetLimits, saveBudgetLimits } from "../storage/budgetSupabaseStorage";
import type { BudgetLimits } from "../storage/budgetSupabaseStorage";
import type { Transaction } from "../types";

// ── Logo ───────────────────────────────────────────────────────────────────────
const BudgetIQLogo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" rx="80" fill="#0f0f0f"/>
    <g opacity="0.07">
      <line x1="0" y1="80" x2="400" y2="80" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="0" y1="160" x2="400" y2="160" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="0" y1="240" x2="400" y2="240" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="0" y1="320" x2="400" y2="320" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="80" y1="0" x2="80" y2="400" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="160" y1="0" x2="160" y2="400" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="240" y1="0" x2="240" y2="400" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="320" y1="0" x2="320" y2="400" stroke="#f59e0b" strokeWidth="1"/>
    </g>
    <rect x="53" y="250" width="48" height="90" rx="6" fill="#f59e0b" opacity="0.3"/>
    <rect x="117" y="190" width="48" height="150" rx="6" fill="#f59e0b" opacity="0.5"/>
    <rect x="181" y="140" width="48" height="200" rx="6" fill="#f59e0b" opacity="0.75"/>
    <rect x="245" y="100" width="48" height="240" rx="6" fill="#f59e0b"/>
    <rect x="309" y="160" width="48" height="180" rx="6" fill="#f59e0b" opacity="0.5"/>
    <polyline points="77,245 141,185 205,135 269,95 333,155" fill="none" stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="77" cy="245" r="5" fill="#fcd34d"/>
    <circle cx="141" cy="185" r="5" fill="#fcd34d"/>
    <circle cx="205" cy="135" r="5" fill="#fcd34d"/>
    <circle cx="269" cy="95" r="7" fill="#fcd34d" stroke="#0f0f0f" strokeWidth="2"/>
    <circle cx="333" cy="155" r="5" fill="#fcd34d"/>
    <rect width="400" height="400" rx="80" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.4"/>
    <rect x="18" y="18" width="52" height="26" rx="6" fill="#f59e0b" opacity="0.15"/>
    <text x="44" y="35" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fontWeight="700" fill="#fcd34d" letterSpacing="1">IQ</text>
  </svg>
);

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  "R " + Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Builds a YYYY-MM-DD string from LOCAL date parts, avoiding the off-by-one
// that toISOString() can introduce (it converts to UTC first, which shifts
// the date backward a day for any timezone ahead of UTC, e.g. SAST/UTC+2).
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Boundaries of a calendar month, used only for the quick-jump buttons below
// — the actual filter range is always the free-form dateFrom/dateTo, so
// this is just a convenience shortcut, not a constraint. Accepts either
// "YYYY/MM" (currentMonthKey's format) or "YYYY-MM" (availableMonths' format,
// derived elsewhere from transaction dates) since both appear in this file.
const monthBounds = (monthKey: string): { from: string; to: string } => {
  const [y, m] = monthKey.split(/[-/]/).map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0); // day 0 of next month = last day of this month
  return { from: toISO(from), to: toISO(to) };
};

type StatusLevel = "safe" | "warning" | "over";

function getStatus(spent: number, limit: number): StatusLevel {
  const pct = spent / limit;
  if (pct >= 1) return "over";
  if (pct >= 0.8) return "warning";
  return "safe";
}

const STATUS_COLORS: Record<StatusLevel, string> = {
  safe: "#34d399", warning: "#fbbf24", over: "#f87171",
};
const STATUS_BG: Record<StatusLevel, string> = {
  safe: "bg-emerald-400/10 border-emerald-400/20",
  warning: "bg-yellow-400/10 border-yellow-400/20",
  over: "bg-red-400/10 border-red-400/20",
};
const STATUS_TEXT: Record<StatusLevel, string> = {
  safe: "text-emerald-400", warning: "text-yellow-400", over: "text-red-400",
};

// ── component ─────────────────────────────────────────────────────────────────
const Budget: FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [limits, setLimits] = useState<BudgetLimits>({ totalMonthly: null, categories: {} });
  const [loading, setLoading] = useState(true);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [dateFrom, setDateFrom] = useState<string>(() => monthBounds(currentMonthKey()).from);
  const [dateTo, setDateTo] = useState<string>(() => monthBounds(currentMonthKey()).to);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [txs, lim] = await Promise.all([
        getTransactions(),
        getBudgetLimits(),
      ]);
      setTransactions(txs);
      setLimits(lim);
      setLoading(false);
    }
    load();
  }, []);

  const monthlySpend = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => {
        const norm = t.date.replace(/\//g, "-");
        if (dateFrom && norm < dateFrom) return false;
        if (dateTo && norm > dateTo) return false;
        return t.amount < 0 && t.category !== "Savings";
      })
      .forEach((t) => {
        map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
      });
    return map;
  }, [transactions, dateFrom, dateTo]);

  const totalSpentThisMonth = Object.values(monthlySpend).reduce((s, v) => s + v, 0);

  const allCategories = useMemo(() => {
    const fromSpend = Object.keys(monthlySpend);
    const fromLimits = Object.keys(limits.categories);
    return Array.from(new Set([...fromSpend, ...fromLimits])).sort();
  }, [monthlySpend, limits.categories]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      const norm = t.date.replace(/\//g, "-");
      set.add(norm.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const saveTotal = async () => {
    const val = parseFloat(totalInput.replace(/[^0-9.]/g, ""));
    const updated = { ...limits, totalMonthly: isNaN(val) ? null : val };
    setLimits(updated);
    await saveBudgetLimits(updated);
    setEditingTotal(false);
    setTotalInput("");
  };

  const saveCategoryLimit = async (cat: string) => {
    const val = parseFloat(categoryInput.replace(/[^0-9.]/g, ""));
    const updated = {
      ...limits,
      categories: { ...limits.categories, [cat]: isNaN(val) ? 0 : val },
    };
    setLimits(updated);
    await saveBudgetLimits(updated);
    setEditingCategory(null);
    setCategoryInput("");
  };

  const removeCategoryLimit = async (cat: string) => {
    const cats = { ...limits.categories };
    delete cats[cat];
    const updated = { ...limits, categories: cats };
    setLimits(updated);
    await saveBudgetLimits(updated);
  };

  const clearTotal = async () => {
    const updated = { ...limits, totalMonthly: null };
    setLimits(updated);
    await saveBudgetLimits(updated);
  };

  const totalStatus = limits.totalMonthly ? getStatus(totalSpentThisMonth, limits.totalMonthly) : "safe";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-6 font-sans">

      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <BudgetIQLogo size={44} />
          <div>
            <h1 className="text-3xl font-bold text-amber-500 dark:text-amber-400 tracking-tight">Budget Tracker</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Set limits and track your spending</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          {availableMonths.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Jump to month</label>
              <div className="flex gap-2 flex-wrap max-w-xs">
                {availableMonths.map((m) => {
                  const bounds = monthBounds(m);
                  const isActive = dateFrom === bounds.from && dateTo === bounds.to;
                  return (
                    <button key={m} onClick={() => { setDateFrom(bounds.from); setDateTo(bounds.to); }}
                      className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                        isActive
                          ? "bg-indigo-900/40 border-indigo-700 text-indigo-300"
                          : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-indigo-500"
                      }`}>
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {transactions.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 mb-6 text-sm text-yellow-300">
          No transaction data yet — upload a CSV on the Dashboard first.
        </div>
      )}

      {/* ── total monthly budget ── */}
      <div className={`rounded-xl border p-5 mb-6 ${limits.totalMonthly ? STATUS_BG[totalStatus] : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium mb-1">
              Total Budget · {new Date(dateFrom + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
              {" – "}
              {new Date(dateTo + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
            </p>
            {limits.totalMonthly ? (
              <p className={`text-3xl font-bold ${STATUS_TEXT[totalStatus]}`}>
                {fmt(totalSpentThisMonth)}
                <span className="text-lg text-gray-500 dark:text-gray-400 font-normal"> / {fmt(limits.totalMonthly)}</span>
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">No limit set</p>
            )}
          </div>
          <div className="flex gap-2">
            {!editingTotal ? (
              <>
                <button
                  onClick={() => { setEditingTotal(true); setTotalInput(limits.totalMonthly?.toString() ?? ""); }}
                  className="bg-gray-100 dark:bg-gray-800 hover:bg-indigo-700 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                  {limits.totalMonthly ? "Edit" : "Set limit"}
                </button>
                {limits.totalMonthly && (
                  <button onClick={clearTotal}
                    className="bg-gray-100 dark:bg-gray-800 hover:bg-red-900/60 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                    Remove
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-2 items-center">
                <input type="number" value={totalInput} onChange={(e) => setTotalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTotal()} placeholder="e.g. 15000" autoFocus
                  className="bg-gray-100 dark:bg-gray-800 border border-indigo-500 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                <button onClick={saveTotal} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">Save</button>
                <button onClick={() => setEditingTotal(false)} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-2 rounded-lg transition-colors">Cancel</button>
              </div>
            )}
          </div>
        </div>

        {limits.totalMonthly && (
          <>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalSpentThisMonth / limits.totalMonthly) * 100, 100)}%`, backgroundColor: STATUS_COLORS[totalStatus] }}/>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{Math.round((totalSpentThisMonth / limits.totalMonthly) * 100)}% used</span>
              <span>{fmt(Math.max(limits.totalMonthly - totalSpentThisMonth, 0))} remaining</span>
            </div>
            {totalStatus === "over" && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm font-medium">
                <span>⚠</span>
                <span>You've exceeded your budget for this period by {fmt(totalSpentThisMonth - limits.totalMonthly)}</span>
              </div>
            )}
            {totalStatus === "warning" && (
              <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm font-medium">
                <span>⚠</span>
                <span>You've used 80%+ of your budget for this period</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── category limits ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Category Limits</h2>
          <button onClick={() => { setEditingCategory("__new__"); setCategoryInput(""); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            + Add limit
          </button>
        </div>

        {editingCategory === "__new__" && (
          <NewCategoryRow
            categories={allCategories}
            existingLimits={limits.categories}
            onSave={async (cat, val) => {
              const updated = { ...limits, categories: { ...limits.categories, [cat]: val } };
              setLimits(updated);
              await saveBudgetLimits(updated);
              setEditingCategory(null);
            }}
            onCancel={() => setEditingCategory(null)}
          />
        )}

        {allCategories.length === 0 && editingCategory !== "__new__" && (
          <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            No categories found. Upload a CSV on the Dashboard first, then set limits here.
          </div>
        )}

        <div className="divide-y divide-gray-200/60 dark:divide-gray-800/60">
          {allCategories.map((cat) => {
            const spent = monthlySpend[cat] ?? 0;
            const limit = limits.categories[cat];
            const hasLimit = limit != null && limit > 0;
            const status: StatusLevel = hasLimit ? getStatus(spent, limit) : "safe";
            const pct = hasLimit ? Math.min((spent / limit) * 100, 100) : 0;

            return (
              <div key={cat} className="px-5 py-4">
                {editingCategory === cat ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-40">{cat}</span>
                    <input type="number" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveCategoryLimit(cat)}
                      placeholder="e.g. 2000" autoFocus
                      className="bg-gray-100 dark:bg-gray-800 border border-indigo-500 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    <button onClick={() => saveCategoryLimit(cat)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Save</button>
                    <button onClick={() => setEditingCategory(null)} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#6b7280" }}/>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cat}</span>
                        {hasLimit && status !== "safe" && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            status === "over" ? "bg-red-900/40 text-red-400" : "bg-yellow-900/40 text-yellow-400"
                          }`}>
                            {status === "over" ? "Over limit" : "Near limit"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {fmt(spent)}{hasLimit && <span className="text-gray-400 dark:text-gray-500"> / {fmt(limit)}</span>}
                        </span>
                        <button onClick={() => { setEditingCategory(cat); setCategoryInput(limit?.toString() ?? ""); }}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-400 transition-colors">
                          {hasLimit ? "Edit" : "Set limit"}
                        </button>
                        {hasLimit && (
                          <button onClick={() => removeCategoryLimit(cat)}
                            className="text-xs text-gray-500 dark:text-gray-600 hover:text-red-400 transition-colors">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      {hasLimit ? (
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] }}/>
                      ) : (
                        <div className="h-full rounded-full opacity-30"
                          style={{ width: "100%", backgroundColor: CATEGORY_COLORS[cat] ?? "#6b7280" }}/>
                      )}
                    </div>
                    {hasLimit && (
                      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <span>{Math.round(pct)}% used</span>
                        {spent <= limit
                          ? <span>{fmt(limit - spent)} remaining</span>
                          : <span className="text-red-400">Over by {fmt(spent - limit)}</span>
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── NewCategoryRow ────────────────────────────────────────────────────────────
interface NewCategoryRowProps {
  categories: string[];
  existingLimits: Record<string, number>;
  onSave: (cat: string, val: number) => void;
  onCancel: () => void;
}

const NewCategoryRow: FC<NewCategoryRowProps> = ({ categories, existingLimits, onSave, onCancel }) => {
  const [cat, setCat] = useState("");
  const [val, setVal] = useState("");
  const available = categories.filter((c) => !existingLimits[c] || existingLimits[c] === 0);

  const handleSave = () => {
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    if (!cat || isNaN(num) || num <= 0) return;
    onSave(cat, num);
  };

  return (
    <div className="px-5 py-4 bg-gray-100/40 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3">
      <select value={cat} onChange={(e) => setCat(e.target.value)} autoFocus
        className="bg-gray-100 dark:bg-gray-800 border border-indigo-500 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="">Select category…</option>
        {available.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="Limit (R)"
        className="bg-gray-100 dark:bg-gray-800 border border-indigo-500 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
      <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Add</button>
      <button onClick={onCancel} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
    </div>
  );
};

export default Budget;