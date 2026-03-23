"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, AlertTriangle, Coffee, Leaf, Scale,
  ArrowUpRight, ArrowDownRight, RefreshCw, Activity, Plus, X, SlidersHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  name: string;
  category: "RAW_COFFEE" | "PROCESSED_BEANS" | "HUSKS" | "PACKAGING" | "OTHER";
  currentStockKg: string;
  lowStockAlertKg: string | null;
  coffeeVariety: { name: string; code: string } | null;
}

interface Movement {
  id: string;
  movementType: string;
  direction: "IN" | "OUT";
  quantityKg: string;
  balanceAfterKg: string;
  notes: string | null;
  createdAt: string;
  inventoryItem: { name: string; category: string };
  recordedBy: { name: string };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CAT = {
  RAW_COFFEE:      { label: "Raw Coffee",      Icon: Scale,   order: 0 },
  PROCESSED_BEANS: { label: "Processed Beans", Icon: Coffee,  order: 1 },
  HUSKS:           { label: "Husks (Kikuta)",  Icon: Leaf,    order: 2 },
  PACKAGING:       { label: "Packaging",       Icon: Package, order: 3 },
  OTHER:           { label: "Other",           Icon: Package, order: 4 },
} as const;

const TX_LABELS: Record<string, string> = {
  INTAKE:               "Farmer Intake",
  MILLING_INPUT:        "Milling Input",
  MILLING_OUTPUT_BEANS: "Milling → Beans",
  MILLING_OUTPUT_HUSKS: "Milling → Husks",
  HUSK_ISSUANCE:        "Husk Issuance",
  SALE_DISPATCH:        "Sale Dispatch",
  ADJUSTMENT:           "Adjustment",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKg(v: string | number) {
  const n = parseFloat(String(v));
  if (n >= 1000) return { value: (n / 1000).toFixed(2), unit: "tonnes" };
  return { value: n.toLocaleString("en-UG", { maximumFractionDigits: 1 }), unit: "kg" };
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" });
}

// ─── Summary card — Cloudflare style ─────────────────────────────────────────

function SummaryCard({
  label, value, unit, sub, Icon, alert,
}: {
  label: string; value: string; unit: string; sub: string;
  Icon: React.ElementType; alert?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">{label}</p>
        <Icon className="h-4 w-4 text-[#9B9B9B]" aria-hidden="true" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[2rem] font-bold leading-none tracking-tight"
          style={{ color: alert ? "#B91C1C" : "#1D1D1D" }}
        >
          {value}
        </span>
        <span className="text-sm font-medium text-[#6B6B6B]">{unit}</span>
      </div>
      <p className="text-xs text-[#9B9B9B] mt-2 leading-snug">{sub}</p>
    </div>
  );
}

// ─── Stock card — Cloudflare style ───────────────────────────────────────────

function StockCard({ item }: { item: InventoryItem }) {
  const cat = CAT[item.category as keyof typeof CAT] ?? CAT.OTHER;
  const { Icon } = cat;
  const stock = parseFloat(item.currentStockKg);
  const threshold = item.lowStockAlertKg ? parseFloat(item.lowStockAlertKg) : null;
  const isLow = threshold !== null && stock <= threshold;
  const barPct = threshold && threshold > 0
    ? Math.min(100, (stock / (threshold * 3)) * 100)
    : null;
  const { value, unit } = fmtKg(stock);

  return (
    <div className={`bg-white rounded-lg border p-4 ${isLow ? "border-[#FECACA]" : "border-[#E8E8E8]"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 flex-shrink-0 text-[#9B9B9B]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1D1D1D] truncate">{item.name}</p>
            {item.coffeeVariety && (
              <p className="text-xs text-[#9B9B9B] mt-0.5">{item.coffeeVariety.code} · {item.coffeeVariety.name}</p>
            )}
          </div>
        </div>
        {isLow ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700 flex-shrink-0">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Low
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 flex-shrink-0">
            OK
          </span>
        )}
      </div>

      {/* Number — big and dark like Cloudflare */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span
          className="text-[1.75rem] font-bold leading-none tracking-tight"
          style={{ color: isLow ? "#B91C1C" : "#1D1D1D" }}
        >
          {value}
        </span>
        <span className="text-sm font-medium text-[#6B6B6B]">{unit}</span>
      </div>

      {/* Progress bar */}
      {barPct !== null && (
        <div className="space-y-1">
          <div
            className="h-1.5 w-full bg-[#F3F3F3] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(barPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stock level: ${Math.round(barPct)}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(1, barPct)}%`,
                backgroundColor: isLow ? "#EF4444" : barPct > 60 ? "#10B981" : "#F59E0B",
              }}
            />
          </div>
          <p className="text-xs text-[#9B9B9B]">
            Threshold: <span className="font-medium text-[#6B6B6B]">{fmtKg(item.lowStockAlertKg!).value} {fmtKg(item.lowStockAlertKg!).unit}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({ category, items }: { category: string; items: InventoryItem[] }) {
  const cat = CAT[category as keyof typeof CAT] ?? CAT.OTHER;
  const { Icon } = cat;
  const totalKg = items.reduce((s, i) => s + parseFloat(i.currentStockKg), 0);
  const alertCount = items.filter(
    i => i.lowStockAlertKg && parseFloat(i.currentStockKg) <= parseFloat(i.lowStockAlertKg)
  ).length;
  const { value: tv, unit: tu } = fmtKg(totalKg);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#6B6B6B]" aria-hidden="true" />
          <h2 className="text-sm font-bold text-[#1D1D1D]">{cat.label}</h2>
          <span className="text-xs text-[#9B9B9B]">{items.length} item{items.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          {alertCount > 0 && (
            <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
              {alertCount} low stock
            </span>
          )}
          <span className="text-xs font-bold text-[#1D1D1D]">{tv} {tu}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(item => <StockCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface Variety { id: string; name: string; code: string; }

const CATEGORY_OPTIONS = [
  { value: "RAW_COFFEE",      label: "Raw Coffee" },
  { value: "PROCESSED_BEANS", label: "Processed Beans" },
  { value: "HUSKS",           label: "Husks (Kikuta)" },
  { value: "PACKAGING",       label: "Packaging" },
  { value: "OTHER",           label: "Other" },
];

const VARIETY_CATEGORIES = ["RAW_COFFEE", "PROCESSED_BEANS"];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Add item modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", category: "PROCESSED_BEANS", coffeeVarietyId: "", lowStockAlertKg: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Adjust stock modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjForm, setAdjForm] = useState({ inventoryItemId: "", direction: "IN", quantityKg: "", notes: "" });
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError, setAdjError] = useState("");

  const loadAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [invRes, movRes, varRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/movements?limit=30"),
        fetch("/api/coffee-varieties"),
      ]);
      const [invData, movData, varData] = await Promise.all([invRes.json(), movRes.json(), varRes.json()]);
      setItems(invData.items ?? []);
      setMovements(movData.movements ?? []);
      setVarieties(varData.varieties ?? []);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    setAdjError(""); setAdjLoading(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjForm),
      });
      const data = await res.json();
      if (!res.ok) { setAdjError(data.error ?? "Failed to record adjustment"); return; }
      setShowAdjust(false);
      setAdjForm({ inventoryItemId: "", direction: "IN", quantityKg: "", notes: "" });
      await loadAll(true);
    } finally { setAdjLoading(false); }
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(""); setAddLoading(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to create item"); return; }
      setShowAdd(false);
      setAddForm({ name: "", category: "PROCESSED_BEANS", coffeeVarietyId: "", lowStockAlertKg: "" });
      await loadAll(true);
    } finally { setAddLoading(false); }
  }

  const grouped = Object.entries(CAT)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([cat]) => ({ category: cat, items: items.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  const totalRaw       = items.filter(i => i.category === "RAW_COFFEE").reduce((s, i) => s + parseFloat(i.currentStockKg), 0);
  const totalProcessed = items.filter(i => i.category === "PROCESSED_BEANS").reduce((s, i) => s + parseFloat(i.currentStockKg), 0);
  const totalHusks     = items.filter(i => i.category === "HUSKS").reduce((s, i) => s + parseFloat(i.currentStockKg), 0);
  const lowCount       = items.filter(i => i.lowStockAlertKg && parseFloat(i.currentStockKg) <= parseFloat(i.lowStockAlertKg)).length;

  const rawFmt  = fmtKg(totalRaw);
  const procFmt = fmtKg(totalProcessed);
  const hskFmt  = fmtKg(totalHusks);

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1D]">Inventory</h1>
          <p className="text-sm text-[#9B9B9B] mt-0.5">
            Live stock levels — {items.length} items tracked
            <span className="mx-2" aria-hidden="true">·</span>
            Updated {lastRefreshed.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowAdjust(true); setAdjError(""); setAdjForm({ inventoryItemId: "", direction: "IN", quantityKg: "", notes: "" }); }}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#3D3D3D] hover:bg-[#F6F6F6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust Stock
          </button>
          <button
            onClick={() => { setShowAdd(true); setAddError(""); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#240C64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#3D3D3D]
              hover:bg-[#F6F6F6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-lg border border-[#E8E8E8] animate-pulse" />)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-lg border border-[#E8E8E8] animate-pulse" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Raw Coffee"
              value={rawFmt.value} unit={rawFmt.unit}
              sub="Unprocessed stock in warehouse"
              Icon={Scale}
            />
            <SummaryCard
              label="Processed Beans"
              value={procFmt.value} unit={procFmt.unit}
              sub="Ready for sale or dispatch"
              Icon={Coffee}
            />
            <SummaryCard
              label="Husks (Kikuta)"
              value={hskFmt.value} unit={hskFmt.unit}
              sub="Available to issue to farmers"
              Icon={Leaf}
            />
            <SummaryCard
              label="Low Stock Alerts"
              value={String(lowCount)}
              unit={lowCount === 1 ? "item" : "items"}
              sub={lowCount > 0 ? "Require restocking attention" : "All items adequately stocked"}
              Icon={AlertTriangle}
              alert={lowCount > 0}
            />
          </div>

          {/* Alert banner */}
          {lowCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" aria-hidden="true" />
              <div>
                <span className="text-sm font-semibold text-red-700">
                  {lowCount} item{lowCount !== 1 ? "s" : ""} below stock threshold.
                </span>
                <span className="text-sm text-red-600 ml-1">
                  Review the highlighted cards below and arrange restocking.
                </span>
              </div>
            </div>
          )}

          {/* Category sections */}
          <div className="space-y-8">
            {grouped.map(({ category, items: catItems }) => (
              <CategorySection key={category} category={category} items={catItems} />
            ))}
          </div>
        </>
      )}

      {/* Movement ledger */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#9B9B9B]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[#1D1D1D]">Stock Movement Ledger</h2>
          </div>
          <span className="text-xs text-[#9B9B9B] font-medium">Last 30 entries</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E8E8] bg-[#F6F6F6]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Item</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Type</th>
              <th scope="col" className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Flow</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Qty (kg)</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Balance</th>
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden lg:table-cell">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14">
                  <Activity className="h-8 w-8 text-[#E0E0E0] mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm font-medium text-[#6B6B6B]">No stock movements recorded yet</p>
                  <p className="text-xs text-[#9B9B9B] mt-1">Changes from intake, milling and sales appear here</p>
                </td>
              </tr>
            ) : (
              movements.map((m) => {
                const isIn = m.direction === "IN";
                const cat = CAT[m.inventoryItem.category as keyof typeof CAT] ?? CAT.OTHER;
                const { Icon: ItemIcon } = cat;

                return (
                  <tr key={m.id} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <ItemIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#9B9B9B]" aria-hidden="true" />
                        <div>
                          <p className="font-medium text-[#1D1D1D]">{m.inventoryItem.name}</p>
                          {/* Type + by — visible on mobile only */}
                          <p className="text-xs text-[#9B9B9B] sm:hidden">
                            {TX_LABELS[m.movementType] ?? m.movementType} · {m.recordedBy.name}
                          </p>
                          <p className="text-xs text-[#9B9B9B]">{fmtDate(m.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#6B6B6B] hidden sm:table-cell">
                      <p>{TX_LABELS[m.movementType] ?? m.movementType}</p>
                      <p className="text-xs text-[#9B9B9B]">{fmtDate(m.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                        isIn
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-red-50 border-red-200 text-red-700"
                      }`}>
                        {isIn
                          ? <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          : <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
                        {isIn ? "IN" : "OUT"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-sm font-bold ${isIn ? "text-emerald-700" : "text-red-700"}`}>
                        {isIn ? "+" : "−"}{parseFloat(m.quantityKg).toLocaleString()}
                      </span>
                      {/* Balance sub-text — visible on mobile only */}
                      <p className="text-xs text-[#9B9B9B] sm:hidden mt-0.5">
                        → {parseFloat(m.balanceAfterKg).toLocaleString()} kg
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
                      <span className="text-sm font-semibold text-[#1D1D1D]">
                        {parseFloat(m.balanceAfterKg).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B6B6B] text-sm hidden lg:table-cell">{m.recordedBy.name}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Adjust Stock Modal ───────────────────────────────────────────── */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowAdjust(false); }}>
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1D1D1D]">Manual Stock Adjustment</h3>
                <p className="text-xs text-[#9B9B9B] mt-0.5">Add or remove stock with a recorded reason</p>
              </div>
              <button onClick={() => setShowAdjust(false)} className="text-[#9B9B9B] hover:text-[#1D1D1D] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitAdjust} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                  Inventory Item <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={adjForm.inventoryItemId}
                  onChange={e => setAdjForm(f => ({ ...f, inventoryItemId: e.target.value }))}
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                >
                  <option value="">Select item…</option>
                  {items.map(item => {
                    const cat = CAT[item.category as keyof typeof CAT] ?? CAT.OTHER;
                    return (
                      <option key={item.id} value={item.id}>
                        {item.name} — {cat.label} ({fmtKg(item.currentStockKg).value} {fmtKg(item.currentStockKg).unit})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                    Direction <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["IN", "OUT"] as const).map(dir => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setAdjForm(f => ({ ...f, direction: dir }))}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          adjForm.direction === dir
                            ? dir === "IN"
                              ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                              : "bg-red-50 border-red-400 text-red-700"
                            : "border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#F6F6F6]"
                        }`}
                      >
                        {dir === "IN" ? "+ IN" : "− OUT"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                    Quantity (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 250"
                    value={adjForm.quantityKg}
                    onChange={e => setAdjForm(f => ({ ...f, quantityKg: e.target.value }))}
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                  Reason / Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Stock count correction, damage write-off, opening balance…"
                  value={adjForm.notes}
                  onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent resize-none"
                />
                <p className="text-xs text-[#9B9B9B] mt-1">Required — every adjustment must have a recorded reason for audit purposes.</p>
              </div>

              {adjError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{adjError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdjust(false)}
                  className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={adjLoading}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    adjForm.direction === "OUT" ? "bg-red-600 hover:bg-red-700" : "bg-[#240C64] hover:bg-[#1a0948]"
                  }`}>
                  {adjLoading ? "Saving…" : adjForm.direction === "OUT" ? "Remove Stock" : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Inventory Item Modal ─────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1D1D1D]">Add Inventory Item</h3>
                <p className="text-xs text-[#9B9B9B] mt-0.5">Create a new stock tracking item</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-[#9B9B9B] hover:text-[#1D1D1D] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitAdd} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value, coffeeVarietyId: "" }))}
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                >
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {VARIETY_CATEGORIES.includes(addForm.category) && (
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                    Coffee Variety <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={addForm.coffeeVarietyId}
                    onChange={e => setAddForm(f => ({ ...f, coffeeVarietyId: e.target.value }))}
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  >
                    <option value="">Select variety…</option>
                    {varieties.map(v => <option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={addForm.category === "PROCESSED_BEANS" ? "e.g. Kiboko Processed Beans" : "e.g. Packaging Bags"}
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
                  Low Stock Alert Threshold (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 500"
                  value={addForm.lowStockAlertKg}
                  onChange={e => setAddForm(f => ({ ...f, lowStockAlertKg: e.target.value }))}
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                />
                <p className="text-xs text-[#9B9B9B] mt-1">Stock starts at 0 kg. Leave blank for no alert.</p>
              </div>

              {addError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addLoading} className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors disabled:opacity-50">
                  {addLoading ? "Creating…" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
