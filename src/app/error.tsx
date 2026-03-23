"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F6F6F6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        }}>
          <div style={{
            background: "#fff", border: "1px solid #E8E8E8", borderRadius: 12, padding: "40px 48px",
            maxWidth: 480, width: "100%", textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "#FEF2F2", border: "1px solid #FECACA",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
            }}>
              <AlertTriangle size={22} color="#DC2626" />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1D", margin: "0 0 8px" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#6B6B6B", margin: "0 0 28px", lineHeight: 1.6 }}>
              An unexpected error occurred. Please try again — if it keeps happening, contact your system administrator.
            </p>
            {error.digest && (
              <p style={{ fontSize: 11, color: "#9B9B9B", fontFamily: "monospace", marginBottom: 24 }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#240C64", color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
