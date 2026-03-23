"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewBuyerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    location: "",
    buyerType: "LOCAL_TRADER",
  });

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to register buyer"); return; }
      if (returnTo) {
        router.push(`${returnTo}?buyerId=${data.buyer.id}`);
      } else {
        router.push("/sales/buyers");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={returnTo ?? "/sales/buyers"}
          className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#1D1D1D] mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {returnTo ? "Back to New Order" : "Back to Buyers"}
        </Link>
        <h1 className="text-2xl font-extrabold text-[#1D1D1D]">Register Buyer</h1>
        <p className="text-sm text-[#9B9B9B] mt-0.5">Add a new buyer to the sales pipeline</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E8E8E8] divide-y divide-[#F0F0F0]">
        {/* Company info */}
        <div className="px-5 py-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Company Information</h2>

          <div>
            <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={e => set("companyName", e.target.value)}
              placeholder="e.g. Uganda Coffee Exporters Ltd"
              required
              className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                Buyer Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.buyerType}
                onChange={e => set("buyerType", e.target.value)}
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
                value={form.location}
                onChange={e => set("location", e.target.value)}
                placeholder="e.g. Kampala"
                required
                className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                  focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="px-5 py-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Contact Person</h2>

          <div>
            <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={e => set("contactName", e.target.value)}
              placeholder="Full name of primary contact"
              required
              className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
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
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="+256 7XX XXX XXX"
                required
                className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                  focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="optional"
                className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                  focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex items-center justify-end gap-3">
          <Link
            href={returnTo ?? "/sales/buyers"}
            className="rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white
              hover:bg-[#1a0948] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
          >
            {saving ? "Registering…" : "Register Buyer"}
          </button>
        </div>
      </form>
    </div>
  );
}
