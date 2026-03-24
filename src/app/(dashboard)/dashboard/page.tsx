"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Scale, Coffee, Leaf, Factory, Truck,
  TrendingUp, TrendingDown, ShoppingCart, AlertTriangle,
  FileText, CreditCard, ArrowRight, CheckCircle2, Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmountUgx: string;
  createdAt: string;
  buyer: { companyName: string };
  coffeeVariety: { name: string; code: string };
}

interface Stats {
  totalFarmers: number;
  totalDeliveries: number;
  deliveriesThisMonth: number;
  weightThisMonthKg: number;
  rawStockKg: number;
  processedBeansKg: number;
  husksKg: number;
  huskKgPerBag: number;
  lowStockCount: number;
  completedMillingBatches: number;
  avgConversionRate: string | null;
  activeBatches: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueChange: number | null;
  draftOrders: number;
  confirmedOrders: number;
  dispatchedOrders: number;
  pendingInvoices: number;
  recentOrders: RecentOrder[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKg(kg: number) {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(2)}M kg`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tonnes`;
  return `${Math.round(kg).toLocaleString()} kg`;
}

function fmtUgx(v: number) {
  if (v >= 1_000_000_000) return `UGX ${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `UGX ${(v / 1_000_000).toFixed(1)}M`;
  return `UGX ${Math.round(v).toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short" });
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT:      { label: "Draft",      bg: "#F6F6F6", text: "#6B6B6B", border: "#E8E8E8" },
  CONFIRMED:  { label: "Confirmed",  bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  DISPATCHED: { label: "Dispatched", bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  INVOICED:   { label: "Invoiced",   bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  PAID:       { label: "Paid",       bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" },
};

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, Icon, href, alert,
}: {
  label: string; value: string; sub?: string;
  Icon: React.ElementType; href?: string; alert?: boolean;
}) {
  const inner = (
    <div className={`bg-white rounded-lg border p-5 transition-colors group ${alert ? "border-red-200" : "border-[#E8E8E8] hover:border-[#240C64]/20"}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">{label}</p>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${alert ? "text-red-400" : "text-[#9B9B9B]"}`} aria-hidden="true" />
          {href && <ArrowRight className="h-3.5 w-3.5 text-[#CBCBCB] group-hover:text-[#240C64] transition-colors" />}
        </div>
      </div>
      <p className="text-[2rem] font-bold leading-none tracking-tight" style={{ color: alert ? "#B91C1C" : "#1D1D1D" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#9B9B9B] mt-2">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function PipelineBar({ stats }: { stats: Stats }) {
  const stages = [
    { label: "Draft", count: stats.draftOrders, color: "#9B9B9B" },
    { label: "Confirmed", count: stats.confirmedOrders, color: "#1D4ED8" },
    { label: "Dispatched", count: stats.dispatchedOrders, color: "#065F46" },
    { label: "Awaiting Payment", count: stats.pendingInvoices, color: "#92400E" },
  ];
  const total = stages.reduce((s, st) => s + st.count, 0);

  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Order Pipeline</h2>
        <Link href="/sales" className="text-xs font-semibold text-[#240C64] hover:underline">View all →</Link>
      </div>
      {total === 0 ? (
        <p className="text-sm text-[#9B9B9B] py-2">No active orders</p>
      ) : (
        <>
          <div className="flex rounded-full overflow-hidden h-2.5 mb-4 gap-0.5">
            {stages.filter(s => s.count > 0).map(s => (
              <div key={s.label} style={{ flex: s.count, background: s.color }} />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stages.map(s => (
              <div key={s.label}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-xs text-[#9B9B9B] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/dashboard/stats").then(r => r.json()),
    ]).then(([me, data]) => {
      if (me.name) setUserName(me.name);
      if (!data.error) setStats(data);
    }).finally(() => setLoading(false));
  }, []);

  const firstName = userName.split(" ")[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#240C64]">
          {greeting}{firstName !== "User" ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-[#9B9B9B] mt-0.5">Victory Coffee Factory — Lwengo, Uganda</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-lg border border-[#E8E8E8] animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1,2].map(i => <div key={i} className="h-36 bg-white rounded-lg border border-[#E8E8E8] animate-pulse" />)}
          </div>
        </div>
      ) : stats ? (
        <>
          {/* ── Alerts ── */}
          {(stats.lowStockCount > 0 || stats.draftOrders > 0 || stats.pendingInvoices > 0) && (
            <div className="space-y-2">
              {stats.lowStockCount > 0 && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-700">
                    <strong>{stats.lowStockCount} inventory item{stats.lowStockCount > 1 ? "s" : ""}</strong> below stock threshold.{" "}
                    <Link href="/inventory" className="underline font-semibold">Check inventory →</Link>
                  </span>
                </div>
              )}
              {stats.draftOrders > 0 && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-blue-700">
                    <strong>{stats.draftOrders} order{stats.draftOrders > 1 ? "s" : ""}</strong> awaiting confirmation.{" "}
                    <Link href="/sales" className="underline font-semibold">Review →</Link>
                  </span>
                </div>
              )}
              {stats.pendingInvoices > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <CreditCard className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm text-amber-700">
                    <strong>{stats.pendingInvoices} invoice{stats.pendingInvoices > 1 ? "s" : ""}</strong> with outstanding payments.{" "}
                    <Link href="/sales" className="underline font-semibold">View →</Link>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Row 1: Revenue + key numbers ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-[#E8E8E8] p-5 col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] mb-4">Revenue This Month</p>
              <p className="text-[2rem] font-bold leading-none tracking-tight text-[#1D1D1D]">
                {fmtUgx(stats.revenueThisMonth)}
              </p>
              {stats.revenueChange !== null ? (
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${stats.revenueChange >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {stats.revenueChange >= 0
                    ? <TrendingUp className="h-3.5 w-3.5" />
                    : <TrendingDown className="h-3.5 w-3.5" />}
                  {Math.abs(stats.revenueChange).toFixed(1)}% vs last month
                </div>
              ) : (
                <p className="text-xs text-[#9B9B9B] mt-2">{stats.ordersThisMonth} orders this month</p>
              )}
            </div>

            <StatCard
              label="Processed Beans"
              value={fmtKg(stats.processedBeansKg)}
              sub="Ready for sale"
              Icon={Coffee}
              href="/inventory"
              alert={stats.processedBeansKg === 0}
            />
            <StatCard
              label="Raw Coffee Stock"
              value={fmtKg(stats.rawStockKg)}
              sub="In warehouse"
              Icon={Scale}
              href="/inventory"
            />
            <StatCard
              label="Registered Farmers"
              value={stats.totalFarmers.toLocaleString()}
              sub={`${stats.totalDeliveries.toLocaleString()} total deliveries`}
              Icon={Users}
              href="/farmers"
            />
          </div>

          {/* ── Row 2: Pipeline + Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PipelineBar stats={stats} />

            <div className="bg-white rounded-lg border border-[#E8E8E8] p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-4">This Month</h2>
              <div className="space-y-3">
                {[
                  { Icon: Truck, label: "Intake deliveries", value: `${stats.deliveriesThisMonth} deliveries`, sub: fmtKg(stats.weightThisMonthKg) + " received" },
                  { Icon: Factory, label: "Active milling", value: `${stats.activeBatches} batch${stats.activeBatches !== 1 ? "es" : ""} in progress`, sub: `${stats.completedMillingBatches} completed · avg ${stats.avgConversionRate ?? "—"}% conversion` },
                  { Icon: ShoppingCart, label: "New orders", value: `${stats.ordersThisMonth} order${stats.ordersThisMonth !== 1 ? "s" : ""}`, sub: fmtUgx(stats.revenueThisMonth) + " total value" },
                  { Icon: Leaf, label: "Husks in stock", value: `${Math.floor(stats.husksKg / stats.huskKgPerBag)} bags`, sub: "Available to issue to farmers" },
                ].map(({ Icon, label, value, sub }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#F6F6F6] flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-[#6B6B6B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1D1D1D]">{value}</p>
                      <p className="text-xs text-[#9B9B9B] truncate">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Recent Orders ── */}
          {stats.recentOrders.length > 0 && (
            <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1D1D1D]">Recent Orders</h2>
                <Link href="/sales" className="text-xs font-semibold text-[#240C64] hover:underline">View all →</Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Order</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Buyer</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden sm:table-cell">Variety</th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Amount</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Status</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {stats.recentOrders.map(order => {
                    const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={order.id} className="hover:bg-[#F9F9F9] transition-colors">
                        <td className="px-5 py-3.5">
                          <Link href={`/sales/${order.id}`} className="font-bold text-[#240C64] hover:underline">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-[#6B6B6B] hidden md:table-cell">{order.buyer.companyName}</td>
                        <td className="px-4 py-3.5 text-[#6B6B6B] hidden sm:table-cell">{order.coffeeVariety.name}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-[#1D1D1D]">
                          {fmtUgx(parseFloat(order.totalAmountUgx))}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                            style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[#9B9B9B] text-xs hidden md:table-cell">{fmtDate(order.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "New Sale Order", Icon: ShoppingCart, href: "/sales/new" },
                { label: "Record Intake", Icon: Truck, href: "/intake/new" },
                { label: "New Milling Batch", Icon: Factory, href: "/milling/new" },
                { label: "Register Farmer", Icon: Users, href: "/farmers/new" },
              ].map(({ label, Icon, href }) => (
                <Link key={href} href={href}
                  className="bg-white border border-[#E8E8E8] rounded-lg p-4 flex flex-col items-center gap-2 hover:border-[#240C64]/30 hover:bg-[#F6F6F6] transition-all group text-center">
                  <div className="h-9 w-9 rounded-full bg-[#240C64]/10 flex items-center justify-center group-hover:bg-[#240C64]/20 transition-colors">
                    <Icon className="h-4 w-4 text-[#240C64]" />
                  </div>
                  <p className="text-xs font-semibold text-[#1D1D1D]">{label}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-[#6B6B6B]">Could not load dashboard data.</p>
        </div>
      )}
    </div>
  );
}
