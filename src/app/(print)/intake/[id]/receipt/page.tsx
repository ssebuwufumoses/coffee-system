import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "./print-button";

const GRADE_LABELS: Record<string, string> = {
  SCREEN_18: "Screen 18",
  SCREEN_15: "Screen 15",
  SCREEN_12: "Screen 12",
  FAQ: "FAQ",
  KIBOKO: "Kiboko",
  OTHER: "Other",
};

export default async function DeliveryReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      farmer: true,
      coffeeVariety: true,
      recordedBy: { select: { name: true } },
    },
  });

  if (!delivery) notFound();

  const ref = delivery.id.slice(0, 8).toUpperCase();
  const grade = delivery.ucdaGrade ? GRADE_LABELS[delivery.ucdaGrade] ?? delivery.ucdaGrade : "—";
  const date = new Date(delivery.deliveryDate).toLocaleDateString("en-UG", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, ui-sans-serif, sans-serif; background: #F6F6F6; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .receipt { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* Print / Save button — hidden when printing */}
      <div className="no-print" style={{ background: "#240C64", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Victory Coffee — Delivery Receipt</span>
        <PrintButton />
      </div>

      <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
        <div className="receipt" style={{
          background: "#fff", borderRadius: 16, boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
          width: "100%", maxWidth: 520, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ background: "#240C64", padding: "28px 32px" }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Victory Coffee Factory · Lwengo, Uganda
            </p>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
              Coffee Intake Receipt
            </h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Ref: <strong style={{ color: "#fff" }}>#{ref}</strong></p>
          </div>

          {/* Body */}
          <div style={{ padding: "28px 32px" }}>

            {/* Farmer */}
            <div style={{ background: "#F8F8FF", border: "1px solid #E8E4FF", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: "#9B9B9B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Farmer</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#240C64" }}>{delivery.farmer.name}</p>
              <p style={{ fontSize: 13, color: "#6B6B6B", marginTop: 2 }}>{delivery.farmer.farmerCode} · {delivery.farmer.location}</p>
              <p style={{ fontSize: 13, color: "#6B6B6B" }}>{delivery.farmer.phone}</p>
            </div>

            {/* Details table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              {[
                ["Delivery Date", date],
                ["Coffee Type", delivery.coffeeVariety.name],
                ["UCDA Grade", grade],
                ["Weight Received", `${Number(delivery.weightKg).toLocaleString()} kg`],
                delivery.moistureContentPct !== null
                  ? ["Moisture Content", `${Number(delivery.moistureContentPct).toFixed(1)}%`]
                  : null,
                delivery.foreignMatterPct !== null
                  ? ["Foreign Matter", `${Number(delivery.foreignMatterPct).toFixed(1)}%`]
                  : null,
                ["Recorded By", delivery.recordedBy.name],
              ]
                .filter(Boolean)
                .map(([label, value], i, arr) => (
                  <tr key={label as string} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F0F0F0" : "none" }}>
                    <td style={{ padding: "10px 0", color: "#9B9B9B", width: "45%" }}>{label}</td>
                    <td style={{ padding: "10px 0", fontWeight: 600, color: "#1D1D1D" }}>{value}</td>
                  </tr>
                ))}
            </table>

            {/* Weight highlight */}
            <div style={{
              marginTop: 24, background: "#F35C2C", borderRadius: 12,
              padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Total Weight Accepted</span>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 24 }}>
                {Number(delivery.weightKg).toLocaleString()} kg
              </span>
            </div>

            {delivery.notes && (
              <p style={{ marginTop: 16, fontSize: 13, color: "#6B6B6B", fontStyle: "italic" }}>
                Note: {delivery.notes}
              </p>
            )}

            {/* Footer */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #F0F0F0" }}>
              <p style={{ fontSize: 12, color: "#9B9B9B", textAlign: "center" }}>
                This is an official receipt from Victory Coffee Factory.<br />
                Keep this for your records. For queries call us directly.
              </p>
              <p style={{ fontSize: 11, color: "#BDBDBD", textAlign: "center", marginTop: 8 }}>
                Printed: {new Date().toLocaleString("en-UG")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        // Auto-trigger print dialog if ?print=1 is in the URL
        if (new URLSearchParams(window.location.search).get('print') === '1') {
          window.onload = () => window.print();
        }
      `}} />
    </>
  );
}
