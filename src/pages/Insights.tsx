import { useState, useEffect, useRef } from "react";
import type { FC } from "react";
import { getTransactions } from "../storage/supabaseStorage";
import type { Transaction } from "../types";

const SUPABASE_URL = "https://eeuscsetaywjbqnjubvv.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface InsightCard {
  type: "anomaly" | "saving" | "trend" | "recommendation";
  title: string;
  body: string;
  value?: string;
  severity?: "high" | "medium" | "low";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSummary(transactions: Transaction[]): string {
  if (transactions.length === 0) return "No transactions available.";

  const income  = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const savings = transactions.filter(t => t.category === "Savings").reduce((s, t) => s + Math.abs(t.amount), 0);
  const spent   = transactions.filter(t => t.amount < 0 && t.category !== "Savings").reduce((s, t) => s + Math.abs(t.amount), 0);

  const catMap: Record<string, number> = {};
  transactions
    .filter(t => t.amount < 0 && t.category !== "Savings")
    .forEach(t => { catMap[t.category] = (catMap[t.category] ?? 0) + Math.abs(t.amount); });

  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, amt]) => `${cat}: R${amt.toFixed(0)}`)
    .join(", ");

  const monthMap: Record<string, { spent: number; income: number }> = {};
  transactions.forEach(t => {
    const key = t.date.replace(/\//g, "-").substring(0, 7);
    if (!monthMap[key]) monthMap[key] = { spent: 0, income: 0 };
    if (t.amount < 0 && t.category !== "Savings") monthMap[key].spent += Math.abs(t.amount);
    if (t.amount > 0) monthMap[key].income += t.amount;
  });

  const months = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, v]) => `${m}: spent R${v.spent.toFixed(0)}, income R${v.income.toFixed(0)}`)
    .join(" | ");

  return `South African personal finance data.
Total transactions: ${transactions.length}
Total income: R${income.toFixed(0)}
Total spent: R${spent.toFixed(0)}
Total savings: R${savings.toFixed(0)}
Net: R${(income - spent - savings).toFixed(0)}
Top spending categories: ${topCats}
Monthly breakdown: ${months}`;
}

const ICONS: Record<InsightCard["type"], string> = {
  anomaly: "⚠️", saving: "💡", trend: "📈", recommendation: "🎯",
};

const COLORS: Record<InsightCard["type"], { border: string; bg: string; badge: string }> = {
  anomaly:        { border: "border-red-500/30",     bg: "bg-red-500/5",     badge: "bg-red-500/20 text-red-300" },
  saving:         { border: "border-emerald-500/30", bg: "bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-300" },
  trend:          { border: "border-blue-500/30",    bg: "bg-blue-500/5",    badge: "bg-blue-500/20 text-blue-300" },
  recommendation: { border: "border-amber-500/30",   bg: "bg-amber-500/5",   badge: "bg-amber-500/20 text-amber-300" },
};

const LABELS: Record<InsightCard["type"], string> = {
  anomaly: "Anomaly", saving: "Save Money", trend: "Trend", recommendation: "Recommendation",
};

const Insights: FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards]               = useState<InsightCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError]     = useState<string | null>(null);
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [input, setInput]               = useState("");
  const [chatLoading, setChatLoading]   = useState(false);
  const [chatError, setChatError]       = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTransactions().then(setTransactions);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const generateInsights = async () => {
    if (transactions.length === 0) return;
    setLoadingCards(true);
    setCardsError(null);
    setCards([]);

    const summary = buildSummary(transactions);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ summary }),
      });
      const parsed: InsightCard[] = await res.json();
      setCards(parsed);
    } catch {
      setCardsError("Failed to generate insights. Please try again.");
    } finally {
      setLoadingCards(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setChatLoading(true);
    setChatError(null);

    const summary = buildSummary(transactions);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
          summary,
        }),
      });
      const data = await res.json();
      const text: string = data.text ?? "Sorry, I couldn't generate a response.";
      setMessages((prev: ChatMessage[]) => [...prev, { role: "assistant", content: text }]);
    } catch {
      setChatError("Failed to send message. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const noData = transactions.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans pb-20 md:pb-0">
      <div className="p-4 md:p-6">

        <div className="md:hidden mt-14 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Powered by Claude</p>
        </div>

        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">AI Insights</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Powered by Claude — your personal finance analyst</p>
        </div>

        {noData ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-lg font-medium">No transaction data</p>
            <p className="text-sm mt-1">Upload a bank CSV on the Dashboard first</p>
          </div>
        ) : (
          <>
            {/* ── Insight cards ── */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Spending Analysis</h2>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{transactions.length} transactions analysed</p>
                </div>
                <button onClick={() => void generateInsights()} disabled={loadingCards}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  {loadingCards ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Analysing…
                    </>
                  ) : <>✨ {cards.length > 0 ? "Refresh insights" : "Generate insights"}</>}
                </button>
              </div>

              {cardsError && (
                <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 mb-4 text-red-300 text-sm">{cardsError}</div>
              )}

              {loadingCards && cards.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 animate-pulse">
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-3"/>
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-3"/>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2"/>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/5"/>
                    </div>
                  ))}
                </div>
              )}

              {cards.length === 0 && !loadingCards && !cardsError && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-dashed rounded-xl p-10 text-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Click "Generate insights" to analyse your spending with AI</p>
                </div>
              )}

              {cards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cards.map((card, i) => {
                    const style = COLORS[card.type];
                    return (
                      <div key={i} className={`border rounded-xl p-5 ${style.border} ${style.bg}`}>
                        <div className="flex items-start justify-between mb-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                            {ICONS[card.type]} {LABELS[card.type]}
                          </span>
                          {card.value && (
                            <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{card.value}</span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{card.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{card.body}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Chat ── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm">✨</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Ask about your spending</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Claude knows your full transaction history</p>
                </div>
              </div>

              <div className="h-80 overflow-y-auto px-5 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[
                      "Where am I spending the most?",
                      "How much did I spend on food last month?",
                      "Am I saving enough?",
                      "What's my biggest unnecessary expense?",
                      "How does my spending compare month to month?",
                    ].map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}/>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}/>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}/>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {chatError && <div className="px-5 pb-2 text-xs text-red-400">{chatError}</div>}

              <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown} placeholder="Ask anything about your finances…"
                  disabled={chatLoading}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50" />
                <button onClick={() => void sendMessage()} disabled={chatLoading || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Insights;