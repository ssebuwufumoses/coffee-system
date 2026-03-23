"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "#F35C2C", color: "#fff", border: "none", borderRadius: 8,
        padding: "8px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}
    >
      🖨 Print / Save as PDF
    </button>
  );
}
