"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Payment {
  id: string;
  amountPaidUgx: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  recordedBy: { name: string };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountUgx: string;
  dueDate: string;
  paymentStatus: string;
  createdAt: string;
  payments: Payment[];
}

interface Order {
  id: string;
  orderNumber: string;
  quantityKg: string;
  pricePerKgUgx: string;
  totalAmountUgx: string;
  createdAt: string;
  buyer: {
    companyName: string;
    contactName: string;
    phone: string;
    email: string | null;
    location: string;
  };
  coffeeVariety: { name: string; code: string };
  approvedBy: { name: string } | null;
  invoices: Invoice[];
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

export default function PaymentReceiptPage() {
  const { id, paymentId } = useParams<{ id: string; paymentId: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(r => r.json())
      .then(d => { if (d.order) setOrder(d.order); });
  }, [id]);

  useEffect(() => {
    if (order) document.title = `Payment Receipt — ${order.orderNumber} — Victory Coffee Factory`;
  }, [order]);

  if (!order) return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B6B6B" }}>Loading…</div>
  );

  const invoice = order.invoices[0];
  if (!invoice) return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B6B6B" }}>No invoice found.</div>
  );

  // Find this specific payment and its index
  const paymentIdx = invoice.payments.findIndex(p => p.id === paymentId);
  const payment = invoice.payments[paymentIdx];
  if (!payment) return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B6B6B" }}>Payment not found.</div>
  );

  const installmentNumber = paymentIdx + 1;
  const totalInstallments = invoice.payments.length;

  // Cumulative paid UP TO and INCLUDING this payment
  const cumulativePaid = invoice.payments
    .slice(0, paymentIdx + 1)
    .reduce((s, p) => s + parseFloat(String(p.amountPaidUgx)), 0);

  const invoiceAmount = parseFloat(String(invoice.amountUgx));
  const outstanding = invoiceAmount - cumulativePaid;
  const isFullyCleared = outstanding <= 0;

  // Receipt number: INV-XXXX-RXX
  const receiptNumber = `${invoice.invoiceNumber}-R${String(installmentNumber).padStart(2, "0")}`;

  return (
    <>
      {/* Action bar */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#240C64", padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600 }}>
          Receipt {receiptNumber}
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
              background: "#F35C2C", border: "none", color: "#080223",
              borderRadius: 8, padding: "6px 20px",
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Receipt document */}
      <div style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#1D1D1D",
        background: "#F6F6F6",
        minHeight: "100vh",
        paddingTop: 72,
        paddingBottom: 40,
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 12, border: "1px solid #E8E8E8", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ background: "#240C64", padding: "28px 36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>
                  Victory Coffee Factory
                </p>
                <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>PAYMENT RECEIPT</h1>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>
                  Installment {installmentNumber} of {totalInstallments}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#fff", fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{receiptNumber}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "0 0 2px" }}>
                  {fmtDate(payment.paymentDate)}
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0 }}>
                  Invoice: {invoice.invoiceNumber}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: "28px 36px" }}>

            {/* Cleared banner */}
            {isFullyCleared && (
              <div style={{
                background: "#ECFDF5", border: "2px solid #6EE7B7",
                borderRadius: 10, padding: "14px 20px", marginBottom: 24,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 24 }}>✓</span>
                <div>
                  <p style={{ color: "#065F46", fontWeight: 800, fontSize: 16, margin: "0 0 2px" }}>ACCOUNT CLEARED</p>
                  <p style={{ color: "#059669", fontSize: 13, margin: 0 }}>
                    This payment completes the full invoice amount of {fmtUgx(invoiceAmount)}.
                  </p>
                </div>
              </div>
            )}

            {/* Received from */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B9B9B", margin: "0 0 8px" }}>
                Received From
              </p>
              <p style={{ fontWeight: 700, fontSize: 16, margin: "0 0 2px" }}>{order.buyer.companyName}</p>
              <p style={{ color: "#6B6B6B", fontSize: 13, margin: "0 0 2px" }}>{order.buyer.contactName} · {order.buyer.phone}</p>
              {order.buyer.email && <p style={{ color: "#6B6B6B", fontSize: 13, margin: 0 }}>{order.buyer.email}</p>}
            </div>

            {/* This payment */}
            <div style={{
              background: "#F0FDF4", border: "1px solid #BBF7D0",
              borderRadius: 10, padding: "20px 24px", marginBottom: 24,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#065F46", margin: "0 0 12px" }}>
                This Payment
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#6B6B6B", fontSize: 13, margin: "0 0 2px" }}>
                    {METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                    {payment.referenceNumber && ` · Ref: ${payment.referenceNumber}`}
                  </p>
                  <p style={{ color: "#9B9B9B", fontSize: 12, margin: 0 }}>Recorded by {payment.recordedBy.name}</p>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#065F46", margin: 0 }}>
                  {fmtUgx(payment.amountPaidUgx)}
                </p>
              </div>
            </div>

            {/* Running balance */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 24 }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <td style={{ padding: "10px 0", color: "#9B9B9B" }}>
                    Invoice Total ({order.coffeeVariety.name} · {fmtKg(order.quantityKg)})
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>{fmtUgx(invoiceAmount)}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <td style={{ padding: "10px 0", color: "#9B9B9B" }}>Total Paid to Date (incl. this payment)</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, color: "#065F46" }}>{fmtUgx(cumulativePaid)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "10px 0", fontWeight: 700 }}>
                    {isFullyCleared ? "Balance Remaining" : "Balance Remaining"}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 800, fontSize: 16, color: isFullyCleared ? "#065F46" : "#B91C1C" }}>
                    {isFullyCleared ? "NIL" : fmtUgx(outstanding)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* All installments summary */}
            {totalInstallments > 1 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9B9B9B", margin: "0 0 8px" }}>
                  All Installments
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F6F6F6", borderBottom: "1px solid #E8E8E8" }}>
                      <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 600, color: "#6B6B6B" }}>#</th>
                      <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 600, color: "#6B6B6B" }}>Date</th>
                      <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 600, color: "#6B6B6B" }}>Method</th>
                      <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600, color: "#6B6B6B" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p, i) => (
                      <tr key={p.id} style={{
                        borderBottom: "1px solid #F0F0F0",
                        background: p.id === paymentId ? "#FFF7ED" : "transparent",
                      }}>
                        <td style={{ padding: "7px 10px", fontWeight: p.id === paymentId ? 700 : 400 }}>
                          {i + 1}{p.id === paymentId ? " ◀" : ""}
                        </td>
                        <td style={{ padding: "7px 10px" }}>{fmtDate(p.paymentDate)}</td>
                        <td style={{ padding: "7px 10px", color: "#6B6B6B" }}>{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600, color: "#065F46" }}>{fmtUgx(p.amountPaidUgx)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Order reference */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: 16, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9B9B9B" }}>
              <span>Order: <strong style={{ color: "#1D1D1D" }}>{order.orderNumber}</strong></span>
              <span>Invoice: <strong style={{ color: "#1D1D1D" }}>{invoice.invoiceNumber}</strong></span>
              <span>Receipt: <strong style={{ color: "#1D1D1D" }}>{receiptNumber}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          div[style*="paddingTop: 72"] { padding-top: 0 !important; background: #fff !important; }
        }
      `}</style>
    </>
  );
}
