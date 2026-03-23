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

// All combinations verified WCAG AAA (≥7:1) against their backgrounds
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ADMIN:         { bg: "#F0EEFF", text: "#3B1FA8", border: "#DDD6FE", dot: "#6D28D9" }, // 9.6:1
  OPERATOR:      { bg: "#EDFBF4", text: "#064E38", border: "#A7F3D0", dot: "#059669" }, // 11.2:1
  STORE_MANAGER: { bg: "#EBF4FF", text: "#1A3A7F", border: "#BFDBFE", dot: "#1D4ED8" }, // 9.9:1
  SALES_FINANCE: { bg: "#FFF8EC", text: "#7A3A0A", border: "#FDE68A", dot: "#D97706" }, // 8.3:1
};

const KNOWN_SETTINGS: { key: string; label: string; description: string; unit?: string }[] = [
  { key: "husk_kg_per_bag",           label: "Husk Weight per Bag",      description: "Weight in kg of a single bag of husks", unit: "kg" },
  { key: "husk_alert_threshold_bags", label: "Husk Alert Threshold",     description: "Alert when husk stock falls below this many bags", unit: "bags" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        display: "flex", alignItems: "center", gap: 10,
        background: type === "success" ? "#ECFDF5" : "#FEF2F2",
        border: `1px solid ${type === "success" ? "#6EE7B7" : "#FECACA"}`,
        color: type === "success" ? "#065F46" : "#991B1B",
        borderRadius: 10, padding: "12px 18px", fontSize: 14, fontWeight: 500,
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
      }}
    >
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Setting Row ─────────────────────────────────────────────────────────────

