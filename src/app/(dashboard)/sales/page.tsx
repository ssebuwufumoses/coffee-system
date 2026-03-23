"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ShoppingCart, Users } from "lucide-react";

interface SaleOrder {
  id: string;
  orderNumber: string;
  status: string;
  quantityKg: string;
  pricePerKgUgx: string;
  totalAmountUgx: string;
  createdAt: string;
  buyer: { id: string; companyName: string; buyerType: string };
  coffeeVariety: { id: string; name: string; code: string };
  createdBy: { name: string };
  dispatches: { id: string; dispatchedKg: string }[];
  invoices: { id: string; invoiceNumber: string; paymentStatus: string; amountUgx: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT:      { label: "Draft",      bg: "#F6F6F6",      text: "#6B6B6B", border: "#E8E8E8" },
  CONFIRMED:  { label: "Confirmed",  bg: "#EFF6FF",      text: "#1D4ED8", border: "#BFDBFE" },
  DISPATCHED: { label: "Dispatched", bg: "#ECFDF5",      text: "#065F46", border: "#A7F3D0" },
  INVOICED:   { label: "Invoiced",   bg: "#FEF3C7",      text: "#92400E", border: "#FDE68A" },
  PAID:       { label: "Paid",       bg: "#ECFDF5",      text: "#065F46", border: "#6EE7B7" },
  CANCELLED:  { label: "Cancelled",  bg: "#FEF2F2",      text: "#991B1B", border: "#FECACA" },
};

const TABS = ["ALL", "DRAFT", "CONFIRMED", "DISPATCHED", "INVOICED", "PAID", "CANCELLED"];

function fmtUgx(v: string | number) {
  return `UGX ${parseFloat(String(v)).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}
function fmtKg(v: string | number) {
  const n = parseFloat(String(v));
  return n >= 1000 ? `${(n / 1000).toFixed(2)} tonnes` : `${n.toLocaleString()} kg`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SalesPage() {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");

  useEffect(() => {
    fetch("/api/sales")
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === "ALL" ? orders : orders.filter(o => o.status === activeTab);

  const counts: Record<string, number> = {};
  TABS.forEach(t => {
    counts[t] = t === "ALL" ? orders.length : orders.filter(o => o.status === t).length;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1D]">Sales</h1>
          <p className="text-sm text-[#9B9B9B] mt-0.5">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/sales/buyers"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#3D3D3D]
              hover:bg-[#F6F6F6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
          >
            <Users className="h-4 w-4" />
            Buyers
          </Link>
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#240C64] px-4 py-2 text-sm font-semibold text-white
              hover:bg-[#1a0948] transition-colors focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Status tabs — wraps to multiple rows on mobile */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-[#240C64] text-white"
                : "bg-white border border-[#E8E8E8] text-[#6B6B6B] hover:bg-[#F6F6F6]"
            }`}
          >
            {tab === "ALL" ? "All" : STATUS_CONFIG[tab]?.label}
            {counts[tab] > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === tab ? "bg-white/20 text-white" : "bg-[#F6F6F6] text-[#6B6B6B]"
              }`}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#F0F0F0]">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="h-4 bg-gray-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="h-10 w-10 text-[#E0E0E0] mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-[#6B6B6B]">
              {activeTab === "ALL" ? "No sale orders yet" : `No ${STATUS_CONFIG[activeTab]?.label.toLowerCase()} orders`}
            </p>
            {activeTab === "ALL" && (
              <Link
                href="/sales/new"
                className="inline-flex items-center gap-2 mt-4 rounded-lg bg-[#240C64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create First Order
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Order</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Buyer</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Variety</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Qty</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden lg:table-cell">Total</th>
                <th scope="col" className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Status</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden xl:table-cell">Date</th>
                <th scope="col" className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {filtered.map(order => {
                const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.DRAFT;
                const dispatchedKg = order.dispatches.reduce((s, d) => s + parseFloat(String(d.dispatchedKg)), 0);
                const invoice = order.invoices[0];

                return (
                  <tr key={order.id} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-[#1D1D1D]">{order.orderNumber}</p>
                      <p className="text-xs text-[#9B9B9B] mt-0.5">by {order.createdBy.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-[#1D1D1D]">{order.buyer.companyName}</p>
                      <p className="text-xs text-[#9B9B9B] mt-0.5">
                        {order.buyer.buyerType === "EXPORTER" ? "Exporter" : "Local Trader"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-[#6B6B6B]">{order.coffeeVariety.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-[#1D1D1D]">{fmtKg(order.quantityKg)}</span>
                      {dispatchedKg > 0 && (
                        <p className="text-xs text-[#9B9B9B] mt-0.5">{fmtKg(dispatchedKg)} out</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                      <span className="font-semibold text-[#1D1D1D]">{fmtUgx(order.totalAmountUgx)}</span>
                      {invoice && (
                        <p className={`text-xs mt-0.5 font-medium ${
                          invoice.paymentStatus === "FULLY_PAID" ? "text-emerald-700" :
                          invoice.paymentStatus === "PARTIALLY_PAID" ? "text-amber-700" :
                          "text-[#9B9B9B]"
                        }`}>
                          {invoice.paymentStatus === "FULLY_PAID" ? "Paid" :
                           invoice.paymentStatus === "PARTIALLY_PAID" ? "Part paid" :
                           "Unpaid"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                        style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}
                      >
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell text-[#9B9B9B] text-xs">
                      {fmtDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/sales/${order.id}`}
                        className="text-xs font-semibold text-[#240C64] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
