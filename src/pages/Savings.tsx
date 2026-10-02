import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { clearTransactions } from "../storage/supabaseStorage";
import { launchPayFastCheckout } from "../services/payfast";

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth();

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "ZAR");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Clear data
  const [clearLoading, setClearLoading] = useState(false);
  const [clearMsg, setClearMsg] = useState<string | null>(null);

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (!newPassword || newPassword.length < 8) {
      setPwMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwMsg({ type: "error", text: error.message });
    } else {
      setPwMsg({ type: "success", text: "Password updated successfully." });
      setNewPassword(""); setConfirmPassword("");
    }
    setPwLoading(false);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileLoading(true); setProfileMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null, currency })
      .eq("id", user.id);
    if (error) {
      setProfileMsg({ type: "error", text: error.message });
    } else {
      await refreshProfile();
      setProfileMsg({ type: "success", text: "Profile saved." });
    }
    setProfileLoading(false);
  };

  const handleClearData = async () => {
    setClearLoading(true); setClearMsg(null);
    await clearTransactions();
    setClearMsg("All transaction data cleared.");
    setClearLoading(false);
  };

const handleDeleteAccount = async () => {
  if (deleteConfirm !== user?.email) return;
  setDeleteLoading(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      "https://eeuscsetaywjbqnjubvv.supabase.co/functions/v1/delete-user",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    await signOut();
  } catch (err) {
    setDeleteLoading(false);
    alert("Failed to delete account: " + String(err));
  }
};

  const isPro = profile?.is_pro ?? false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans pb-20 md:pb-0">
      <div className="p-4 md:p-6 max-w-2xl mx-auto">

        {/* ── Mobile top spacer ── */}
        <div className="md:hidden mt-14 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account</p>
        </div>

        {/* ── Desktop header ── */}
        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">

          {/* ── Profile info ── */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide block mb-1">Email</label>
                <input
                  type="text" value={user?.email ?? ""} disabled
                  className="w-full bg-gray-100/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm rounded-lg px-3 py-2 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide block mb-1">Display Name</label>
                <input
                  type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Zian"
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide block mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="ZAR">ZAR — South African Rand</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="AED">AED — UAE Dirham</option>
                </select>
              </div>
              {profileMsg && (
                <p className={`text-xs font-medium ${profileMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                  {profileMsg.type === "success" ? "✓ " : "✕ "}{profileMsg.text}
                </p>
              )}
              <button onClick={handleProfileSave} disabled={profileLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {profileLoading ? "Saving…" : "Save changes"}
              </button>
            </div>
          </section>

          {/* ── Subscription ── */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">Subscription</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-900 dark:text-white font-semibold">{isPro ? "BudgetIQ Pro" : "Free Plan"}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                  {isPro ? "AI categorization, unlimited insights" : "Standard categorization, basic insights"}
                </p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPro ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700"}`}>
                {isPro ? "PRO" : "FREE"}
              </span>
            </div>
            {!isPro ? (
              <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-xl p-4">
                <p className="text-indigo-300 text-sm font-medium mb-1">⚡ Upgrade to Pro — R79/month</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">AI-powered categorization for any bank, re-categorize anytime, smarter insights.</p>
                <button
                  onClick={() => user && launchPayFastCheckout(user.email!, user.id)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  Upgrade now
                </button>
              </div>
            ) : (
              <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4">
                <p className="text-emerald-300 text-sm font-medium mb-1">✓ Pro is active</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">To cancel your subscription, contact support or manage it through PayFast.</p>
              </div>
            )}
          </section>

          {/* ── Change password ── */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">Change Password</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide block mb-1">New Password</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide block mb-1">Confirm Password</label>
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {pwMsg && (
                <p className={`text-xs font-medium ${pwMsg.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                  {pwMsg.type === "success" ? "✓ " : "✕ "}{pwMsg.text}
                </p>
              )}
              <button onClick={handlePasswordChange} disabled={pwLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {pwLoading ? "Updating…" : "Update password"}
              </button>
            </div>
          </section>

          {/* ── Data management ── */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4">Data</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white text-sm font-medium">Clear all transactions</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Permanently removes all uploaded transaction data</p>
              </div>
              <button onClick={handleClearData} disabled={clearLoading}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-red-900/50 border border-gray-300 dark:border-gray-700 hover:border-red-700 text-gray-600 dark:text-gray-300 hover:text-red-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ml-4">
                {clearLoading ? "Clearing…" : "Clear data"}
              </button>
            </div>
            {clearMsg && <p className="text-emerald-400 text-xs mt-2">✓ {clearMsg}</p>}
          </section>

          {/* ── Danger zone ── */}
          <section className="bg-white dark:bg-gray-900 border border-red-300 dark:border-red-900/40 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white text-sm font-medium">Delete account</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Permanently delete your account and all data</p>
              </div>
              <button onClick={() => setShowDeleteModal(true)}
                className="bg-red-900/30 hover:bg-red-900/60 border border-red-800/50 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0 ml-4">
                Delete account
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-red-900/50 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete your account?</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              This will permanently delete all your data including transactions, budget limits, and savings goals. This cannot be undone.
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">Type your email to confirm:</p>
            <p className="text-indigo-400 text-sm font-mono mb-3">{user?.email}</p>
            <input
              type="email" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== user?.email || deleteLoading}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40 text-sm">
                {deleteLoading ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium py-2.5 rounded-xl transition-colors text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}