function SettingRow({
  setting, onSave,
}: {
  setting: SystemSetting;
  onSave: (key: string, value: string) => Promise<void>;
}) {
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
    <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: "#1D1D1D", margin: 0 }}>
          {known?.label ?? setting.key}
        </p>
        {known?.description && (
          <p style={{ fontSize: 12, color: "#9B9B9B", margin: "2px 0 0" }}>{known.description}</p>
        )}
        <code style={{ fontSize: 11, color: "#B0B0B0", background: "#F6F6F6", borderRadius: 4, padding: "1px 6px", marginTop: 4, display: "inline-block" }}>
          {setting.key}
        </code>
      </td>
      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
        {editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={val}
              onChange={e => setVal(e.target.value)}
              style={{
                border: "1.5px solid #D0D0D0", borderRadius: 6, padding: "6px 10px",
                fontSize: 14, width: 120, outline: "none",
              }}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            {known?.unit && <span style={{ fontSize: 13, color: "#9B9B9B" }}>{known.unit}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "#1D1D1D", color: "#FFF", border: "none",
                borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer",
              }}
            >
              <Save size={13} /> {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setVal(setting.value); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9B9B" }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1D1D1D" }}>{setting.value}</span>
            {known?.unit && <span style={{ fontSize: 13, color: "#9B9B9B" }}>{known.unit}</span>}
            <button
              onClick={() => setEditing(true)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "1px solid #E8E8E8",
                borderRadius: 6, padding: "4px 10px", fontSize: 12,
                color: "#6B6B6B", cursor: "pointer",
              }}
            >
              <Pencil size={11} /> Edit
            </button>
          </div>
        )}
      </td>
      <td style={{ padding: "14px 16px", fontSize: 12, color: "#9B9B9B", verticalAlign: "middle" }}>
        {setting.updatedBy ? (
          <>Updated by <strong style={{ color: "#6B6B6B" }}>{setting.updatedBy.name}</strong><br />{fmtDate(setting.updatedAt)}</>
        ) : fmtDate(setting.updatedAt)}
      </td>
    </tr>
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
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FFF", borderRadius: 12, padding: 28, width: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add System Setting</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Key *</label>
          <input
            required value={key} onChange={e => setKey(e.target.value)}
            placeholder="e.g. husk_kg_per_bag"
            style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}
          />
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Value *</label>
          <input
            required value={value} onChange={e => setValue(e.target.value)}
            placeholder="e.g. 50"
            style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}
          />
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Description</label>
          <input
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Optional description"
            style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 18, boxSizing: "border-box" }}
          />
          {error && <p style={{ color: "#991B1B", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #D0D0D0", background: "#FFF", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1D1D1D", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              {saving ? "Saving…" : "Save Setting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create / Edit User Modal ─────────────────────────────────────────────────

function UserModal({
  user, onClose, onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
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

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FFF", borderRadius: 12, padding: 28, width: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{isEdit ? "Edit User" : "Create New User"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Full Name *</label>
          <input
            required value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. John Doe"
            style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}
          />

          {!isEdit && (
            <>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Email Address *</label>
              <input
                required type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 14, boxSizing: "border-box" }}
              />
            </>
          )}

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Role *</label>
          <select
            value={role} onChange={e => setRole(e.target.value as User["role"])}
            style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 14, boxSizing: "border-box", background: "#FFF" }}
          >
            {Object.entries(ROLE_LABELS).map(([r, l]) => (
              <option key={r} value={r}>{l}</option>
            ))}
          </select>

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {isEdit ? "New Password (leave blank to keep current)" : "Password *"}
          </label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <input
              required={!isEdit}
              type={showPw ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current password" : "Min. 8 characters"}
              style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 36px 8px 12px", fontSize: 14, boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9B9B9B" }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p style={{ color: "#991B1B", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #D0D0D0", background: "#FFF", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1D1D1D", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FFF", borderRadius: 12, padding: 28, width: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Reset Password</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <p style={{ color: "#6B6B6B", fontSize: 13, marginBottom: 20 }}>
          Setting a new password for <strong>{user.name}</strong>.
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>New Password *</label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <input
              required autoFocus
              type={showPw ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              style={{ width: "100%", border: "1.5px solid #D0D0D0", borderRadius: 8, padding: "8px 36px 8px 12px", fontSize: 14, boxSizing: "border-box" }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9B9B9B" }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p style={{ color: "#991B1B", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #D0D0D0", background: "#FFF", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1D1D1D", color: "#FFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              {saving ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Action Menu (kebab) ─────────────────────────────────────────────────

function UserActionMenu({
  user,
  onEdit,
  onResetPassword,
  onToggleActive,
}: {
  user: User;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-user-menu]")) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div style={{ position: "relative", display: "inline-block" }} data-user-menu>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 32, height: 32, borderRadius: 6,
          border: "1px solid #E8E8E8", background: open ? "#F6F6F6" : "#FFF",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#6B6B6B",
        }}
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100,
          background: "#FFF", border: "1px solid #E8E8E8", borderRadius: 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 172, padding: 4,
        }}>
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "8px 12px", background: "none",
              border: "none", cursor: "pointer", fontSize: 13, color: "#1D1D1D",
              borderRadius: 6, textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F6F6F6")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <Pencil size={13} style={{ color: "#6B6B6B" }} /> Edit Details
          </button>
          <button
            onClick={() => { setOpen(false); onResetPassword(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "8px 12px", background: "none",
              border: "none", cursor: "pointer", fontSize: 13, color: "#1D1D1D",
              borderRadius: 6, textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F6F6F6")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <KeyRound size={13} style={{ color: "#6B6B6B" }} /> Reset Password
          </button>
          <div style={{ height: 1, background: "#F0F0F0", margin: "4px 0" }} />
          <button
            onClick={() => { setOpen(false); onToggleActive(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "8px 12px", background: "none",
              border: "none", cursor: "pointer", fontSize: 13,
              color: user.isActive ? "#991B1B" : "#065F46",
              borderRadius: 6, textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = user.isActive ? "#FEF2F2" : "#ECFDF5")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            {user.isActive
              ? <><UserX size={13} /> Deactivate Account</>
              : <><UserCheck size={13} /> Activate Account</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<"system" | "users">("system");

  // System settings state
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showAddSetting, setShowAddSetting] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  // Load settings
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const res = await fetch("/api/settings");
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
    }
    setSettingsLoading(false);
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => { loadSettings(); loadUsers(); }, [loadSettings, loadUsers]);

  // Save a setting
  async function handleSaveSetting(key: string, value: string) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      await loadSettings();
      showToast("Setting saved");
    } else {
      showToast("Failed to save setting", "error");
    }
  }

  // Toggle user active/inactive
  async function handleToggleUser(user: User) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      await loadUsers();
      showToast(user.isActive ? `${user.name} deactivated` : `${user.name} activated`);
    } else {
      const d = await res.json();
      showToast(d.error ?? "Failed to update", "error");
    }
  }

  return (
    <div style={{ padding: "32px 32px 60px", maxWidth: 900, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1D1D1D", margin: 0 }}>Settings</h1>
        <p style={{ color: "#6B6B6B", fontSize: 14, margin: "4px 0 0" }}>
          System configuration and user account management
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F6F6F6", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([
          { id: "system", icon: <Settings size={15} />, label: "System Config" },
          { id: "users",  icon: <Users size={15} />,   label: "User Management" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? "#FFF" : "transparent",
              color: tab === t.id ? "#1D1D1D" : "#6B6B6B",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── System Config Tab ── */}
      {tab === "system" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1D1D1D" }}>System Configuration</h2>
              <p style={{ fontSize: 13, color: "#9B9B9B", margin: "2px 0 0" }}>Operational parameters that affect system behaviour</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={loadSettings}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid #E8E8E8", background: "#FFF", cursor: "pointer", fontSize: 13, color: "#6B6B6B" }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
              <button
                onClick={() => setShowAddSetting(true)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: "#1D1D1D", color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                <Plus size={14} /> Add Setting
              </button>
            </div>
          </div>

          {settingsLoading ? (
            <p style={{ color: "#9B9B9B", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading…</p>
          ) : settings.length === 0 ? (
            <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E8E8E8", padding: "48px 24px", textAlign: "center" }}>
              <Settings size={32} style={{ color: "#D0D0D0", marginBottom: 12 }} />
              <p style={{ color: "#9B9B9B", fontSize: 14, margin: 0 }}>No settings found. Add your first setting above.</p>
            </div>
          ) : (
            <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E8E8E8", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F8F8", borderBottom: "1px solid #F0F0F0" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", width: "45%" }}>Setting</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", width: "30%" }}>Value</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map(s => (
                    <SettingRow key={s.id} setting={s} onSave={handleSaveSetting} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1D1D1D" }}>User Accounts</h2>
              <p style={{ fontSize: 13, color: "#9B9B9B", margin: "2px 0 0" }}>
                {users.filter(u => u.isActive).length} active · {users.filter(u => !u.isActive).length} inactive
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={loadUsers}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1px solid #E8E8E8", background: "#FFF", cursor: "pointer", fontSize: 13, color: "#6B6B6B" }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
              <button
                onClick={() => setShowCreateUser(true)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: "#1D1D1D", color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                <Plus size={14} /> New User
              </button>
            </div>
          </div>

          {usersLoading ? (
            <p style={{ color: "#9B9B9B", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading…</p>
          ) : (
            <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E8E8E8", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: "#F8F8F8", borderBottom: "1px solid #F0F0F0" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>User</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Role</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Status</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Joined</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const rc = ROLE_COLORS[user.role] ?? ROLE_COLORS.OPERATOR;
                    return (
                      <tr key={user.id} style={{ borderBottom: "1px solid #F0F0F0" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: rc.dot,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 700, color: "#FFF", flexShrink: 0,
                              letterSpacing: 0.3,
                            }}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 14, color: "#1D1D1D", margin: 0 }}>{user.name}</p>
                              <p style={{ fontSize: 12, color: "#9B9B9B", margin: 0 }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: rc.bg, color: rc.text,
                            border: `1px solid ${rc.border}`,
                            borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: rc.dot, flexShrink: 0 }} />
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                          {/* Active: #064E38 on #EDFBF4 = 11:1 AAA  |  Inactive: #3F3F46 on #F4F4F5 = 9.4:1 AAA */}
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: user.isActive ? "#EDFBF4" : "#F4F4F5",
                            color: user.isActive ? "#064E38" : "#3F3F46",
                            border: `1px solid ${user.isActive ? "#A7F3D0" : "#D4D4D8"}`,
                            borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600,
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: user.isActive ? "#059669" : "#A1A1AA", flexShrink: 0 }} />
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#9B9B9B", whiteSpace: "nowrap" }}>
                          {fmtDate(user.createdAt)}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <UserActionMenu
                            user={user}
                            onEdit={() => setEditUser(user)}
                            onResetPassword={() => setResetUser(user)}
                            onToggleActive={() => handleToggleUser(user)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showAddSetting && (
        <AddSettingModal onClose={() => setShowAddSetting(false)} onSaved={loadSettings} />
      )}
      {showCreateUser && (
        <UserModal onClose={() => setShowCreateUser(false)} onSaved={() => { loadUsers(); showToast("User created successfully"); }} />
      )}
      {editUser && (
        <UserModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { loadUsers(); showToast("User updated"); }} />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onSaved={() => showToast("Password reset successfully")} />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
