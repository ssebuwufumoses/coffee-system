"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

interface Buyer { id: string; companyName: string; contactName: string; buyerType: string; }
interface PriceEntry {
  varietyId: string; varietyName: string; varietyCode: string;
  currentPrice: { pricePerKgUgx: string; effectiveDate: string } | null;
}
interface InventoryItem { id: string; name: string; category: string; currentStockKg: string; coffeeVarietyId: string | null; }

export default function NewSaleOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillBuyerId = searchParams.get("buyerId") ?? "";

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    buyerId: prefillBuyerId,
    coffeeVarietyId: "",
    quantityKg: "",
    pricePerKgUgx: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/buyers").then(r => r.json()),
      fetch("/api/prices").then(r => r.json()),
      fetch("/api/inventory").then(r => r.json()),
    ]).then(([b, p, inv]) => {
      setBuyers(b.buyers ?? []);
      setPrices(p.prices ?? []);
      setStock(inv.items ?? []);
    });
  }, []);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  // When variety changes, auto-fill the current price
  function handleVarietyChange(varietyId: string) {
    const entry = prices.find(p => p.varietyId === varietyId);
    setForm(f => ({
      ...f,
      coffeeVarietyId: varietyId,
      pricePerKgUgx: entry?.currentPrice ? String(entry.currentPrice.pricePerKgUgx) : "",
    }));
  }

  const selectedVariety = prices.find(p => p.varietyId === form.coffeeVarietyId);
  const availableStock = stock.find(
    i => i.category === "PROCESSED_BEANS" && i.coffeeVarietyId === form.coffeeVarietyId
  );
  const qty = parseFloat(form.quantityKg) || 0;
  const price = parseFloat(form.pricePerKgUgx) || 0;
  const total = qty * price;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.buyerId) { setError("Please select a buyer"); return; }
    if (!form.coffeeVarietyId) { setError("Please select a coffee variety"); return; }
    if (qty <= 0) { setError("Quantity must be greater than 0"); return; }
    if (price <= 0) { setError("Price must be greater than 0"); return; }

    if (availableStock) {
      const avail = parseFloat(availableStock.currentStockKg);
      if (qty > avail) {
        setError(`Quantity exceeds available stock (${avail.toLocaleString()} kg)`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create order"); return; }
      router.push(`/sales/${data.order.id}`);
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
          href="/sales"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#1D1D1D] mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales
        </Link>
        <h1 className="text-2xl font-extrabold text-[#1D1D1D]">New Sale Order</h1>
        <p className="text-sm text-[#9B9B9B] mt-0.5">Orders start as Draft — confirm when ready to proceed</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E8E8E8] divide-y divide-[#F0F0F0]">
        {/* Buyer */}
        <div className="px-5 py-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Buyer</h2>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-[#1D1D1D]">
                Select Buyer <span className="text-red-500">*</span>
              </label>
              <Link href="/sales/buyers/new?returnTo=/sales/new" className="inline-flex items-center gap-1 rounded-lg border border-[#240C64] px-3 py-1 text-xs font-semibold text-[#240C64] hover:bg-[#240C64] hover:text-white transition-colors">
                + Register new buyer
              </Link>
            </div>
            <select
              value={form.buyerId}
              onChange={e => set("buyerId", e.target.value)}
              required
              className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
            >
              <option value="">— choose buyer —</option>
              {buyers.map(b => (
                <option key={b.id} value={b.id}>
                  {b.companyName} ({b.buyerType === "EXPORTER" ? "Exporter" : "Local Trader"})
                </option>
              ))}
            </select>
            {buyers.length === 0 && (
              <p className="text-xs text-[#9B9B9B] mt-1">
                No buyers registered yet.{" "}
                <Link href="/sales/buyers/new" className="text-[#240C64] font-medium hover:underline">
                  Register one first →
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Coffee & Quantity */}
        <div className="px-5 py-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Order Details</h2>

          <div>
            <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
              Coffee Variety <span className="text-red-500">*</span>
            </label>
            <select
              value={form.coffeeVarietyId}
              onChange={e => handleVarietyChange(e.target.value)}
              required
              className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D]
                focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
            >
              <option value="">— choose variety —</option>
              {prices.map(p => (
                <option key={p.varietyId} value={p.varietyId}>
                  {p.varietyName} ({p.varietyCode})
                </option>
              ))}
            </select>
            {availableStock && (
              <p className="text-xs text-[#9B9B9B] mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" aria-hidden="true" />
                Available: <span className="font-semibold text-[#1D1D1D]">
                  {parseFloat(availableStock.currentStockKg).toLocaleString()} kg
                </span> processed beans in stock
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                Quantity (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.quantityKg}
                onChange={e => set("quantityKg", e.target.value)}
                placeholder="0"
                required
                className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                  focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                Price / kg (UGX) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.pricePerKgUgx}
                onChange={e => set("pricePerKgUgx", e.target.value)}
                placeholder="0"
                required
                className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                  focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
              />
              {selectedVariety?.currentPrice && (
                <p className="text-xs text-[#9B9B9B] mt-1">
                  Current price: <span className="font-semibold text-[#1D1D1D]">
                    UGX {parseFloat(selectedVariety.currentPrice.pricePerKgUgx).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={2}
              placeholder="Optional order notes…"
              className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA]
                focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Order total summary */}
        {total > 0 && (
          <div className="px-5 py-4 bg-[#F6F6F6]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6B]">Order Total</span>
              <div className="text-right">
                <span className="text-xl font-bold text-[#1D1D1D]">
                  UGX {total.toLocaleString("en-UG", { maximumFractionDigits: 0 })}
                </span>
                <p className="text-xs text-[#9B9B9B]">
                  {qty.toLocaleString()} kg × UGX {price.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex items-center justify-end gap-3">
          <Link
            href="/sales"
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
            {saving ? "Creating…" : "Create Draft Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
