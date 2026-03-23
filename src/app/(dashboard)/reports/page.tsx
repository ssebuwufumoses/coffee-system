"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3, Wheat, Factory,
  ChevronDown, ChevronUp, Leaf, Banknote, AlertTriangle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUgx(v: number) {
  if (v >= 1_000_000_000) return `UGX ${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `UGX ${(v / 1_000_000).toFixed(2)}M`;
  return `UGX ${Math.round(v).toLocaleString()}`;
}
function fmtKg(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M kg`;
  if (v >= 1000) return `${(v / 1000).toFixed(2)} tonnes`;
  return `${v.toLocaleString()} kg`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT:      { label: "Draft",      bg: "#F6F6F6", text: "#6B6B6B", border: "#E8E8E8" },
  CONFIRMED:  { label: "Confirmed",  bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  DISPATCHED: { label: "Dispatched", bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  INVOICED:   { label: "Invoiced",   bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  PAID:       { label: "Paid",       bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" },
};

// ─── Shared components ────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#9B9B9B] mb-2">{label}</p>
      <p className="text-2xl font-bold text-[#1D1D1D] leading-none">{value}</p>
      {sub && <p className="text-xs text-[#9B9B9B] mt-1.5">{sub}</p>}
    </div>
  );
}

function DateFilter({ from, to, onChange }: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
}) {
  const presets = [
    { label: "This month", fn: () => {
      const now = new Date();
      return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, new Date().toISOString().slice(0, 10)];
    }},
    { label: "Last month", fn: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
    }},
    { label: "This year", fn: () => [`${new Date().getFullYear()}-01-01`, new Date().toISOString().slice(0, 10)] },
    { label: "All time", fn: () => ["", ""] },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(p => (
        <button key={p.label} onClick={() => { const [f, t] = p.fn(); onChange(f, t); }}
          className="rounded-lg border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#6B6B6B] hover:border-[#240C64] hover:text-[#240C64] transition-colors bg-white">
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-2">
        <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
          className="rounded-lg border border-[#E8E8E8] px-2.5 py-1.5 text-xs text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64]" />
        <span className="text-xs text-[#9B9B9B]">to</span>
        <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
          className="rounded-lg border border-[#E8E8E8] px-2.5 py-1.5 text-xs text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#240C64]" />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] hover:bg-[#F9F9F9] transition-colors">
        <h3 className="text-sm font-bold text-[#1D1D1D]">{title}</h3>
        {open ? <ChevronUp className="h-4 w-4 text-[#9B9B9B]" /> : <ChevronDown className="h-4 w-4 text-[#9B9B9B]" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Tab: Sales ───────────────────────────────────────────────────────────────

function SalesReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports/sales?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-12 text-center text-sm text-[#9B9B9B]">Loading…</div>;
  if (!data) return null;

  const { summary, orders, byBuyer, byVariety } = data;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard label="Total Orders" value={summary.totalOrders.toString()} />
        <SummaryCard label="Total Revenue" value={fmtUgx(summary.totalRevenue)} />
        <SummaryCard label="Total Volume" value={fmtKg(summary.totalKg)} />
        <SummaryCard label="Collected" value={fmtUgx(summary.totalPaid)} sub={`${summary.totalRevenue > 0 ? ((summary.totalPaid / summary.totalRevenue) * 100).toFixed(0) : 0}% of revenue`} />
        <SummaryCard label="Outstanding" value={fmtUgx(summary.outstanding)} />
      </div>

      {/* By Buyer */}
      <Section title="Revenue by Buyer">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Buyer</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Orders</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Volume</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byBuyer.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-sm text-[#9B9B9B]">No data for selected period</td></tr>
            ) : byBuyer.map((b: any) => (
              <tr key={b.buyerName} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{b.buyerName}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{b.orders}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtKg(b.totalKg)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#1D1D1D]">{fmtUgx(b.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
          {byBuyer.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#E8E8E8]">
                <td className="px-5 py-3 font-bold text-[#1D1D1D]">Total</td>
                <td className="px-4 py-3 text-right font-bold text-[#1D1D1D]">{summary.totalOrders}</td>
                <td className="px-4 py-3 text-right font-bold text-[#1D1D1D]">{fmtKg(summary.totalKg)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#240C64]">{fmtUgx(summary.totalRevenue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Section>

      {/* By Variety */}
      <Section title="Revenue by Coffee Variety">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Variety</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Orders</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Volume</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byVariety.map((v: any) => (
              <tr key={v.variety} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{v.variety} <span className="text-xs text-[#9B9B9B] font-normal">({v.code})</span></td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{v.orders}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtKg(v.totalKg)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#1D1D1D]">{fmtUgx(v.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Orders detail */}
      <Section title={`All Orders (${orders.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Order</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Buyer</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden lg:table-cell">Variety</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Volume</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Amount</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Outstanding</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Status</th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-sm text-[#9B9B9B]">No orders for selected period</td></tr>
              ) : orders.map((o: any) => {
                const sc = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.DRAFT;
                return (
                  <tr key={o.id} className="hover:bg-[#F9F9F9]">
                    <td className="px-5 py-3">
                      <Link href={`/sales/${o.id}`} className="font-bold text-[#240C64] hover:underline">{o.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden md:table-cell">{o.buyer}</td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden lg:table-cell">{o.variety}</td>
                    <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtKg(o.quantityKg)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1D1D1D]">{fmtUgx(o.totalAmountUgx)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={o.outstandingUgx > 0 ? "text-red-700 font-semibold" : "text-emerald-700 font-semibold"}>
                        {o.outstandingUgx > 0 ? fmtUgx(o.outstandingUgx) : "Cleared"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                        style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>{sc.label}</span>
                    </td>
                    <td className="px-5 py-3 text-[#9B9B9B] text-xs hidden md:table-cell">{fmtDate(o.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Intake ──────────────────────────────────────────────────────────────

function IntakeReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports/intake?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-12 text-center text-sm text-[#9B9B9B]">Loading…</div>;
  if (!data) return null;
  const { summary, byFarmer, byVariety, deliveries } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Deliveries" value={summary.totalDeliveries.toString()} />
        <SummaryCard label="Total Weight" value={fmtKg(summary.totalKg)} />
        <SummaryCard label="Unique Farmers" value={summary.uniqueFarmers.toString()} />
      </div>

      <Section title="Top Farmers by Volume">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Farmer</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Code</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Deliveries</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Total Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byFarmer.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-sm text-[#9B9B9B]">No data</td></tr>
            ) : byFarmer.map((f: any) => (
              <tr key={f.farmerCode} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{f.farmerName}</td>
                <td className="px-4 py-3 text-[#9B9B9B] hidden sm:table-cell">{f.farmerCode}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{f.deliveries}</td>
                <td className="px-5 py-3 text-right font-bold text-[#1D1D1D]">{fmtKg(f.totalKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Volume by Variety">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Variety</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Deliveries</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Total Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byVariety.map((v: any) => (
              <tr key={v.code} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{v.variety} <span className="text-xs text-[#9B9B9B]">({v.code})</span></td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{v.deliveries}</td>
                <td className="px-5 py-3 text-right font-bold text-[#1D1D1D]">{fmtKg(v.totalKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`All Deliveries (${deliveries.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Farmer</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Location</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Variety</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Weight</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Milling Status</th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {deliveries.map((d: any) => {
                const millingStatus: Record<string, { label: string; bg: string; color: string }> = {
                  PENDING:     { label: "Pending",     bg: "#FEF3C7", color: "#92400E" },
                  IN_PROGRESS: { label: "In Progress", bg: "#EFF6FF", color: "#1D4ED8" },
                  MILLED:      { label: "Milled",      bg: "#ECFDF5", color: "#065F46" },
                };
                const ms = millingStatus[d.status] ?? millingStatus.PENDING;
                return (
                  <tr key={d.id} className="hover:bg-[#F9F9F9]">
                    <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{d.farmer} <span className="text-xs text-[#9B9B9B]">{d.farmerCode}</span></td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden md:table-cell">{d.location}</td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">{d.variety}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1D1D1D]">{fmtKg(d.weightKg)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: ms.bg, color: ms.color }}>{ms.label}</span>
                    </td>
                    <td className="px-5 py-3 text-[#9B9B9B] text-xs hidden md:table-cell">{fmtDate(d.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Milling ─────────────────────────────────────────────────────────────

function MillingReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports/milling?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-12 text-center text-sm text-[#9B9B9B]">Loading…</div>;
  if (!data) return null;
  const { summary, byVariety, batches } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard label="Batches" value={summary.totalBatches.toString()} />
        <SummaryCard label="Total Input" value={fmtKg(summary.totalInputKg)} />
        <SummaryCard label="Beans Output" value={fmtKg(summary.totalBeansKg)} />
        <SummaryCard label="Husks Output" value={fmtKg(summary.totalHusksKg)} />
        <SummaryCard label="Avg Conversion" value={`${summary.avgConversionRate}%`} sub="Beans / Input" />
      </div>

      <Section title="Performance by Variety">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Variety</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Batches</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Input</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Beans Out</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Husks Out</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byVariety.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-sm text-[#9B9B9B]">No completed batches</td></tr>
            ) : byVariety.map((v: any) => (
              <tr key={v.code} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{v.name} <span className="text-xs text-[#9B9B9B]">({v.code})</span></td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{v.batches}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtKg(v.inputKg)}</td>
                <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{fmtKg(v.beansKg)}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtKg(v.husksKg)}</td>
                <td className="px-5 py-3 text-right font-bold text-[#240C64]">{v.avgConversion}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`Completed Batches (${batches.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Batch</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Variety</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Input</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Beans</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Husks</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Rate</th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {batches.map((b: any) => {
                const lowYield = b.conversionRate < 45;
                return (
                  <tr key={b.id} className={lowYield ? "bg-red-50 hover:bg-red-100" : "hover:bg-[#F9F9F9]"}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/milling/${b.id}`} className="font-bold text-[#240C64] hover:underline">{b.batchNumber}</Link>
                        {lowYield && <span title="Below 45% conversion"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /></span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">{b.variety}</td>
                    <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtKg(b.inputKg)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{fmtKg(b.beansKg)}</td>
                    <td className="px-4 py-3 text-right text-[#6B6B6B] hidden md:table-cell">{fmtKg(b.husksKg)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${lowYield ? "text-red-600" : "text-[#240C64]"}`}>
                      {b.conversionRate.toFixed(1)}%
                    </td>
                    <td className="px-5 py-3 text-[#9B9B9B] text-xs hidden md:table-cell">{fmtDate(b.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Husks ───────────────────────────────────────────────────────────────

function HusksReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports/husks?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-12 text-center text-sm text-[#9B9B9B]">Loading…</div>;
  if (!data) return null;
  const { summary, byFarmer, issuances } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total Issuances" value={summary.totalIssuances.toString()} />
        <SummaryCard label="Bags Issued" value={summary.totalBagsIssued.toString()} />
        <SummaryCard label="KG Issued" value={fmtKg(summary.totalKgIssued)} />
        <SummaryCard label="Warehouse Stock" value={fmtKg(summary.warehouseStockKg)} sub="Current husk balance" />
      </div>

      <Section title="Husks by Farmer">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Farmer</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Location</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Bags Earned</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Bags Issued</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byFarmer.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-[#9B9B9B]">No issuances for selected period</td></tr>
            ) : byFarmer.map((f: any) => (
              <tr key={f.farmerCode} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{f.name} <span className="text-xs text-[#9B9B9B]">{f.farmerCode}</span></td>
                <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">{f.location}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{f.totalEarned}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#1D1D1D]">{f.bagsIssued}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-bold ${f.currentBalance > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                    {f.currentBalance > 0 ? `${f.currentBalance} bags` : "✓ Cleared"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`All Issuances (${issuances.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Farmer</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Bags</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">KG</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Balance After</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Issued By</th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {issuances.map((i: any) => (
                <tr key={i.id} className="hover:bg-[#F9F9F9]">
                  <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{i.farmer} <span className="text-xs text-[#9B9B9B]">{i.farmerCode}</span></td>
                  <td className="px-4 py-3 text-right font-bold text-[#1D1D1D]">{i.bagsIssued}</td>
                  <td className="px-4 py-3 text-right text-[#6B6B6B] hidden sm:table-cell">{fmtKg(i.kgEquivalent)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${i.farmerBalance > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                      {i.farmerBalance > 0 ? `${i.farmerBalance} bags` : "✓ Cleared"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6B] hidden md:table-cell">{i.issuedBy}</td>
                  <td className="px-5 py-3 text-[#9B9B9B] text-xs hidden md:table-cell">{fmtDate(i.issuedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Farmer Payments ─────────────────────────────────────────────────────

function PaymentsReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports/payments?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-12 text-center text-sm text-[#9B9B9B]">Loading…</div>;
  if (!data) return null;
  const { summary, byMethod, byFarmer, payments } = data;

  const METHOD_LABELS: Record<string, string> = {
    CASH: "Cash", MOBILE_MONEY: "Mobile Money", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Payments" value={summary.totalPayments.toString()} />
        <SummaryCard label="Total Paid Out" value={fmtUgx(summary.totalPaidUgx)} />
        <SummaryCard label="Farmers Paid" value={summary.uniqueFarmers.toString()} />
      </div>

      <Section title="By Payment Method">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Method</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Count</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Total Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byMethod.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-sm text-[#9B9B9B]">No payments for selected period</td></tr>
            ) : byMethod.map((m: any) => (
              <tr key={m.method} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{METHOD_LABELS[m.method] ?? m.method}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{m.count}</td>
                <td className="px-5 py-3 text-right font-bold text-[#240C64]">{fmtUgx(m.totalUgx)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="By Farmer">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
              <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Farmer</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Location</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Payments</th>
              <th scope="col" className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Total Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {byFarmer.map((f: any) => (
              <tr key={f.farmerCode} className="hover:bg-[#F9F9F9]">
                <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{f.name} <span className="text-xs text-[#9B9B9B]">{f.farmerCode}</span></td>
                <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">{f.location}</td>
                <td className="px-4 py-3 text-right text-[#6B6B6B]">{f.payments}</td>
                <td className="px-5 py-3 text-right font-bold text-[#240C64]">{fmtUgx(f.totalPaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`All Payments (${payments.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Farmer</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Amount</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Method</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Reference</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Recorded By</th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm text-[#9B9B9B]">No payments for selected period</td></tr>
              ) : payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-[#F9F9F9]">
                  <td className="px-5 py-3 font-semibold text-[#1D1D1D]">{p.farmer} <span className="text-xs text-[#9B9B9B]">{p.farmerCode}</span></td>
                  <td className="px-4 py-3 text-right font-bold text-[#240C64]">{fmtUgx(p.amount)}</td>
                  <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                  <td className="px-4 py-3 text-[#9B9B9B] hidden md:table-cell">{p.referenceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6B6B6B] hidden md:table-cell">{p.recordedBy}</td>
                  <td className="px-5 py-3 text-[#9B9B9B] text-xs hidden md:table-cell">{fmtDate(p.paymentDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "sales",    label: "Sales",            Icon: BarChart3 },
  { key: "intake",   label: "Farmer Intake",    Icon: Wheat },
  { key: "milling",  label: "Milling",          Icon: Factory },
  { key: "husks",    label: "Husk Issuances",   Icon: Leaf },
  { key: "payments", label: "Farmer Payments",  Icon: Banknote },
];

export default function ReportsPage() {
  const [tab, setTab] = useState("sales");
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().slice(0, 10);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1D]">Reports</h1>
          <p className="text-sm text-[#9B9B9B] mt-0.5">Analyse sales, intake, milling, husks and farmer payments</p>
        </div>
      </div>

      {/* Tabs + Date filter */}
      <div className="flex flex-col gap-3">
        {/* Tab bar — wraps to multiple rows on mobile */}
        <div className="flex flex-wrap gap-1 bg-[#F6F6F6] rounded-lg p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                tab === t.key ? "bg-white text-[#240C64] shadow-sm" : "text-[#6B6B6B] hover:text-[#1D1D1D]"
              }`}>
              <t.Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <DateFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {/* Report content */}
      {tab === "sales"    && <SalesReport    from={from} to={to} />}
      {tab === "intake"   && <IntakeReport   from={from} to={to} />}
      {tab === "milling"  && <MillingReport  from={from} to={to} />}
      {tab === "husks"    && <HusksReport    from={from} to={to} />}
      {tab === "payments" && <PaymentsReport from={from} to={to} />}
    </div>
  );
}
