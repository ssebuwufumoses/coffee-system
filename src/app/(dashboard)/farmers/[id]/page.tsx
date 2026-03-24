"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MapPin, Leaf, CreditCard,
  Package, TrendingUp, CheckCircle2, Clock, Pencil,
  Banknote, X, Plus
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IssueHusksModal from "@/components/husks/IssueHusksModal";

type Payment = {
  id: string; amount: string; paymentDate: string;
  paymentMethod: string; referenceNumber: string | null;
  notes: string | null; recordedBy: { name: string };
};

type FarmerProfile = {
  farmer: {
    id: string; farmerCode: string; name: string; phone: string;
    location: string; isActive: boolean; paymentPreference: string;
    mobileMoneyNetwork: string | null; mobileMoneyNumber: string | null;
    bankName: string | null; bankBranch: string | null;
    bankAccountNumber: string | null; bankAccountName: string | null;
    createdAt: string; createdBy: { name: string };
    coffeeVariety: { name: string; code: string };
    deliveries: Array<{
      id: string; deliveryDate: string; weightKg: number;
      coffeeVariety: { name: string }; moistureContentPct: number | null;
      notes: string | null; recordedBy: { name: string };
    }>;
    huskIssuances: Array<{
      id: string; issuedDate: string; bagsIssued: number;
      kgEquivalent: number; issuedBy: { name: string }; notes: string | null;
    }>;
    payments: Payment[];
  };
  stats: {
    totalDeliveries: number; totalDeliveredKg: number;
    husksEarnedBags: number; husksTakenBags: number;
    husksBalanceBags: number; huskCoffeeKgPerBag: number; totalPaidUgx: number;
  };
};

