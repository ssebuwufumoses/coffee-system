"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  quantityKg: string;
  pricePerKgUgx: string;
  totalAmountUgx: string;
  notes: string | null;
  createdAt: string;
  buyer: {
    companyName: string;
    contactName: string;
    phone: string;
    email: string | null;
    location: string;
    buyerType: string;
  };
  coffeeVariety: { name: string; code: string };
  createdBy: { name: string };
  approvedBy: { name: string } | null;
  dispatches: { dispatchedKg: string; dispatchDate: string; gatePassNumber: string }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    amountUgx: string;
    dueDate: string;
    paymentStatus: string;
    createdAt: string;
    createdBy: { name: string };
    payments: {
      id: string;
      amountPaidUgx: string;
      paymentDate: string;
      paymentMethod: string;
      referenceNumber: string | null;
      recordedBy: { name: string };
    }[];
  }[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

function fmtUgx(v: string | number) {
  return `UGX ${parseFloat(String(v)).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}
function fmtKg(v: string | number) {
  const n = parseFloat(String(v));
  return n >= 1000 ? `${(n / 1000).toFixed(2)} tonnes` : `${n.toLocaleString()} kg`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-UG", { day: "2-digit", month: "long", year: "numeric" });
}

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(r => r.json())
      .then(d => { if (d.order) setOrder(d.order); });
  }, [id]);

  useEffect(() => {
    if (order) {
      document.title = `Invoice ${order.invoices[0]?.invoiceNumber ?? ""} — Victory Coffee Factory`;
    }
  }, [order]);

  if (!order) return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B6B6B" }}>Loading…</div>
  );

  const invoice = order.invoices[0];
  if (!invoice) return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B6B6B" }}>No invoice found for this order.</div>
  );

  const totalPaid = invoice.payments.reduce((s, p) => s + parseFloat(String(p.amountPaidUgx)), 0);
  const outstanding = parseFloat(String(invoice.amountUgx)) - totalPaid;
  const isFullyPaid = invoice.paymentStatus === "FULLY_PAID";

  return (
    <>
      {/* Print action bar — hidden when printing */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#240C64", padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600 }}>
          Invoice {invoice.invoiceNumber}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", borderRadius: 8, padding: "6px 16px",
              fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            style={{
              background: "#F35C2C", border: "none", color: "#fff",
              borderRadius: 8, padding: "6px 20px",
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#1D1D1D",
        background: "#F6F6F6",
        minHeight: "100vh",
        paddingTop: 72,
        paddingBottom: 40,
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #E8E8E8",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{ background: "#240C64", padding: "32px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Victory Coffee Factory
                </p>
                <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, margin: 0 }}>
                  {isFullyPaid ? "PAYMENT RECEIPT" : "INVOICE"}
                </h1>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>{invoice.invoiceNumber}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "0 0 2px" }}>
                  Issued: {fmtDate(invoice.createdAt)}
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>
                  Due: {fmtDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: "32px 40px" }}>

            {/* Status banner */}
            {isFullyPaid ? (
              <div style={{
                background: "#ECFDF5", border: "1px solid #A7F3D0",
                borderRadius: 8, padding: "10px 16px", marginBottom: 28,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>✓</span>
                <span style={{ color: "#065F46", fontWeight: 700, fontSize: 14 }}>FULLY PAID</span>
              </div>
            ) : outstanding > 0 ? (
              <div style={{
                background: "#FEF3C7", border: "1px solid #FDE68A",
                borderRadius: 8, padding: "10px 16px", marginBottom: 28,
              }}>
                <span style={{ color: "#92400E", fontWeight: 700, fontSize: 14 }}>
                  PARTIALLY PAID — Outstanding: {fmtUgx(outstanding)}
                </span>
              </div>
            ) : null}

            {/* Bill to + Order ref */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B9B9B", margin: "0 0 10px" }}>
                  Bill To
                </p>
                <p style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>{order.buyer.companyName}</p>
                <p style={{ color: "#6B6B6B", fontSize: 13, margin: "0 0 2px" }}>{order.buyer.contactName}</p>
                <p style={{ color: "#6B6B6B", fontSize: 13, margin: "0 0 2px" }}>{order.buyer.phone}</p>
                {order.buyer.email && <p style={{ color: "#6B6B6B", fontSize: 13, margin: "0 0 2px" }}>{order.buyer.email}</p>}
                <p style={{ color: "#6B6B6B", fontSize: 13, margin: 0 }}>{order.buyer.location}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B9B9B", margin: "0 0 10px" }}>
                  Order Reference
                </p>
                <table style={{ fontSize: 13, borderCollapse: "collapse", width: "100%" }}>
                  {[
                    ["Order No.", order.orderNumber],
                    ["Invoice No.", invoice.invoiceNumber],
                    ["Confirmed by", order.approvedBy?.name ?? "—"],
                    ["Prepared by", invoice.createdBy.name],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ color: "#9B9B9B", padding: "2px 0", paddingRight: 12 }}>{label}</td>
                      <td style={{ fontWeight: 600, padding: "2px 0" }}>{value}</td>
                    </tr>
                  ))}
                </table>
              </div>
            </div>

            {/* Line items */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 28, fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#F6F6F6", borderBottom: "1px solid #E8E8E8" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6B6B" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6B6B" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6B6B" }}>Unit Price</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6B6B" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <td style={{ padding: "14px" }}>
                    <p style={{ fontWeight: 600, margin: "0 0 2px" }}>{order.coffeeVariety.name} ({order.coffeeVariety.code}) — Processed Beans</p>
                    <p style={{ color: "#9B9B9B", fontSize: 12, margin: 0 }}>Ref: {order.orderNumber}</p>
                  </td>
                  <td style={{ padding: "14px", textAlign: "right", fontWeight: 500 }}>{fmtKg(order.quantityKg)}</td>
                  <td style={{ padding: "14px", textAlign: "right", fontWeight: 500 }}>{fmtUgx(order.pricePerKgUgx)}/kg</td>
                  <td style={{ padding: "14px", textAlign: "right", fontWeight: 700 }}>{fmtUgx(order.totalAmountUgx)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #E8E8E8" }}>
                  <td colSpan={3} style={{ padding: "14px", textAlign: "right", fontWeight: 700, fontSize: 15 }}>Total</td>
                  <td style={{ padding: "14px", textAlign: "right", fontWeight: 800, fontSize: 18, color: "#240C64" }}>{fmtUgx(order.totalAmountUgx)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Payment history */}
            {invoice.payments.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B9B9B", margin: "0 0 10px" }}>
                  Payment History
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F6F6F6", borderBottom: "1px solid #E8E8E8" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6B6B6B" }}>Date</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6B6B6B" }}>Method</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#6B6B6B" }}>Reference</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#6B6B6B" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < invoice.payments.length - 1 ? "1px solid #F0F0F0" : "none" }}>
                        <td style={{ padding: "8px 12px" }}>{fmtDate(p.paymentDate)}</td>
                        <td style={{ padding: "8px 12px" }}>{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                        <td style={{ padding: "8px 12px", color: "#9B9B9B" }}>{p.referenceNumber ?? "—"}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#065F46" }}>{fmtUgx(p.amountPaidUgx)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "1px solid #E8E8E8" }}>
                      <td colSpan={3} style={{ padding: "8px 12px", fontWeight: 700, textAlign: "right" }}>Total Paid</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: "#065F46" }}>{fmtUgx(totalPaid)}</td>
                    </tr>
                    {outstanding > 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: "4px 12px", fontWeight: 700, textAlign: "right" }}>Outstanding</td>
                        <td style={{ padding: "4px 12px", textAlign: "right", fontWeight: 800, color: "#B91C1C" }}>{fmtUgx(outstanding)}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            )}

            {/* Footer note */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 20, fontSize: 12, color: "#9B9B9B" }}>
              <p style={{ margin: "0 0 4px" }}>Please retain this invoice for your records. For queries contact Victory Coffee Factory.</p>
              <p style={{ margin: 0 }}>Payment should reference invoice number <strong style={{ color: "#1D1D1D" }}>{invoice.invoiceNumber}</strong>.</p>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; padding-top: 0 !important; }
          div[style*="paddingTop: 72"] { padding-top: 0 !important; background: #fff !important; }
        }
      `}</style>
    </>
  );
}
