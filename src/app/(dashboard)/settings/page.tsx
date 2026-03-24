"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, Users, Save, Plus, X, Eye, EyeOff,
  CheckCircle2, AlertCircle, Pencil,
  UserCheck, UserX, KeyRound, RefreshCw, MoreVertical,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SystemSetting = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
  updatedBy: { name: string } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "STORE_MANAGER" | "SALES_FINANCE";
  isActive: boolean;
  createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Intake Operator",
  STORE_MANAGER: "Store / Production Manager",
  SALES_FINANCE: "Sales & Finance Officer",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ADMIN:         { bg: "#F0EEFF", text: "#3B1FA8", border: "#DDD6FE", dot: "#6D28D9" },
  OPERATOR:      { bg: "#EDFBF4", text: "#064E38", border: "#A7F3D0", dot: "#059669" },
  STORE_MANAGER: { bg: "#EBF4FF", text: "#1A3A7F", border: "#BFDBFE", dot: "#1D4ED8" },
  SALES_FINANCE: { bg: "#FFF8EC", text: "#7A3A0A", border: "#FDE68A", dot: "#D97706" },
};

const KNOWN_SETTINGS: { key: string; label: string; description: string; unit?: string }[] = [
  { key: "husk_kg_per_bag",           label: "Husk Bag Weight (kg)",        description: "Physical weight of one bag of husks — used to convert kg stock into bags", unit: "kg" },
  { key: "husk_coffee_kg_per_bag",    label: "Coffee kg to Earn 1 Husk Bag", description: "How many kg of coffee a farmer must deliver to earn 1 bag of husks", unit: "kg" },
  { key: "husk_alert_threshold_bags", label: "Husk Alert Threshold",         description: "Alert when husk stock falls below this many bags", unit: "bags" },
  { key: "milling_target_rate",       label: "Milling Target Rate",          description: "Target milling conversion rate percentage", unit: "%" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
      type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── Setting Card (mobile-friendly replacement for table row) ────────────────

function SettingRow({ setting, onSave }: { setting: SystemSetting; onSave: (key: string, value: string) => Promise<void> }) {
  const known = KNOWN_SETTINGS.find(s => s.key === setting.key);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(setting.value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(setting.key, val);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="p-4 border-b border-[#F0F0F0] last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[#1D1D1D]">{known?.label ?? setting.key}</p>
          {known?.description && <p className="text-xs text-[#9B9B9B] mt-0.5">{known.description}</p>}
          <code className="text-[11px] text-[#B0B0B0] bg-[#F6F6F6] rounded px-1.5 py-0.5 mt-1 inline-block">{setting.key}</code>
          {setting.updatedBy && (
            <p className="text-[11px] text-[#C0C0C0] mt-1">Updated by {setting.updatedBy.name} · {fmtDate(setting.updatedAt)}</p>
          )}
        </div>

        <div className="shrink-0">
          {editing ? (
            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-2">
                <input
                  value={val}
                  onChange={e => setVal(e.target.value)}
                  className="border border-[#D0D0D0] rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-[#240C64]"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                />
                {known?.unit && <span className="text-xs text-[#9B9B9B]">{known.unit}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setVal(setting.value); }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E8E8] text-[#6B6B6B]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#1D1D1D] text-white font-semibold disabled:opacity-50"
                >
                  <Save className="w-3 h-3" /> {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#1D1D1D]">{setting.value}</span>
              {known?.unit && <span className="text-xs text-[#9B9B9B]">{known.unit}</span>}
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#F6F6F6]"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ─── Add Setting Modal ────────────────────────────────────────────────────────

function AddSettingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key.trim(), value: value.trim(), description: desc.trim() || undefined }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to save"); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="px-6 py-5 border-b border-[#F0F0F0] flex items-center justify-between">
        <h3 className="text-base font-bold text-[#1D1D1D]">Add System Setting</h3>
        <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#1D1D1D]"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Key *</label>
          <input required value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. husk_kg_per_bag"
            className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#240C64]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Value *</label>
          <input required value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 50"
            className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#240C64]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Description</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description"
            className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#240C64]" />
        </div>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#D0D0D0] text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#1D1D1D] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Save Setting"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── User Modal ───────────────────────────────────────────────────────────────

function UserModal({ user, onClose, onSaved }: { user?: User; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "OPERATOR");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const url = isEdit ? `/api/users/${user!.id}` : "/api/users";
    const method = isEdit ? "PATCH" : "POST";
    const body: Record<string, string> = { name, role };
    if (!isEdit) { body.email = email; body.password = password; }
    else if (password) body.password = password;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to save"); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="px-6 py-5 border-b border-[#F0F0F0] flex items-center justify-between">
        <h3 className="text-base font-bold text-[#1D1D1D]">{isEdit ? "Edit User" : "Create New User"}</h3>
        <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#1D1D1D]"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Full Name *</label>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe"
            className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#240C64]" />
        </div>
        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Email *</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com"
              className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#240C64]" />
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">Role *</label>
          <select value={role} onChange={e => setRole(e.target.value as User["role"])}
            className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#240C64] bg-white">
            {Object.entries(ROLE_LABELS).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">
            {isEdit ? "New Password (leave blank to keep)" : "Password *"}
          </label>
          <div className="relative">
            <input required={!isEdit} type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
              className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-[#240C64]" />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#D0D0D0] text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#1D1D1D] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div className="px-6 py-5 border-b border-[#F0F0F0] flex items-center justify-between">
        <h3 className="text-base font-bold text-[#1D1D1D]">Reset Password</h3>
        <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#1D1D1D]"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <p className="text-sm text-[#6B6B6B]">Setting a new password for <strong className="text-[#1D1D1D]">{user.name}</strong>.</p>
        <div>
          <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5 uppercase tracking-wide">New Password *</label>
          <div className="relative">
            <input required autoFocus type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full border border-[#D0D0D0] rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-[#240C64]" />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#D0D0D0] text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#1D1D1D] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Resetting…" : "Reset Password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── User Action Menu ─────────────────────────────────────────────────────────

function UserActionMenu({ user, onEdit, onResetPassword, onToggleActive }: {
  user: User; onEdit: () => void; onResetPassword: () => void; onToggleActive: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-user-menu]")) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative inline-block" data-user-menu>
      <button onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-lg border border-[#E8E8E8] bg-white flex items-center justify-center text-[#6B6B6B] hover:bg-[#F6F6F6]">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-[#E8E8E8] rounded-xl shadow-lg min-w-[172px] p-1">
          <button onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1D1D1D] rounded-lg hover:bg-[#F6F6F6] text-left">
            <Pencil className="w-3.5 h-3.5 text-[#6B6B6B]" /> Edit Details
          </button>
          <button onClick={() => { setOpen(false); onResetPassword(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1D1D1D] rounded-lg hover:bg-[#F6F6F6] text-left">
            <KeyRound className="w-3.5 h-3.5 text-[#6B6B6B]" /> Reset Password
          </button>
          <div className="h-px bg-[#F0F0F0] my-1" />
          <button onClick={() => { setOpen(false); onToggleActive(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left ${user.isActive ? "text-red-700 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}>
            {user.isActive ? <><UserX className="w-3.5 h-3.5" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5" /> Activate</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<"system" | "users">("system");
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showAddSetting, setShowAddSetting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const res = await fetch("/api/settings");
    if (res.ok) { const d = await res.json(); setSettings(d.settings); }
    setSettingsLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) { const d = await res.json(); setUsers(d.users); }
    setUsersLoading(false);
  }, []);

  useEffect(() => { loadSettings(); loadUsers(); }, [loadSettings, loadUsers]);

  async function handleSaveSetting(key: string, value: string) {
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) { await loadSettings(); showToast("Setting saved"); }
    else showToast("Failed to save setting", "error");
  }

  async function handleToggleUser(user: User) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) { await loadUsers(); showToast(user.isActive ? `${user.name} deactivated` : `${user.name} activated`); }
    else { const d = await res.json(); showToast(d.error ?? "Failed to update", "error"); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1D]">Settings</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">System configuration and user account management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F6F6F6] rounded-xl p-1 w-fit">
        {([
          { id: "system", icon: Settings, label: "System Config" },
          { id: "users",  icon: Users,    label: "User Management" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.id ? "bg-white text-[#1D1D1D] shadow-sm" : "text-[#6B6B6B] hover:text-[#1D1D1D]"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── System Config Tab ── */}
      {tab === "system" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1D1D1D]">System Configuration</h2>
              <p className="text-sm text-[#9B9B9B]">Operational parameters that affect system behaviour</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadSettings}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E8E8] bg-white text-sm text-[#6B6B6B] hover:bg-[#F6F6F6]">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button onClick={() => setShowAddSetting(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1D1D1D] text-white text-sm font-semibold hover:bg-[#333]">
                <Plus className="w-4 h-4" /> Add Setting
              </button>
            </div>
          </div>

          {settingsLoading ? (
            <div className="bg-white rounded-xl border border-[#E8E8E8] p-8 text-center text-sm text-[#9B9B9B]">Loading…</div>
          ) : settings.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E8E8E8] p-12 text-center">
              <Settings className="w-8 h-8 text-[#D0D0D0] mx-auto mb-3" />
              <p className="text-sm text-[#9B9B9B]">No settings found. Add your first setting above.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
              {settings.map(s => <SettingRow key={s.id} setting={s} onSave={handleSaveSetting} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1D1D1D]">User Accounts</h2>
              <p className="text-sm text-[#9B9B9B]">
                {users.filter(u => u.isActive).length} active · {users.filter(u => !u.isActive).length} inactive
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadUsers}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E8E8] bg-white text-sm text-[#6B6B6B] hover:bg-[#F6F6F6]">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#240C64] text-white text-sm font-semibold hover:bg-[#1a0948]">
                <Plus className="w-4 h-4" /> New User
              </button>
            </div>
          </div>

          {usersLoading ? (
            <div className="bg-white rounded-xl border border-[#E8E8E8] p-8 text-center text-sm text-[#9B9B9B]">Loading…</div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
              {/* Mobile: cards */}
              <div className="sm:hidden divide-y divide-[#F0F0F0]">
                {users.map(user => {
                  const rc = ROLE_COLORS[user.role] ?? ROLE_COLORS.OPERATOR;
                  return (
                    <div key={user.id} className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: rc.dot }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1D1D1D] truncate">{user.name}</p>
                        <p className="text-xs text-[#9B9B9B] truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: rc.dot }} />
                            {ROLE_LABELS[user.role]}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            user.isActive ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <UserActionMenu user={user} onEdit={() => setEditUser(user)}
                        onResetPassword={() => setResetUser(user)} onToggleActive={() => handleToggleUser(user)} />
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F8F8F8] border-b border-[#F0F0F0]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">Joined</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {users.map(user => {
                      const rc = ROLE_COLORS[user.role] ?? ROLE_COLORS.OPERATOR;
                      return (
                        <tr key={user.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: rc.dot }}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-[#1D1D1D]">{user.name}</p>
                                <p className="text-xs text-[#9B9B9B]">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                              style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: rc.dot }} />
                              {ROLE_LABELS[user.role]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.isActive ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#9B9B9B] whitespace-nowrap">{fmtDate(user.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <UserActionMenu user={user} onEdit={() => setEditUser(user)}
                              onResetPassword={() => setResetUser(user)} onToggleActive={() => handleToggleUser(user)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddSetting && <AddSettingModal onClose={() => setShowAddSetting(false)} onSaved={loadSettings} />}
      {showCreateUser && <UserModal onClose={() => setShowCreateUser(false)} onSaved={() => { loadUsers(); showToast("User created successfully"); }} />}
      {editUser && <UserModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { loadUsers(); showToast("User updated"); }} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onSaved={() => showToast("Password reset successfully")} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
