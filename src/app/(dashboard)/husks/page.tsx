"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Leaf, Search, ExternalLink, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

interface Issuance {
  id: string;
  issuedDate: string;
  bagsIssued: number;
  kgEquivalent: string;
  notes: string | null;
  createdAt: string;
  farmer: { id: string; name: string; farmerCode: string };
  issuedBy: { name: string };
  farmerHuskBalance: { earned: number; taken: number; balance: number };
}

export default function HuskIssuancesPage() {
  const [issuances, setIssuances] = useState<Issuance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editing, setEditing] = useState<Issuance | null>(null);
  const [editForm, setEditForm] = useState({ notes: "", issuedDate: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [deleting, setDeleting] = useState<Issuance | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      const res = await fetch(`/api/husks?${params}`);
      const data = await res.json();
      setIssuances(data.issuances ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? issuances.filter(
        (i) =>
          i.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
          i.farmer.farmerCode.toLowerCase().includes(search.toLowerCase())
      )
    : issuances;

  function openEdit(issuance: Issuance) {
    setEditing(issuance);
    setEditForm({
      notes: issuance.notes ?? "",
      issuedDate: issuance.issuedDate.slice(0, 10),
    });
    setEditError("");
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError(""); setEditSaving(true);
    try {
      const res = await fetch(`/api/husks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? "Failed to update"); return; }
      setEditing(null);
      await load();
    } finally { setEditSaving(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteError(""); setDeleteLoading(true);
    try {
      const res = await fetch(`/api/husks/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "Failed to void issuance"); return; }
      setDeleting(null);
      await load();
    } finally { setDeleteLoading(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Husk Issuances"
        description={`${total.toLocaleString()} total issuance records`}
      />

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Filter by farmer name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-secondary bg-surface-primary">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Farmer</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Bags</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden sm:table-cell">KG</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden sm:table-cell">Balance</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Issued By</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden lg:table-cell">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Leaf className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No husk issuances recorded yet</p>
                  <p className="text-gray-300 text-xs mt-1">Issue husks from a farmer&apos;s profile page</p>
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={i.id} className="border-b border-surface-secondary last:border-0 hover:bg-surface-primary/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/farmers/${i.farmer.id}`} className="group">
                      <div className="font-medium text-primary group-hover:underline flex items-center gap-1">
                        {i.farmer.name}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </div>
                      <div className="text-xs text-gray-400">
                        {i.farmer.farmerCode}
                        <span className="sm:hidden"> · {new Date(i.issuedDate).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-deepest">{i.bagsIssued}</span>
                    {/* Balance sub-text on mobile */}
                    {i.farmerHuskBalance && (
                      <div className="sm:hidden mt-0.5">
                        {i.farmerHuskBalance.balance === 0 ? (
                          <span className="text-xs font-semibold text-success">✓ done</span>
                        ) : (
                          <span className={`text-xs font-semibold ${i.farmerHuskBalance.balance > 20 ? "text-warning" : "text-primary"}`}>
                            {i.farmerHuskBalance.balance} left
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 hidden sm:block">
                      {new Date(i.issuedDate).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {Number(i.kgEquivalent).toLocaleString()} kg
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {i.farmerHuskBalance ? (
                      i.farmerHuskBalance.balance === 0 ? (
                        <span className="inline-flex items-center text-xs font-semibold text-success bg-success/10 rounded-full px-2.5 py-1">
                          ✓ Done
                        </span>
                      ) : (
                        <div>
                          <span className={`text-sm font-bold ${i.farmerHuskBalance.balance > 20 ? "text-warning" : "text-primary"}`}>
                            {i.farmerHuskBalance.balance} bags
                          </span>
                          <div className="text-xs text-gray-400">remaining</div>
                        </div>
                      )
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{i.issuedBy.name}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate hidden lg:table-cell">{i.notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(i)}
                        className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#1D1D1D] hover:bg-[#F6F6F6] transition-colors"
                        title="Edit notes / date"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setDeleting(i); setDeleteError(""); }}
                        className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Void issuance"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-secondary">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
              <div>
                <h2 className="text-base font-bold text-[#1D1D1D]">Edit Issuance</h2>
                <p className="text-xs text-[#9B9B9B] mt-0.5">
                  {editing.farmer.name} · {editing.bagsIssued} bag{editing.bagsIssued !== 1 ? "s" : ""}
                  {" "}· {Number(editing.kgEquivalent).toLocaleString()} kg
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-[#F6F6F6] text-[#9B9B9B] hover:text-[#1D1D1D] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="px-5 py-4 space-y-4">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Only the date and notes can be edited. To change the quantity, void this issuance and re-issue.
              </p>

              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Issued Date</label>
                <input
                  type="date"
                  value={editForm.issuedDate}
                  onChange={e => setEditForm(f => ({ ...f, issuedDate: e.target.value }))}
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                    focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                    focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent resize-none"
                />
              </div>

              {editError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditing(null)}
                  className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors disabled:opacity-50">
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setDeleting(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-5 text-center">
              <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-base font-bold text-[#1D1D1D] mb-1">Void this issuance?</h2>
              <p className="text-sm text-[#6B6B6B] mb-1">
                <span className="font-semibold">{deleting.farmer.name}</span> · {deleting.bagsIssued} bag{deleting.bagsIssued !== 1 ? "s" : ""} · {Number(deleting.kgEquivalent).toLocaleString()} kg
              </p>
              <p className="text-xs text-[#9B9B9B] mb-5">
                Stock will be reversed — {Number(deleting.kgEquivalent).toLocaleString()} kg returned to husk inventory. This cannot be undone.
              </p>

              {deleteError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setDeleting(null)}
                  className="flex-1 rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={deleteLoading}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                  {deleteLoading ? "Voiding…" : "Void Issuance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
