import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

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

// Shows the icon for the mode you'll switch TO (sun while dark, moon while light) —
// the common convention for theme toggles.
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (compact) {
    return (
      <button onClick={toggleTheme} aria-label="Toggle theme"
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors">
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <button onClick={toggleTheme}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
      <span className="flex items-center gap-3">
        {isDark ? <SunIcon /> : <MoonIcon />}
        {isDark ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
}

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { to: "/budget", label: "Budget", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
  )},
  { to: "/savings", label: "Savings", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07A5.002 5.002 0 017 12h2a3 3 0 006 0h2a5.002 5.002 0 01-4 4.93z"/>
    </svg>
  )},
  { to: "/insights", label: "Insights", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
    </svg>
  )},
  { to: "/settings", label: "Settings", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )},
];

export default function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex w-64 bg-white dark:bg-gray-900 flex-col gap-6 border-r border-gray-200 dark:border-gray-800 min-h-screen p-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <BudgetIQLogo size={40} />
          <div>
            <h1 className="text-xl font-bold text-amber-500 dark:text-amber-400 leading-tight tracking-wide">BudgetIQ</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 tracking-widest uppercase">Personal Finance</p>
          </div>
        </div>

        <ThemeToggle />

        <nav className="flex flex-col gap-1 text-gray-600 dark:text-gray-300">
          {navLinks.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-400/10 text-amber-500 dark:text-amber-400 border border-amber-400/20"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                }`}>
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {user?.email && (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-gray-900 flex-shrink-0">
                {user.email[0].toUpperCase()}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{user.email}</span>
            </div>
          )}
          <button onClick={signOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 dark:hover:text-red-400 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            → Log out
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-600">BudgetIQ v1.0</p>
        </div>
      </div>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BudgetIQLogo size={28} />
          <span className="text-base font-bold text-amber-500 dark:text-amber-400">BudgetIQ</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          {user?.email && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-gray-900">
                {user.email[0].toUpperCase()}
              </div>
              <button onClick={signOut} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1">
                Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
        {navLinks.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? "text-amber-500 dark:text-amber-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}>
              <span className={isActive ? "text-amber-500 dark:text-amber-400" : ""}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}