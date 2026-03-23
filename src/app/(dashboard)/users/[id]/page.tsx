"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { User, Mail, ShieldCheck, KeyRound, Save, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Intake Operator",
  STORE_MANAGER: "Store / Production Manager",
  SALES_FINANCE: "Sales & Finance Officer",
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function MyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${id}`);
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      showToast("error", "Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/users/${id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      showToast("success", "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      showToast("error", data.error ?? "Failed to change password.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#240C64]" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-center text-[#9B9B9B] mt-16">Profile not found.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1D1D1D]">My Profile</h1>
        <p className="text-sm text-[#9B9B9B] mt-0.5">View your account details and manage your password.</p>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8E8]">
          <h2 className="text-sm font-semibold text-[#1D1D1D]">Account Information</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#240C64] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1D1D1D]">{user.name}</p>
              <p className="text-xs text-[#9B9B9B]">Member since {new Date(user.createdAt).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-[#9B9B9B] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[#9B9B9B] font-medium uppercase tracking-wide">Email</p>
                <p className="text-sm text-[#1D1D1D] mt-0.5">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-[#9B9B9B] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[#9B9B9B] font-medium uppercase tracking-wide">Role</p>
                <p className="text-sm text-[#1D1D1D] mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-[#9B9B9B] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[#9B9B9B] font-medium uppercase tracking-wide">Status</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#240C64]" />
            <h2 className="text-sm font-semibold text-[#1D1D1D]">Change Password</h2>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64]/20 focus:border-[#240C64] pr-10"
                placeholder="Enter current password"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#1D1D1D]">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64]/20 focus:border-[#240C64] pr-10"
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#1D1D1D]">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64]/20 focus:border-[#240C64]"
              placeholder="Repeat new password"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#240C64] text-white text-sm font-semibold rounded-lg hover:bg-[#1a0948] transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
