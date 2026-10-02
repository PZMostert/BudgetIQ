import { useState, useEffect, useMemo } from "react";
import type { FC } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import { parseCSV, BANK_INFO } from "../services/parser";
import type { DetectedBank } from "../services/parser";
import { parsePDF } from "../services/pdfParser";
import { saveTransactions, getTransactions, clearTransactions } from "../storage/supabaseStorage";
import { aiCategorize, saveAICategoryMap, getAICategoryMap, clearAICategoryMap } from "../services/aiCategorizer";
import { getIsPro, setIsPro } from "../storage/proStorage";
import { useAuth } from "../context/AuthContext";
import type { Transaction, Category } from "../types";
import { CATEGORY_COLORS, categorizeTransaction } from "../services/categorizer";

const fmt = (n: number) =>
  "R " + Math.abs(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tooltipFormatter = (value: any) => fmt(Number(value ?? 0));

// Categories that rule-based logic should always win — AI cannot override these
const RULE_PRIORITY_CATEGORIES: Category[] = ["Savings", "Transfer In"];

const Dashboard: FC = () => {
  const { user, signOut } = useAuth();

  const [transactions, setTransactions]   = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [dateFrom, setDateFrom]           = useState<string>("");
  const [dateTo, setDateTo]               = useState<string>("");
  const [parseError, setParseError]       = useState<string | null>(null);
  const [isPro, setIsProState]            = useState<boolean>(getIsPro());
  const [aiLoading, setAiLoading]         = useState<boolean>(false);
  const [aiError, setAiError]             = useState<string | null>(null);
  const [aiMap, setAiMap]                 = useState<Record<string, string>>(getAICategoryMap());
  const [showProModal, setShowProModal]   = useState<boolean>(false);
  const [detectedBank, setDetectedBank]   = useState<DetectedBank | null>(null);
  const [bankWarning, setBankWarning]     = useState<string | null>(null);
  const [showBanksModal, setShowBanksModal] = useState<boolean>(false);
  const [showFilters, setShowFilters]     = useState<boolean>(false);

  useEffect(() => {
    getTransactions().then(setTransactions);
  }, []);

  const transactionsWithAI = useMemo(() => {
    if (!isPro || Object.keys(aiMap).length === 0) return transactions;
    return transactions.map(t => {
      if (RULE_PRIORITY_CATEGORIES.includes(t.category as Category)) return t;
      return { ...t, category: (aiMap[t.description] ?? t.category) as Category };
    });
  }, [transactions, aiMap, isPro]);

  const togglePro = (val: boolean) => {
    setIsPro(val);
    setIsProState(val);
    if (!val) { clearAICategoryMap(); setAiMap({}); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null); setAiError(null); setBankWarning(null);
    try {
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      const result = isPdf ? await parsePDF(file) : await parseCSV(file);
      setDetectedBank(result.bank as DetectedBank);
      if (result.error) { setParseError(result.error); return; }
      if (result.warning) setBankWarning(result.warning);
      if (result.transactions.length === 0) {
        if (!result.error && !result.warning)
          setParseError("No transactions found. Check that the file has Date, Amount, and Description columns.");
        return;
      }

      // Always apply rule-based categorization first (works for all users)
      const mapped = result.transactions.map((t: Transaction) => ({
        ...t,
        category: categorizeTransaction(t.description) as Category,
      }));

      if (isPro) {
        setAiLoading(true);
        try {
          const descriptions = mapped.map((t: Transaction) => t.description);
          const map = await aiCategorize(descriptions);
          saveAICategoryMap(map); setAiMap(map);
          // Rule-priority categories (Savings, Transfer In) cannot be overridden by AI
          const withAI = mapped.map((t: Transaction) => {
            if (RULE_PRIORITY_CATEGORIES.includes(t.category as Category)) return t;
            return { ...t, category: (map[t.description] ?? t.category) as Category };
          });
          setTransactions(withAI); void saveTransactions(withAI);
        } catch {
          setAiError("AI categorization failed — falling back to standard categories.");
          setTransactions(mapped); void saveTransactions(mapped);
        } finally { setAiLoading(false); }
      } else {
        setTransactions(mapped); void saveTransactions(mapped);
      }
    } catch (err) { setParseError("Failed to read the file: " + String(err)); }
  };

  const handleRecategorize = async () => {
    if (!isPro || transactions.length === 0) return;
    setAiLoading(true); setAiError(null);
    try {
      const descriptions = transactions.map(t => t.description);
      const map = await aiCategorize(descriptions);
      saveAICategoryMap(map); setAiMap(map);
      const withAI = transactions.map(t => {
        if (RULE_PRIORITY_CATEGORIES.includes(t.category as Category)) return t;
        return { ...t, category: (map[t.description] ?? t.category) as Category };
      });
      setTransactions(withAI); void saveTransactions(withAI);
    } catch { setAiError("AI categorization failed. Please try again."); }
    finally { setAiLoading(false); }
  };

  const handleClear = () => {
    void clearTransactions(); clearAICategoryMap();
    setTransactions([]); setAiMap({}); setSelectedCategory("All");
    setDateFrom(""); setDateTo(""); setDetectedBank(null); setBankWarning(null);
  };

  const filtered = useMemo(() => {
    return transactionsWithAI.filter((t) => {
      if (selectedCategory !== "All" && t.category !== selectedCategory) return false;
      const normDate = t.date.replace(/\//g, "-");
      if (dateFrom && normDate < dateFrom) return false;
      if (dateTo   && normDate > dateTo)   return false;
      return true;
    });
  }, [transactionsWithAI, selectedCategory, dateFrom, dateTo]);

  const income  = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const savings = filtered.filter(t => t.category === "Savings").reduce((s, t) => s + Math.abs(t.amount), 0);
  const spent   = filtered.filter(t => t.amount < 0 && t.category !== "Savings").reduce((s, t) => s + Math.abs(t.amount), 0);
  const net     = income - spent - savings;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(t => t.amount < 0 && t.category !== "Savings")
      .forEach(t => { map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const totalSpentForPct = categoryTotals.reduce((s, c) => s + c.value, 0);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; spent: number; income: number }> = {};
    filtered.forEach(t => {
      const key = t.date.replace(/\//g, "-").substring(0, 7);
      if (!map[key]) map[key] = { month: key, spent: 0, income: 0 };
      if (t.amount < 0 && t.category !== "Savings") map[key].spent += Math.abs(t.amount);
      if (t.amount > 0) map[key].income += t.amount;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const availableCategories = useMemo<Array<Category | "All">>(() => {
    const cats = Array.from(new Set(transactionsWithAI.map(t => t.category))) as Category[];
    return ["All", ...cats.sort()];
  }, [transactionsWithAI]);

  const applyPreset = (months: number) => {
    const to = new Date(); const from = new Date();
    from.setMonth(from.getMonth() - months);
    const fmtDate = (d: Date) => d.toISOString().split("T")[0];
    setDateFrom(fmtDate(from)); setDateTo(fmtDate(to));
  };

  const getCatColor = (name: string): string => {
    if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 60%, 60%)`;
  };

  const hasActiveFilter = dateFrom || dateTo || selectedCategory !== "All";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans pt-0 md:pt-0 pb-20 md:pb-0">
      <div className="p-4 md:p-6">

        {/* ── Pro modal ── */}
        {showProModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚡</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">BudgetIQ Pro</h2>
                <span className="ml-auto text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">R79/mo</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Pro uses AI to automatically understand and categorize your transactions — no matter which bank you use.</p>
              <ul className="space-y-2 mb-6">
                {["AI categorization — works for any bank","Re-categorize with one click anytime","Smarter, personalised spending insights","Priority support"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                {!isPro ? (
                  <button onClick={() => { togglePro(true); setShowProModal(false); }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    Enable Pro (Demo)
                  </button>
                ) : (
                  <button onClick={() => { togglePro(false); setShowProModal(false); }}
                    className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    Disable Pro
                  </button>
                )}
                <button onClick={() => setShowProModal(false)}
                  className="px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium py-2.5 rounded-xl transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Banks modal ── */}
        {showBanksModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Supported Banks</h2>
                <button onClick={() => setShowBanksModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl">✕</button>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Upload a CSV or PDF statement from your bank — see notes below for each.</p>
              <div className="space-y-4">
                {[
                  {
                    bank: "Discovery Bank",
                    status: "✅ CSV & PDF supported",
                    color: "text-emerald-400",
                    steps: [
                      "PDF: download your statement directly from the Discovery Bank app or site and upload it as-is",
                      "CSV: open the app → Smart Search → set date range → Export as CSV"
                    ]
                  },
                  {
                    bank: "FNB",
                    status: "✅ CSV & PDF supported",
                    color: "text-emerald-400",
                    steps: [
                      "PDF: download your FNB Fusion statement from Online Banking and upload it directly — no conversion needed",
                      "CSV: log in to FNB Online Banking → My Bank Accounts → select account → Statement → Export as CSV"
                    ]
                  },
                  {
                    bank: "ABSA",
                    status: "✅ CSV & PDF supported",
                    color: "text-emerald-400",
                    steps: [
                      "PDF: download your statement from ABSA Online/app and upload it as-is",
                      "CSV: only available for credit card accounts via Online Banking → Statements"
                    ]
                  },
                  {
                    bank: "Standard Bank",
                    status: "✅ Full CSV support",
                    color: "text-emerald-400",
                    steps: [
                      "Log in to Standard Bank Online",
                      "My Accounts → select account → Statements → Download as CSV"
                    ]
                  },
                  {
                    bank: "Nedbank",
                    status: "✅ Full CSV support",
                    color: "text-emerald-400",
                    steps: [
                      "Log in → Accounts → select account → Statements → Download as CSV"
                    ]
                  },
                  {
                    bank: "Capitec",
                    status: "⚠️ PDF conversion required",
                    color: "text-yellow-400",
                    steps: [
                      "Capitec has no native CSV export and its PDF layout isn't supported directly yet",
                      "Download PDF statement from the app",
                      "Convert at getmycsv.com or convertbanktoexcel.com, then upload the CSV"
                    ]
                  },
                ].map(item => (
                  <div key={item.bank} className="bg-gray-100/60 dark:bg-gray-800/60 border border-gray-300/50 dark:border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{item.bank}</span>
                      <span className={`text-xs font-medium ${item.color}`}>{item.status}</span>
                    </div>
                    <ol className="space-y-1">
                      {item.steps.map((step, i) => (
                        <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                          <span className="text-gray-500 dark:text-gray-600 flex-shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <label className="flex-1 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors text-center">
                  Upload statement now
                  <input type="file" accept=".csv,.pdf" className="hidden" onChange={(e) => { setShowBanksModal(false); handleFile(e); }} disabled={aiLoading} />
                </label>
                <button onClick={() => setShowBanksModal(false)} className="px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium py-2.5 rounded-xl transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile: page title + action bar ── */}
        <div className="md:hidden mt-14 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            {isPro && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">PRO</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${hasActiveFilter ? "bg-indigo-900/40 border-indigo-700 text-indigo-300" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400"}`}>
              {hasActiveFilter ? "Filters ●" : "Filters"}
            </button>
            <button onClick={() => setShowBanksModal(true)} disabled={aiLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50">
              {aiLoading ? "AI…" : "Upload"}
            </button>
          </div>
        </div>

        {/* ── Mobile: secondary actions (Pro / Re-categorize / Clear) — always visible, not tucked inside Filters ── */}
        <div className="md:hidden flex items-center gap-2 flex-wrap mb-4">
          <button onClick={() => setShowProModal(true)}
            className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${isPro ? "bg-indigo-900/40 border-indigo-700 text-indigo-300" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400"}`}>
            {isPro ? "⚡ Pro active" : "⚡ Upgrade to Pro"}
          </button>
          {isPro && transactions.length > 0 && (
            <button onClick={handleRecategorize} disabled={aiLoading}
              className="text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50">
              {aiLoading ? "AI thinking…" : "🔄 Re-categorize"}
            </button>
          )}
          {transactions.length > 0 && (
            <button onClick={handleClear}
              className="text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-red-400">
              Clear data
            </button>
          )}
        </div>

        {/* ── Desktop header ── */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Personal Finance</p>
            </div>
            {isPro && <span className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-full font-semibold tracking-wide">PRO</span>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setShowProModal(true)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${isPro ? "bg-indigo-900/40 border-indigo-700 text-indigo-300 hover:bg-indigo-900/60" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-indigo-500"}`}>
              {isPro ? "⚡ Pro active" : "⚡ Upgrade to Pro"}
            </button>
            {isPro && transactions.length > 0 && (
              <button onClick={handleRecategorize} disabled={aiLoading}
                className="text-xs font-medium px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-indigo-500 transition-colors disabled:opacity-50">
                {aiLoading ? "AI thinking…" : "🔄 Re-categorize"}
              </button>
            )}
            <button onClick={() => setShowBanksModal(true)} disabled={aiLoading}
              className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {aiLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  AI categorizing…
                </span>
              ) : "Upload statement"}
            </button>
            {transactions.length > 0 && (
              <button onClick={handleClear}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-red-900/60 text-gray-600 dark:text-gray-300 hover:text-red-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-gray-300 dark:border-gray-700">
                Clear data
              </button>
            )}
          </div>
        </div>

        {/* ── Banners ── */}
        {aiError && (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 mb-4 flex items-center justify-between">
            <p className="text-yellow-300 text-sm">⚠ {aiError}</p>
            <button onClick={() => setAiError(null)} className="text-yellow-500 hover:text-yellow-300 text-xs ml-4">Dismiss</button>
          </div>
        )}
        {detectedBank && detectedBank !== "unknown" && BANK_INFO[detectedBank] && (
          <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-3 mb-4 flex items-center gap-3">
            <span className="text-emerald-400 text-sm">✓</span>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Detected <span className="text-gray-900 dark:text-white font-semibold">{BANK_INFO[detectedBank].name}</span> format</p>
          </div>
        )}
        {bankWarning && (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-yellow-300 text-sm font-semibold mb-1">
                {detectedBank === "capitec" ? "📄 Capitec — PDF export required"
                  : detectedBank === "absa"      ? "ℹ️ ABSA — heads up"
                  : detectedBank === "discovery" ? "ℹ️ Discovery Bank tip"
                  : detectedBank === "fnb"       ? "ℹ️ FNB"
                  : "⚠ Unknown bank format"}
              </p>
              <p className="text-yellow-200/80 text-sm">{bankWarning}</p>
            </div>
            <button onClick={() => setBankWarning(null)} className="text-yellow-500 hover:text-yellow-300 text-xs flex-shrink-0">Dismiss</button>
          </div>
        )}
        {aiLoading && (
          <div className="bg-indigo-900/30 border border-indigo-700/40 rounded-xl p-3 mb-4 flex items-center gap-3">
            <svg className="animate-spin h-4 w-4 text-indigo-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-indigo-300 text-sm">AI is reading your transactions… this takes about 10 seconds.</p>
          </div>
        )}
        {parseError && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 max-w-lg">
              <p className="text-red-400 font-semibold mb-2">Could not read file</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{parseError}</p>
              <button onClick={() => setParseError(null)} className="mt-4 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-300 underline">Dismiss</button>
            </div>
          </div>
        )}

        {transactions.length === 0 && !parseError && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-sm mt-1">Upload your bank statement (CSV or PDF) to get started</p>
            <button onClick={() => setShowBanksModal(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Upload statement
            </button>
            {!isPro && (
              <button onClick={() => setShowProModal(true)} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline">
                Upgrade to Pro for AI-powered categorization
              </button>
            )}
          </div>
        )}

        {transactions.length > 0 && (
          <>
            {/* ── Filters ── */}
            <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-6 ${showFilters ? "block" : "hidden md:block"}`}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
                  <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
                  <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Quick range</label>
                  <div className="flex gap-2">
                    {[{ label: "1M", months: 1 }, { label: "3M", months: 3 }, { label: "6M", months: 6 }].map(p => (
                      <button key={p.label} onClick={() => applyPreset(p.months)}
                        className="bg-gray-100 dark:bg-gray-800 hover:bg-indigo-700 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                        {p.label}
                      </button>
                    ))}
                    {(dateFrom || dateTo) && (
                      <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                        className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                        All
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 w-full md:w-auto">
                  <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Category</label>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value as Category | "All")}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full">
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {hasActiveFilter && (
                <div className="mt-2 text-xs text-indigo-400 font-medium">
                  Showing {filtered.length} of {transactionsWithAI.length} transactions
                </div>
              )}
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {[
                { label: "Income",       value: income,  color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
                { label: "Spent",        value: spent,   color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20" },
                { label: "Savings",      value: savings, color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
                { label: "Net",          value: net,     color: net >= 0 ? "text-emerald-400" : "text-red-400", bg: net >= 0 ? "bg-emerald-400/10 border-emerald-400/20" : "bg-red-400/10 border-red-400/20" },
                { label: "Transactions", value: null,    color: "text-indigo-400",  bg: "bg-indigo-400/10 border-indigo-400/20" },
              ].map(card => (
                <div key={card.label} className={`rounded-xl border p-3 md:p-4 ${card.bg}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium mb-1">{card.label}</p>
                  <p className={`text-base md:text-xl font-bold ${card.color} truncate`}>
                    {card.value === null ? filtered.length : fmt(card.value)}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">Spending by Category</h2>
                {categoryTotals.length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No expense data</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={categoryTotals} dataKey="value" cx="50%" cy="50%" outerRadius={75} strokeWidth={2} stroke="#111827">
                          {categoryTotals.map((entry) => (
                            <Cell key={entry.name} fill={getCatColor(entry.name)} />
                          ))}
                        </Pie>
                        <Tooltip formatter={tooltipFormatter} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {categoryTotals.map(cat => (
                        <div key={cat.name}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-600 dark:text-gray-300 truncate mr-2">{cat.name}</span>
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{fmt(cat.value)} · {totalSpentForPct > 0 ? Math.round((cat.value / totalSpentForPct) * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${totalSpentForPct > 0 ? (cat.value / totalSpentForPct) * 100 : 0}%`, backgroundColor: getCatColor(cat.name) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">Monthly Overview</h2>
                {monthlyData.length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => "R" + (v / 1000).toFixed(0) + "k"} />
                      <Tooltip formatter={tooltipFormatter} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#f9fafb" }} />
                      <Line type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2} dot={false} name="Income" />
                      <Line type="monotone" dataKey="spent"  stroke="#f87171" strokeWidth={2} dot={false} name="Spent"  />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Transaction table ── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Transactions</h2>
                <div className="flex items-center gap-3">
                  {isPro && Object.keys(aiMap).length > 0 && (
                    <span className="text-xs text-indigo-400 font-medium">⚡ AI categorized</span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} rows</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/60 dark:divide-gray-800/60">
                    {filtered
                      .slice().sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 150)
                      .map((t, i) => (
                        <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{t.date}</td>
                          <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 max-w-[160px] md:max-w-xs truncate text-xs md:text-sm">{t.description}</td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: getCatColor(t.category) + "22", color: getCatColor(t.category) }}>
                              {t.category}
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium whitespace-nowrap text-xs md:text-sm ${t.amount > 0 ? "text-emerald-400" : t.category === "Savings" ? "text-blue-400" : "text-red-400"}`}>
                            {t.amount > 0 ? "+" : ""}{fmt(t.amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {filtered.length > 150 && (
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-3">Showing first 150 of {filtered.length} transactions</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;