"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, Truck, FileText,
  CreditCard, Clock, AlertTriangle, ChevronRight, Mail, Printer,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  quantityKg: string;
  pricePerKgUgx: string;
  totalAmountUgx: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: { id: string; companyName: string; contactName: string; phone: string; email: string | null; location: string; buyerType: string };
  coffeeVariety: { id: string; name: string; code: string };
  createdBy: { name: string };
  approvedBy: { name: string } | null;
  dispatches: {
    id: string; gatePassNumber: string; dispatchedKg: string;
    dispatchDate: string; truckRegistration: string | null;
    driverName: string | null; driverPhone: string | null;
    dispatchedBy: { name: string };
  }[];
  invoices: {
    id: string; invoiceNumber: string; amountUgx: string;
    dueDate: string; paymentStatus: string; createdAt: string;
    createdBy: { name: string };
    payments: {
      id: string; amountPaidUgx: string; paymentDate: string;
      paymentMethod: string; referenceNumber: string | null;
      recordedBy: { name: string };
    }[];
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT:      { label: "Draft",      bg: "#F6F6F6", text: "#6B6B6B", border: "#E8E8E8" },
  CONFIRMED:  { label: "Confirmed",  bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  DISPATCHED: { label: "Dispatched", bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  INVOICED:   { label: "Invoiced",   bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  PAID:       { label: "Paid",       bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" },
  CANCELLED:  { label: "Cancelled",  bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", MOBILE_MONEY: "Mobile Money", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

function fmtUgx(v: string | number) {
  return `UGX ${parseFloat(String(v)).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}
function fmtKg(v: string | number) {
  const n = parseFloat(String(v));
  return n >= 1000 ? `${(n / 1000).toFixed(2)} tonnes` : `${n.toLocaleString()} kg`;
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-UG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Timeline ────────────────────────────────────────────────────────────────

const STEPS = ["DRAFT", "CONFIRMED", "DISPATCHED", "INVOICED", "PAID"];

function Timeline({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-semibold">Order Cancelled</span>
      </div>
    );
  }
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const sc = STATUS_CONFIG[step];
        return (
          <div key={step} className="flex items-center gap-1 flex-1 min-w-0">
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border flex-1 justify-center ${
              active ? "border-[#240C64] bg-[#240C64] text-white" :
              done ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
              "border-[#E8E8E8] bg-[#F6F6F6] text-[#9B9B9B]"
            }`}>
              {done && <CheckCircle2 className="h-3 w-3 flex-shrink-0" />}
              <span className="truncate">{sc.label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-[#CBCBCB] flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Input helper ─────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm text-[#1D1D1D] placeholder-[#BABABA] focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SaleOrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Confirm form
  const [confirmForm, setConfirmForm] = useState({
    paymentStatus: "NONE",      // NONE | FULL | PARTIAL
    paymentMethod: "CASH",
    paymentAmount: "",
    paymentReference: "",
  });

  // Dispatch form
  const [dispatchForm, setDispatchForm] = useState({
    dispatchedKg: "", dispatchDateTime: "", truckRegistration: "", driverName: "", driverPhone: "",
  });

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({ dueDate: "" });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amountPaidUgx: "", paymentDate: "", paymentMethod: "CASH", referenceNumber: "", notes: "",
  });

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/sales/${id}`);
    const data = await res.json();
    setOrder(data.order ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  async function submitConfirm(e: React.FormEvent) {
    e.preventDefault(); setError(""); setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", ...confirmForm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Confirmation failed"); return; }
      setShowConfirm(false);
      await loadOrder();
    } finally { setActionLoading(false); }
  }

  async function submitCancel() {
    setError(""); setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Cancel failed"); return; }
      setShowCancel(false);
      await loadOrder();
    } finally { setActionLoading(false); }
  }

  async function submitDispatch(e: React.FormEvent) {
    e.preventDefault(); setError(""); setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Dispatch failed"); return; }
      setShowDispatch(false);
      setDispatchForm({ dispatchedKg: "", dispatchDateTime: "", truckRegistration: "", driverName: "", driverPhone: "" });
      await loadOrder();
    } finally { setActionLoading(false); }
  }

  async function submitInvoice(e: React.FormEvent) {
    e.preventDefault(); setError(""); setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invoice creation failed"); return; }
      setShowInvoice(false);
      await loadOrder();
    } finally { setActionLoading(false); }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault(); setError(""); setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Payment recording failed"); return; }
      setShowPayment(false);
      setPaymentForm({ amountPaidUgx: "", paymentDate: "", paymentMethod: "CASH", referenceNumber: "", notes: "" });
      await loadOrder();
    } finally { setActionLoading(false); }
  }

  function closeAll() {
    setShowConfirm(false); setShowCancel(false); setShowDispatch(false);
    setShowInvoice(false); setShowPayment(false); setError("");
  }

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-8 bg-white rounded-lg w-1/3" /><div className="h-48 bg-white rounded-lg border border-[#E8E8E8]" /></div>;
  if (!order) return <div className="text-center py-16"><p className="text-[#6B6B6B]">Order not found.</p><Link href="/sales" className="text-[#240C64] text-sm font-medium hover:underline mt-2 inline-block">← Back to Sales</Link></div>;

  const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.DRAFT;
  const totalDispatched = order.dispatches.reduce((s, d) => s + parseFloat(String(d.dispatchedKg)), 0);
  const invoice = order.invoices[0];
  const totalPaid = invoice?.payments.reduce((s, p) => s + parseFloat(String(p.amountPaidUgx)), 0) ?? 0;
  const outstanding = invoice ? parseFloat(String(invoice.amountUgx)) - totalPaid : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/sales" className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#1D1D1D] mb-3 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sales
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-[#1D1D1D]">{order.orderNumber}</h1>
              <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border" style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}>{sc.label}</span>
            </div>
            <p className="text-sm text-[#9B9B9B] mt-0.5">Created {fmtDate(order.createdAt)} by {order.createdBy.name}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {order.status === "DRAFT" && (
              <>
                <button onClick={() => { closeAll(); setShowCancel(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                  <XCircle className="h-3.5 w-3.5" /> Cancel Order
                </button>
                <button onClick={() => { closeAll(); setShowConfirm(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#240C64] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a0948] transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Order
                </button>
              </>
            )}
            {order.status === "CONFIRMED" && (
              <button onClick={() => { closeAll(); setShowDispatch(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#240C64] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a0948] transition-colors">
                <Truck className="h-3.5 w-3.5" /> Record Dispatch
              </button>
            )}
            {order.status === "DISPATCHED" && (
              <button onClick={() => { closeAll(); setShowInvoice(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#240C64] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a0948] transition-colors">
                <FileText className="h-3.5 w-3.5" /> Create Invoice
              </button>
            )}
            {order.status === "INVOICED" && (
              <button onClick={() => { closeAll(); setShowPayment(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#240C64] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a0948] transition-colors">
                <CreditCard className="h-3.5 w-3.5" /> Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      <Timeline status={order.status} />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buyer */}
        <div className="bg-white rounded-lg border border-[#E8E8E8] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-3">Buyer</h2>
          <p className="font-bold text-[#1D1D1D]">{order.buyer.companyName}</p>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{order.buyer.contactName}</p>
          <p className="text-sm text-[#9B9B9B]">{order.buyer.phone}</p>
          {order.buyer.email && (
            <p className="text-sm text-[#9B9B9B] flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3" aria-hidden="true" />{order.buyer.email}
            </p>
          )}
          <p className="text-sm text-[#9B9B9B]">{order.buyer.location}</p>
          <span className={`inline-flex mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
            order.buyer.buyerType === "EXPORTER" ? "bg-[#240C64]/10 border-[#240C64]/20 text-[#240C64]" : "bg-[#F6F6F6] border-[#E8E8E8] text-[#6B6B6B]"
          }`}>
            {order.buyer.buyerType === "EXPORTER" ? "Exporter" : "Local Trader"}
          </span>
          {!order.buyer.email && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              No email — dispatch notifications won&apos;t be sent
            </p>
          )}
        </div>

        {/* Order figures */}
        <div className="bg-white rounded-lg border border-[#E8E8E8] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-3">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B6B6B]">Coffee Variety</span>
              <span className="font-medium text-[#1D1D1D]">{order.coffeeVariety.name} ({order.coffeeVariety.code})</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B6B6B]">Quantity</span>
              <span className="font-medium text-[#1D1D1D]">{fmtKg(order.quantityKg)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B6B6B]">Price / kg</span>
              <span className="font-medium text-[#1D1D1D]">{fmtUgx(order.pricePerKgUgx)}</span>
            </div>
            <div className="pt-2 border-t border-[#F0F0F0] flex justify-between">
              <span className="text-sm font-semibold text-[#1D1D1D]">Total Amount</span>
              <span className="text-lg font-bold text-[#1D1D1D]">{fmtUgx(order.totalAmountUgx)}</span>
            </div>
            {totalDispatched > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6B6B6B]">Dispatched</span>
                <span className="font-medium text-emerald-700">{fmtKg(totalDispatched)}</span>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="mt-3 space-y-1">
              {order.notes.split("\n").map((line, i) => (
                <p key={i} className={`text-xs rounded-lg px-3 py-1.5 ${
                  line.startsWith("[PAYMENT @ CONFIRMATION")
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium"
                    : "bg-[#F6F6F6] text-[#9B9B9B]"
                }`}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispatches */}
      {order.dispatches.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#9B9B9B]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#1D1D1D]">Dispatches</h2>
            </div>
            <span className="text-xs text-[#9B9B9B]">{fmtKg(totalDispatched)} of {fmtKg(order.quantityKg)} dispatched</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Gate Pass</th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Qty</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Date & Time</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden lg:table-cell">Truck / Driver</th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">By</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {order.dispatches.map(d => (
                <tr key={d.id} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#1D1D1D]">{d.gatePassNumber}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-[#1D1D1D]">{fmtKg(d.dispatchedKg)}</td>
                  <td className="px-4 py-3.5 text-[#6B6B6B] hidden md:table-cell">{fmtDateTime(d.dispatchDate)}</td>
                  <td className="px-4 py-3.5 text-[#6B6B6B] hidden lg:table-cell">
                    <div>{d.truckRegistration ?? "—"}</div>
                    {d.driverName && (
                      <div className="text-xs text-[#9B9B9B]">
                        {d.driverName}{d.driverPhone ? ` · ${d.driverPhone}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#9B9B9B] text-xs hidden md:table-cell">{d.dispatchedBy.name}</td>
                  <td className="px-4 py-3.5">
                    <Link href={`/sales/${id}/gatepass/${d.id}`} target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#240C64] px-3 py-1.5 text-xs font-semibold text-[#240C64] hover:bg-[#240C64] hover:text-white transition-colors whitespace-nowrap">
                      <Printer className="h-3 w-3" /> Gate Pass
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice & Payments */}
      {invoice && (
        <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E8E8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#9B9B9B]" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#1D1D1D]">Invoice {invoice.invoiceNumber}</h2>
              </div>
              <div className="flex items-center gap-3">
                {invoice.paymentStatus === "FULLY_PAID" && (
                  <Link href={`/sales/${id}/invoice/print`} target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap">
                    <Printer className="h-3 w-3" /> Final Receipt
                  </Link>
                )}
                <Link href={`/sales/${id}/invoice/print`} target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#240C64] px-3 py-1.5 text-xs font-semibold text-[#240C64] hover:bg-[#240C64] hover:text-white transition-colors whitespace-nowrap">
                  <Printer className="h-3.5 w-3.5" /> Print Invoice
                </Link>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                invoice.paymentStatus === "FULLY_PAID" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : invoice.paymentStatus === "PARTIALLY_PAID" ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-[#F6F6F6] border-[#E8E8E8] text-[#6B6B6B]"
              }`}>
                {invoice.paymentStatus === "FULLY_PAID" ? "Fully Paid" : invoice.paymentStatus === "PARTIALLY_PAID" ? "Partially Paid" : "Unpaid"}
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-[#9B9B9B] text-xs">Invoice Amount</p><p className="font-bold text-[#1D1D1D]">{fmtUgx(invoice.amountUgx)}</p></div>
              <div><p className="text-[#9B9B9B] text-xs">Paid</p><p className="font-bold text-emerald-700">{fmtUgx(totalPaid)}</p></div>
              <div><p className="text-[#9B9B9B] text-xs">Outstanding</p><p className={`font-bold ${outstanding > 0 ? "text-red-700" : "text-emerald-700"}`}>{fmtUgx(outstanding)}</p></div>
            </div>
            <p className="text-xs text-[#9B9B9B] mt-2 flex items-center gap-1"><Clock className="h-3 w-3" />Due {fmtDate(invoice.dueDate)}</p>
          </div>
          {invoice.payments.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F6F6F6] border-b border-[#E8E8E8]">
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Date</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Amount</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Method</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden lg:table-cell">Reference</th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] hidden md:table-cell">Recorded By</th>
                  <th scope="col" className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {invoice.payments.map(p => (
                  <tr key={p.id} className="hover:bg-[#F9F9F9]">
                    <td className="px-5 py-3.5 text-[#1D1D1D]">{fmtDate(p.paymentDate)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{fmtUgx(p.amountPaidUgx)}</td>
                    <td className="px-4 py-3.5 text-[#6B6B6B] hidden md:table-cell">{PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                    <td className="px-4 py-3.5 text-[#9B9B9B] hidden lg:table-cell">{p.referenceNumber ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#9B9B9B] text-xs hidden md:table-cell">{p.recordedBy.name}</td>
                    <td className="px-4 py-3.5">
                      {invoice.paymentStatus !== "FULLY_PAID" && (
                        <Link href={`/sales/${id}/receipt/${p.id}`} target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#6B6B6B] hover:border-[#240C64] hover:text-[#240C64] transition-colors whitespace-nowrap">
                          <Printer className="h-3 w-3" /> Receipt
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}

      {/* Confirm Order modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <h3 className="font-bold text-[#1D1D1D]">Confirm Order</h3>
              <p className="text-xs text-[#9B9B9B] mt-0.5">{order.orderNumber} · {fmtUgx(order.totalAmountUgx)}</p>
            </div>
            <form onSubmit={submitConfirm} className="px-5 py-4 space-y-4">
              {/* Payment status */}
              <div>
                <p className="text-sm font-medium text-[#1D1D1D] mb-2">Payment at confirmation</p>
                <div className="space-y-2">
                  {[
                    { value: "NONE", label: "No payment yet — buyer will pay later" },
                    { value: "FULL", label: "Full payment received" },
                    { value: "PARTIAL", label: "Partial payment received" },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      confirmForm.paymentStatus === opt.value ? "border-[#240C64] bg-[#240C64]/5" : "border-[#E8E8E8] hover:bg-[#F6F6F6]"
                    }`}>
                      <input
                        type="radio"
                        name="paymentStatus"
                        value={opt.value}
                        checked={confirmForm.paymentStatus === opt.value}
                        onChange={e => setConfirmForm(f => ({ ...f, paymentStatus: e.target.value }))}
                        className="accent-[#240C64]"
                      />
                      <span className="text-sm text-[#1D1D1D]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment details — shown when payment is made */}
              {confirmForm.paymentStatus !== "NONE" && (
                <div className="space-y-3 border-t border-[#F0F0F0] pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Payment Method" required>
                      <select value={confirmForm.paymentMethod} onChange={e => setConfirmForm(f => ({ ...f, paymentMethod: e.target.value }))} className={inputCls}>
                        <option value="CASH">Cash</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </Field>
                    <Field label={confirmForm.paymentStatus === "PARTIAL" ? "Amount Paid (UGX)" : "Amount (UGX)"}>
                      <input type="number" min="1" step="1"
                        value={confirmForm.paymentAmount}
                        onChange={e => setConfirmForm(f => ({ ...f, paymentAmount: e.target.value }))}
                        placeholder={confirmForm.paymentStatus === "FULL" ? String(parseFloat(order.totalAmountUgx)) : ""}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  {confirmForm.paymentMethod !== "CASH" && (
                    <Field label="Transaction / Reference ID" required>
                      <input type="text" required
                        value={confirmForm.paymentReference}
                        onChange={e => setConfirmForm(f => ({ ...f, paymentReference: e.target.value }))}
                        placeholder="e.g. TXN123456789"
                        className={inputCls}
                      />
                    </Field>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAll} className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading} className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors disabled:opacity-50">
                  {actionLoading ? "Confirming…" : "Confirm Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-[#1D1D1D] mb-1">Cancel Order?</h3>
            <p className="text-sm text-[#6B6B6B] mb-5">This will cancel {order.orderNumber}. This action cannot be undone.</p>
            {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={closeAll} className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">Back</button>
              <button onClick={submitCancel} disabled={actionLoading} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {actionLoading ? "Cancelling…" : "Yes, Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch modal */}
      {showDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <h3 className="font-bold text-[#1D1D1D]">Record Dispatch</h3>
              <p className="text-xs text-[#9B9B9B] mt-0.5">
                Remaining: {fmtKg(parseFloat(String(order.quantityKg)) - totalDispatched)}
                {order.buyer.email && <span className="ml-2 text-emerald-700">· Email will be sent to {order.buyer.email}</span>}
              </p>
            </div>
            <form onSubmit={submitDispatch} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity (kg)" required>
                  <input type="number" min="0.1" step="0.1" required value={dispatchForm.dispatchedKg}
                    onChange={e => setDispatchForm(f => ({ ...f, dispatchedKg: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Date & Time" required>
                  <input type="datetime-local" required value={dispatchForm.dispatchDateTime}
                    onChange={e => setDispatchForm(f => ({ ...f, dispatchDateTime: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Truck Reg.">
                  <input type="text" placeholder="UAB 123X" value={dispatchForm.truckRegistration}
                    onChange={e => setDispatchForm(f => ({ ...f, truckRegistration: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Driver Name">
                  <input type="text" value={dispatchForm.driverName}
                    onChange={e => setDispatchForm(f => ({ ...f, driverName: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <Field label="Driver / Rep. Phone">
                <input type="tel" placeholder="+256 7XX XXX XXX" value={dispatchForm.driverPhone}
                  onChange={e => setDispatchForm(f => ({ ...f, driverPhone: e.target.value }))} className={inputCls} />
              </Field>
              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAll} className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading} className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors disabled:opacity-50">
                  {actionLoading ? "Recording…" : "Record Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-sm shadow-xl">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <h3 className="font-bold text-[#1D1D1D]">Create Invoice</h3>
              <p className="text-xs text-[#9B9B9B] mt-0.5">Amount: {fmtUgx(order.totalAmountUgx)}</p>
            </div>
            <form onSubmit={submitInvoice} className="px-5 py-4 space-y-4">
              <Field label="Due Date" required>
                <input type="date" required value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ dueDate: e.target.value })} className={inputCls} />
              </Field>
              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAll} className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading} className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors disabled:opacity-50">
                  {actionLoading ? "Creating…" : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-[#E8E8E8] w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <h3 className="font-bold text-[#1D1D1D]">Record Payment</h3>
              <p className="text-xs text-[#9B9B9B] mt-0.5">Outstanding: {fmtUgx(outstanding)}</p>
            </div>
            <form onSubmit={submitPayment} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount (UGX)" required>
                  <input type="number" min="1" step="1" required value={paymentForm.amountPaidUgx}
                    onChange={e => setPaymentForm(f => ({ ...f, amountPaidUgx: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Payment Date" required>
                  <input type="date" required value={paymentForm.paymentDate}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Method" required>
                  <select required value={paymentForm.paymentMethod} onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))} className={inputCls}>
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </Field>
                <Field label={paymentForm.paymentMethod !== "CASH" ? "Transaction ID *" : "Reference #"}>
                  <input type="text" required={paymentForm.paymentMethod !== "CASH"}
                    placeholder={paymentForm.paymentMethod !== "CASH" ? "Required" : "Optional"}
                    value={paymentForm.referenceNumber}
                    onChange={e => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAll} className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading} className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors disabled:opacity-50">
                  {actionLoading ? "Recording…" : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
