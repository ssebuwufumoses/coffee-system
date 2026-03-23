"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Order {
  id: string;
  orderNumber: string;
  quantityKg: string;
  buyer: { companyName: string; contactName: string; phone: string; location: string };
  coffeeVariety: { name: string; code: string };
  approvedBy: { name: string } | null;
  dispatches: {
    id: string;
    gatePassNumber: string;
    dispatchedKg: string;
    dispatchDate: string;
    truckRegistration: string | null;
    driverName: string | null;
    driverPhone: string | null;
    dispatchedBy: { name: string };
  }[];
}

function fmtKg(v: string | number) {
  const n = parseFloat(String(v));
  return n >= 1000 ? `${(n / 1000).toFixed(2)} tonnes` : `${n.toLocaleString()} kg`;
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-UG", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function GatePassPrintPage() {
  const { id, dispatchId } = useParams<{ id: string; dispatchId: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(r => r.json())
      .then(d => { if (d.order) setOrder(d.order); });
  }, [id]);

  useEffect(() => {
    if (order) {
      const dispatch = order.dispatches.find(d => d.id === dispatchId);
      if (dispatch) document.title = `Gate Pass ${dispatch.gatePassNumber} — Victory Coffee Factory`;
    }
  }, [order, dispatchId]);

  if (!order) return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B6B6B" }}>Loading…</div>
  );

  const dispatch = order.dispatches.find(d => d.id === dispatchId);
  if (!dispatch) return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: 40, color: "#6B6B6B" }}>Dispatch not found.</div>
  );

  const rows: [string, string][] = [
    ["Gate Pass No.", dispatch.gatePassNumber],
    ["Order No.", order.orderNumber],
    ["Date & Time", fmtDateTime(dispatch.dispatchDate)],
    ["Coffee Variety", `${order.coffeeVariety.name} (${order.coffeeVariety.code})`],
    ["Quantity Dispatched", fmtKg(dispatch.dispatchedKg)],
    ["Buyer", order.buyer.companyName],
    ["Buyer Contact", `${order.buyer.contactName} · ${order.buyer.phone}`],
    ["Buyer Location", order.buyer.location],
    ["Truck Registration", dispatch.truckRegistration ?? "—"],
    ["Driver / Rep.", dispatch.driverName ?? "—"],
    ["Driver Phone", dispatch.driverPhone ?? "—"],
    ["Dispatched By", dispatch.dispatchedBy.name],
    ["Confirmed By", order.approvedBy?.name ?? "—"],
  ];

  return (
    <>
      {/* Action bar */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#240C64", padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600 }}>
          Gate Pass {dispatch.gatePassNumber}
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

      {/* Gate pass document */}
      <div style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        color: "#1D1D1D",
        background: "#F6F6F6",
        minHeight: "100vh",
        paddingTop: 72,
        paddingBottom: 40,
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", borderRadius: 12, border: "1px solid #E8E8E8", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ background: "#240C64", padding: "28px 36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>
                  Victory Coffee Factory
                </p>
                <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 }}>GATE PASS</h1>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: 10, padding: "10px 18px", textAlign: "center",
              }}>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px" }}>Pass No.</p>
                <p style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "0.05em" }}>{dispatch.gatePassNumber}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: "28px 36px" }}>

            {/* Details table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                {rows.map(([label, value], i) => (
                  <tr key={label} style={{ borderBottom: i < rows.length - 1 ? "1px solid #F0F0F0" : "none" }}>
                    <td style={{ padding: "10px 0", color: "#9B9B9B", width: "40%", fontSize: 13 }}>{label}</td>
                    <td style={{ padding: "10px 0", fontWeight: 600, color: "#1D1D1D" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signature section */}
            <div style={{
              marginTop: 36,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              borderTop: "1px solid #E8E8E8",
              paddingTop: 28,
            }}>
              {["Dispatched By (Factory)", "Received By (Buyer / Driver)"].map(label => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#9B9B9B", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 40px" }}>
                    {label}
                  </p>
                  <div style={{ borderBottom: "1px solid #1D1D1D", marginBottom: 6 }} />
                  <p style={{ fontSize: 11, color: "#9B9B9B", margin: 0 }}>Signature &amp; Date</p>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 24, fontSize: 11, color: "#9B9B9B", textAlign: "center" }}>
              This gate pass authorises the exit of the above-described goods from Victory Coffee Factory premises.
            </p>
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
