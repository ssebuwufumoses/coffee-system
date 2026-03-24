"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Plus, Building2, Phone, Mail, MapPin, ShoppingCart, Pencil, X } from "lucide-react";

interface Buyer {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string | null;
  location: string;
  buyerType: "LOCAL_TRADER" | "EXPORTER";
  createdAt: string;
  _count: { saleOrders: number };
}

const TYPE_LABELS = {
  LOCAL_TRADER: "Local Trader",
  EXPORTER: "Exporter",
};

const EMPTY_FORM = {
  companyName: "", contactName: "", phone: "", email: "",
  location: "", buyerType: "LOCAL_TRADER",
};

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  // edit modal
  const [editing, setEditing] = useState<Buyer | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/buyers")
      .then(r => r.json())
      .then(d => setBuyers(d.buyers ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openEdit(buyer: Buyer) {
    setEditing(buyer);
    setEditForm({
      companyName: buyer.companyName,
      contactName: buyer.contactName,
      phone: buyer.phone,
      email: buyer.email ?? "",
      location: buyer.location,
      buyerType: buyer.buyerType,
    });
    setEditError("");
  }

  function closeEdit() {
    setEditing(null);
    setEditError("");
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/buyers/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? "Failed to update buyer"); return; }
      closeEdit();
      load();
    } catch {
      setEditError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1D1D1D]">Buyers</h1>
          <p className="text-sm text-[#9B9B9B] mt-0.5">{buyers.length} registered buyers</p>
        </div>
        <Link
          href="/sales/buyers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#240C64] px-4 py-2 text-sm font-semibold text-white
            hover:bg-[#1a0948] transition-colors focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Register Buyer
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#F0F0F0]">
            {[1,2,3,4].map(i => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : buyers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-[#E0E0E0] mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-[#6B6B6B]">No buyers registered yet</p>
            <p className="text-xs text-[#9B9B9B] mt-1">Register your first buyer to start creating sale orders</p>
            <Link
              href="/sales/buyers/new"
              className="inline-flex items-center gap-2 mt-4 rounded-lg bg-[#240C64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Register Buyer
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Company</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Contact</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden lg:table-cell">Location</th>
                <th scope="col" className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Type</th>
                <th scope="col" className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Orders</th>
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {buyers.map(buyer => (
                <tr key={buyer.id} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#240C64]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Building2 className="h-4 w-4 text-[#240C64]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1D1D1D]">{buyer.companyName}</p>
                        <p className="text-xs text-[#9B9B9B] flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />{buyer.phone}
                        </p>
                        {/* Mobile sub-text: type + order count */}
                        <div className="sm:hidden mt-1.5 flex items-center gap-2">
                          <span className={`whitespace-nowrap inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            buyer.buyerType === "EXPORTER"
                              ? "bg-[#240C64]/10 border-[#240C64]/20 text-[#240C64]"
                              : "bg-[#F6F6F6] border-[#E8E8E8] text-[#6B6B6B]"
                          }`}>
                            {TYPE_LABELS[buyer.buyerType]}
                          </span>
                          <span className="whitespace-nowrap flex items-center gap-1 text-[11px] text-[#6B6B6B]">
                            <ShoppingCart className="h-3 w-3 flex-shrink-0" />
                            {buyer._count.saleOrders} order{buyer._count.saleOrders !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <p className="text-[#1D1D1D]">{buyer.contactName}</p>
                    {buyer.email && (
                      <p className="text-xs text-[#9B9B9B] flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />{buyer.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <p className="text-[#6B6B6B] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{buyer.location}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center hidden sm:table-cell">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                      buyer.buyerType === "EXPORTER"
                        ? "bg-[#240C64]/10 border-[#240C64]/20 text-[#240C64]"
                        : "bg-[#F6F6F6] border-[#E8E8E8] text-[#6B6B6B]"
                    }`}>
                      {TYPE_LABELS[buyer.buyerType]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center hidden sm:table-cell">
                    <div className="flex items-center justify-center gap-1 text-[#6B6B6B]">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span className="font-semibold text-[#1D1D1D]">{buyer._count.saleOrders}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center justify-end gap-3 pt-0.5">
                      <button
                        onClick={() => openEdit(buyer)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6B6B] hover:text-[#1D1D1D] transition-colors whitespace-nowrap"
                      >
                        <Pencil className="h-3.5 w-3.5" />Edit
                      </button>
                      <Link
                        href={`/sales/new?buyerId=${buyer.id}`}
                        className="text-xs font-semibold text-[#240C64] hover:underline whitespace-nowrap"
                      >
                        New Order
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
              <div>
                <h2 className="text-base font-bold text-[#1D1D1D]">Edit Buyer</h2>
                <p className="text-xs text-[#9B9B9B] mt-0.5">{editing.companyName}</p>
              </div>
              <button
                onClick={closeEdit}
                className="p-1.5 rounded-lg hover:bg-[#F6F6F6] text-[#9B9B9B] hover:text-[#1D1D1D] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="divide-y divide-[#F0F0F0]">
              {editError && (
                <div className="px-5 pt-4">
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {editError}
                  </div>
                </div>
              )}

              {/* Company info */}
              <div className="px-5 py-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Company Information</p>
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.companyName}
                    onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                      focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                      Buyer Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.buyerType}
                      onChange={e => setEditForm(f => ({ ...f, buyerType: e.target.value }))}
                      className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                        focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                    >
                      <option value="LOCAL_TRADER">Local Trader</option>
                      <option value="EXPORTER">Exporter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                        focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="px-5 py-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Contact Person</p>
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.contactName}
                    onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                      focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                        focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="optional"
                      className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                        focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white
                    hover:bg-[#1a0948] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
