import { useNavigate } from "react-router-dom";

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
    <polyline points="77,245 141,185 205,135 269,95 333,155"
      fill="none" stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
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

const features = [
  {
    icon: "🏦",
    title: "All major SA banks",
    desc: "Upload CSV statements from FNB, Standard Bank, Nedbank, ABSA, Discovery, and Capitec. We detect the format automatically.",
  },
  {
    icon: "📊",
    title: "Instant spending breakdown",
    desc: "See exactly where your money goes — groceries, fuel, entertainment — with charts that update the moment you upload.",
  },
  {
    icon: "🎯",
    title: "Budget limits & savings goals",
    desc: "Set monthly limits per category and track progress toward savings goals. Know when you're overspending before it's too late.",
  },
  {
    icon: "⚡",
    title: "AI categorization (Pro)",
    desc: "Claude AI reads your transaction descriptions and categorizes them intelligently — no manual sorting, no guesswork.",
  },
  {
    icon: "🔒",
    title: "Private by design",
    desc: "Your data is stored securely in your own account. No one else can see your transactions — not even us.",
  },
  {
    icon: "📱",
    title: "Works on any device",
    desc: "Access your dashboard from your phone, tablet, or desktop. Your data syncs instantly across all devices.",
  },
];

const faqs = [
  {
    q: "Which banks are supported?",
    a: "FNB, Standard Bank, Nedbank, ABSA (credit card), and Discovery Bank have full CSV support. Capitec requires a PDF-to-CSV conversion first — we walk you through it.",
  },
  {
    q: "Is my banking data safe?",
    a: "Yes. You upload a CSV export — we never connect to your bank directly. Your data is stored in a secure, encrypted database tied to your account only.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Free gives you full CSV parsing, spending charts, budget limits, and savings goals. Pro adds AI-powered categorization using Claude, which is significantly more accurate for complex transaction descriptions.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes. You can cancel your subscription at any time through PayFast. Your data stays in your account on the Free plan.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#f1f5f9", fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .land-btn-primary {
          background: #f59e0b; color: #0f0f0f; font-weight: 700;
          border: none; border-radius: 10px; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .land-btn-primary:hover { background: #fbbf24; transform: translateY(-1px); }
        .land-btn-secondary {
          background: transparent; color: #f1f5f9; font-weight: 500;
          border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .land-btn-secondary:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }
        .feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 1.75rem;
          transition: border-color 0.2s, background 0.2s;
        }
        .feature-card:hover { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.04); }
        .pricing-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 2rem;
        }
        .pricing-card.featured {
          background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.3);
        }
        .faq-item {
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 1.5rem 0;
        }
        .divider { width: 40px; height: 3px; background: #f59e0b; border-radius: 2px; margin: 1rem 0 1.5rem; }
        @media (max-width: 640px) {
          .hero-title { font-size: 2.2rem !important; }
          .hero-sub { font-size: 1rem !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BudgetIQLogo size={32} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", letterSpacing: "-0.3px" }}>BudgetIQ</span>
          </div>
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {["Features", "Pricing", "FAQ"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#f1f5f9")}
                onMouseOut={e => (e.currentTarget.style.color = "#94a3b8")}>
                {l}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="land-btn-secondary" style={{ padding: "8px 18px", fontSize: 14 }} onClick={() => navigate("/login")}>
              Log in
            </button>
            <button className="land-btn-primary" style={{ padding: "8px 18px", fontSize: 14 }} onClick={() => navigate("/login")}>
              Sign up free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: "100px 1.5rem 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 100, padding: "6px 16px", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>Built for South Africa</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: "3.5rem", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: "1.5rem", color: "#f8fafc" }}>
            Know exactly where<br />
            <span style={{ color: "#f59e0b" }}>your money goes.</span>
          </h1>
          <p className="hero-sub" style={{ fontSize: "1.2rem", color: "#94a3b8", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 2.5rem" }}>
            Upload your bank statement. Get instant spending insights, budget tracking, and savings goals — no spreadsheets required.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="land-btn-primary" style={{ padding: "14px 32px", fontSize: 16 }} onClick={() => navigate("/login")}>
              Sign up free
            </button>
            <button className="land-btn-secondary" style={{ padding: "14px 32px", fontSize: 16 }} onClick={() => { const el = document.getElementById("features"); el?.scrollIntoView({ behavior: "smooth" }); }}>
              See how it works
            </button>
          </div>
          <p style={{ marginTop: "1.25rem", fontSize: 13, color: "#475569" }}>No credit card required · Free forever on the basic plan</p>
        </div>

        {/* ── Mock dashboard preview ── */}
        <div style={{ maxWidth: 900, margin: "5rem auto 0", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "1.5rem", textAlign: "left" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
            {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.25rem" }}>
            {[
              { label: "Income", value: "R 24,500", color: "#34d399" },
              { label: "Spent", value: "R 18,240", color: "#f87171" },
              { label: "Savings", value: "R 3,000", color: "#60a5fa" },
              { label: "Net", value: "R 3,260", color: "#34d399" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1rem" }}>
                <p style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1rem", height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", border: "8px solid rgba(245,158,11,0.6)", borderTopColor: "#34d399", borderRightColor: "#f87171", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 11, color: "#475569" }}>Spending by category</p>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1rem", height: 120, display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: "1.5rem" }}>
              {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                <div key={i} style={{ flex: 1, background: i === 5 ? "#f59e0b" : "rgba(245,158,11,0.25)", borderRadius: 4, height: `${h}%`, transition: "height 0.3s" }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "80px 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.75rem" }}>Features</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.5px" }}>Everything you need to manage your money</h2>
          </div>
          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: 28, marginBottom: "1rem" }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: "0.5rem" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supported banks strip ── */}
      <section style={{ padding: "48px 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: "1.5rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500 }}>Supports all major South African banks</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {[
              { name: "FNB", status: "Full support" },
              { name: "Standard Bank", status: "Full support" },
              { name: "Nedbank", status: "Full support" },
              { name: "Discovery Bank", status: "Full support" },
              { name: "ABSA", status: "Credit card" },
              { name: "Capitec", status: "PDF conversion" },
            ].map(b => (
              <div key={b.name} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>{b.name}</span>
                <span style={{ fontSize: 11, color: b.status === "Full support" ? "#34d399" : "#f59e0b", fontWeight: 500 }}>{b.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "80px 1.5rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.75rem" }}>Pricing</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.5px" }}>Simple, transparent pricing</h2>
          </div>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Free */}
            <div className="pricing-card">
              <p style={{ fontSize: 13, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>Free</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: "0.5rem" }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: "#f1f5f9" }}>R0</span>
                <span style={{ color: "#475569", fontSize: 14 }}>/month</span>
              </div>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: "1.5rem" }}>Everything you need to get started</p>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: "1.5rem" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: "2rem" }}>
                {["CSV upload for all SA banks","Automatic transaction categorization","Spending charts & monthly overview","Budget limits per category","Savings goals tracker"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: "#94a3b8" }}>
                    <span style={{ color: "#34d399", flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className="land-btn-secondary" style={{ width: "100%", padding: "12px", fontSize: 15 }} onClick={() => navigate("/login")}>
                Sign up free
              </button>
            </div>

            {/* Pro */}
            <div className="pricing-card featured">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Pro</p>
                <span style={{ fontSize: 11, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 100, padding: "3px 10px", fontWeight: 600 }}>Most popular</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: "0.5rem" }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: "#f1f5f9" }}>R79</span>
                <span style={{ color: "#475569", fontSize: 14 }}>/month</span>
              </div>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: "1.5rem" }}>AI-powered insights for serious budgeters</p>
              <div style={{ height: "1px", background: "rgba(245,158,11,0.15)", marginBottom: "1.5rem" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: "2rem" }}>
                {["Everything in Free","AI categorization powered by Claude","Re-categorize with one click","Smarter spending insights","Priority support"].map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: "#94a3b8" }}>
                    <span style={{ color: "#f59e0b", flexShrink: 0 }}>⚡</span> {f}
                  </li>
                ))}
              </ul>
              <button className="land-btn-primary" style={{ width: "100%", padding: "12px", fontSize: 15 }} onClick={() => navigate("/login")}>
                Get started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "80px 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.75rem" }}>FAQ</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.5px" }}>Common questions</h2>
          </div>
          <div>
            {faqs.map(faq => (
              <div key={faq.q} className="faq-item">
                <p style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: "0.75rem" }}>{faq.q}</p>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.75 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "80px 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.5px", marginBottom: "1rem" }}>
            Take control of your finances today
          </h2>
          <p style={{ fontSize: 16, color: "#64748b", marginBottom: "2.5rem", lineHeight: 1.7 }}>
            Join thousands of South Africans who track their spending with BudgetIQ. Free to start, no credit card needed.
          </p>
          <button className="land-btn-primary" style={{ padding: "16px 40px", fontSize: 17 }} onClick={() => navigate("/login")}>
            Sign up free
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BudgetIQLogo size={24} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b" }}>BudgetIQ</span>
            <span style={{ fontSize: 13, color: "#334155" }}>· Personal Finance Dashboard</span>
          </div>
          <p style={{ fontSize: 13, color: "#334155" }}>© 2026 BudgetIQ. Built in South Africa 🇿🇦</p>
        </div>
      </footer>
    </div>
  );
}