function StatCard({ label, value, sub, highlight }: {
  label: string; value: string | number; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-secondary bg-secondary/5" : "border-surface-secondary bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-secondary" : "text-primary"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FarmerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get("created") === "1";

  const [data, setData] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Payment modal
  const preferenceToMethod: Record<string, string> = {
    CASH: "CASH", MOBILE_MONEY: "MOBILE_MONEY", BANK: "BANK_TRANSFER", CHEQUE: "CHEQUE",
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "", paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "", referenceNumber: "", notes: "",
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  function loadData() {
    setLoading(true);
    fetch(`/api/farmers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(""); setPaymentSaving(true);
    try {
      const res = await fetch(`/api/farmers/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod,
          referenceNumber: paymentForm.referenceNumber || null,
          notes: paymentForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPaymentError(data.error ?? "Failed to record payment"); return; }
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "CASH", referenceNumber: "", notes: "" });
      loadData();
    } finally { setPaymentSaving(false); }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-secondary rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">{error || "Farmer not found."}</p>
        <Link href="/farmers">
          <Button variant="outline" className="mt-4">Back to Farmers</Button>
        </Link>
      </div>
    );
  }

  const { farmer, stats } = data;
  const paymentLabels: Record<string, string> = {
    CASH: "Cash", MOBILE_MONEY: "Mobile Money", BANK: "Bank Transfer",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={farmer.name}
        description={`${farmer.farmerCode} · Registered by ${farmer.createdBy.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/farmers">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />Back
              </Button>
            </Link>
            <Link href={`/farmers/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />Edit
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => {
              setPaymentForm(f => ({ ...f, paymentMethod: preferenceToMethod[farmer.paymentPreference] ?? "CASH" }));
              setShowPaymentModal(true);
            }}>
              <Banknote className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Record </span>Payment
            </Button>
            {stats.husksBalanceBags > 0 && (
              <Button size="sm" onClick={() => setShowIssueModal(true)}>
                <Leaf className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Issue </span>Husks
              </Button>
            )}
          </div>
        }
      />

      {/* Created banner */}
      {justCreated && (
        <div className="flex items-center gap-2 bg-success/10 border border-success/20 text-success rounded-lg px-4 py-3 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Farmer registered successfully — code assigned: <strong>{farmer.farmerCode}</strong>
        </div>
      )}

      {/* Farmer Info Card */}
      <div className="bg-white rounded-xl border border-surface-secondary p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Phone</p>
            <p className="text-sm font-medium text-deepest">{farmer.phone}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Location</p>
            <p className="text-sm font-medium text-deepest">{farmer.location}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Leaf className="h-4 w-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Coffee Type</p>
            <p className="text-sm font-medium text-deepest">{farmer.coffeeVariety.name}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CreditCard className="h-4 w-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Payment</p>
            <p className="text-sm font-medium text-deepest">{paymentLabels[farmer.paymentPreference]}</p>
          </div>
        </div>
      </div>

      {/* Husk warehouse alert */}
      {stats.husksBalanceBags >= 10 && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 text-sm">
          <Clock className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-deepest">Warehouse Alert — Large Husk Balance</span>
            <p className="text-gray-600 mt-0.5">
              This farmer has <strong>{stats.husksBalanceBags} bags</strong> of uncollected husks. Consider contacting them to arrange collection.
            </p>
          </div>
        </div>
      )}

      {/* Husk entitlement notification */}
      {stats.husksBalanceBags > 0 && stats.husksBalanceBags < 10 && (
        <div className="flex items-start gap-3 bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-sm">
          <Package className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
          <span className="text-gray-700">
            This farmer qualifies for <strong>{stats.husksBalanceBags} bag{stats.husksBalanceBags !== 1 ? "s" : ""}</strong> of husks ready to collect.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Delivered"
          value={`${stats.totalDeliveredKg.toLocaleString()} kg`}
          sub={`${stats.totalDeliveries} deliveries`}
        />
        <StatCard
          label="Husks Earned"
          value={`${stats.husksEarnedBags} bags`}
          sub={`1 bag per ${stats.huskCoffeeKgPerBag} kg delivered`}
        />
        <StatCard
          label="Husks Taken"
          value={`${stats.husksTakenBags} bags`}
          sub="Collected so far"
        />
        <StatCard
          label="Husk Balance"
          value={`${stats.husksBalanceBags} bags`}
          sub="Ready to collect"
          highlight={stats.husksBalanceBags > 0}
        />
      </div>


      {/* Delivery History */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-secondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-primary">Delivery History</h2>
          </div>
          <Badge variant="muted">{stats.totalDeliveries} total</Badge>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-secondary bg-surface-primary">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden sm:table-cell">Type</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">Weight (kg)</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden md:table-cell">Moisture %</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden lg:table-cell">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-secondary">
            {farmer.deliveries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">No deliveries recorded yet.</td>
              </tr>
            ) : (
              farmer.deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-surface-primary/50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(d.deliveryDate).toLocaleDateString("en-UG", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    <div className="sm:hidden mt-0.5 flex flex-wrap items-center gap-1">
                      <Badge variant="default" className="text-[10px]">{d.coffeeVariety.name}</Badge>
                      {d.moistureContentPct != null && (
                        <span className="text-[10px] text-gray-400">{d.moistureContentPct}% moisture</span>
                      )}
                      <span className="text-[10px] text-gray-400 hidden xs:inline">· {d.recordedBy.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="default">{d.coffeeVariety.name}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-deepest">
                    {Number(d.weightKg).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">
                    {d.moistureContentPct != null ? `${d.moistureContentPct}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{d.recordedBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Husk Issuances */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-secondary flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-primary">Husk Issuances</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-secondary bg-surface-primary">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">Bags</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden sm:table-cell">kg Equivalent</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden md:table-cell">Issued by</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden lg:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-secondary">
            {farmer.huskIssuances.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">No husks issued yet.</td>
              </tr>
            ) : (
              farmer.huskIssuances.map((h) => (
                <tr key={h.id} className="hover:bg-surface-primary/50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(h.issuedDate).toLocaleDateString("en-UG", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    <div className="sm:hidden mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                      <span>{Number(h.kgEquivalent).toLocaleString()} kg</span>
                      <span>· {h.issuedBy.name}</span>
                      {h.notes && <span>· {h.notes}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-deepest">{h.bagsIssued} bags</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{Number(h.kgEquivalent).toLocaleString()} kg</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{h.issuedBy.name}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{h.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payments History */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-secondary">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary flex-shrink-0" />
              <h2 className="font-semibold text-primary">Payments</h2>
              <span className="text-sm text-gray-500 hidden sm:inline">
                · Total paid: <strong className="text-primary">UGX {stats.totalPaidUgx.toLocaleString()}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setPaymentForm(f => ({ ...f, paymentMethod: preferenceToMethod[farmer.paymentPreference] ?? "CASH" }));
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Record </span>Payment
            </button>
          </div>
          <p className="sm:hidden text-xs text-gray-500 mt-1 pl-6">
            Total paid: <strong className="text-primary">UGX {stats.totalPaidUgx.toLocaleString()}</strong>
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-secondary bg-surface-primary">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">Amount (UGX)</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden sm:table-cell">Method</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden md:table-cell">Reference</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary hidden lg:table-cell">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-secondary">
            {farmer.payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No payments recorded yet.</td>
              </tr>
            ) : (
              farmer.payments.map((p) => (
                <tr key={p.id} className="hover:bg-surface-primary/50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.paymentDate).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                    <div className="sm:hidden mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                      <span className="inline-flex rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                        {p.paymentMethod.replace(/_/g, " ")}
                      </span>
                      {p.referenceNumber && <span>Ref: {p.referenceNumber}</span>}
                      <span>· {p.recordedBy.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">
                    {Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-flex rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                      {p.paymentMethod.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.referenceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{p.recordedBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
              <div>
                <h2 className="text-base font-bold text-[#1D1D1D]">Record Payment</h2>
                <p className="text-xs text-[#9B9B9B] mt-0.5">{farmer.name} · {farmer.farmerCode}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg hover:bg-[#F6F6F6] text-[#9B9B9B] hover:text-[#1D1D1D] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitPayment} className="px-5 py-4 space-y-4">
              {/* Payment destination info */}
              {farmer.paymentPreference === "MOBILE_MONEY" && (
                farmer.mobileMoneyNumber ? (
                  <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 text-sm">
                    <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">{farmer.mobileMoneyNetwork ?? "Mobile Money"}</p>
                      <p className="font-semibold text-deepest">{farmer.mobileMoneyNumber}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    No mobile money number on file. <a href={`/farmers/${farmer.id}/edit`} className="font-semibold underline">Edit farmer profile</a> to add it.
                  </div>
                )
              )}
              {farmer.paymentPreference === "BANK" && (
                farmer.bankAccountNumber ? (
                  <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 text-sm">
                    <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">{farmer.bankName ?? "Bank Transfer"}{farmer.bankBranch ? ` — ${farmer.bankBranch}` : ""}</p>
                      <p className="font-semibold text-deepest">{farmer.bankAccountName}</p>
                      <p className="text-gray-500">A/C: {farmer.bankAccountNumber}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    No bank details on file. <a href={`/farmers/${farmer.id}/edit`} className="font-semibold underline">Edit farmer profile</a> to add them.
                  </div>
                )
              )}
              {farmer.paymentPreference === "CASH" && (
                <div className="flex items-center gap-2 rounded-lg bg-surface-primary border border-surface-secondary px-3 py-2 text-sm text-gray-600">
                  <Banknote className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  Cash payment — no account details required.
                </div>
              )}
              {farmer.paymentPreference === "CHEQUE" && (
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 text-sm">
                  <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Cheque Payment</p>
                    <p className="font-semibold text-deepest">Payable to: {farmer.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ensure cheque is crossed and made out to the farmer&apos;s full name.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Amount (UGX) *</label>
                  <input
                    type="number" min="1" step="1" required
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 500000"
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Payment Date *</label>
                  <input
                    type="date" required
                    value={paymentForm.paymentDate}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Payment Method *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Reference No.</label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={e => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))}
                    placeholder="e.g. TXN123456"
                    className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1D1D1D] mb-1.5">Notes</label>
                <textarea rows={2}
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#240C64] focus:border-transparent resize-none"
                />
              </div>
              {paymentError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{paymentError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={paymentSaving}
                  className="rounded-lg bg-[#240C64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors disabled:opacity-50">
                  {paymentSaving ? "Saving…" : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Husks Modal */}
      {showIssueModal && (
        <IssueHusksModal
          farmer={{ id: farmer.id, name: farmer.name, farmerCode: farmer.farmerCode }}
          balanceBags={stats.husksBalanceBags}
          huskKgPerBag={stats.huskCoffeeKgPerBag}
          onClose={() => setShowIssueModal(false)}
          onSuccess={() => {
            setShowIssueModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
