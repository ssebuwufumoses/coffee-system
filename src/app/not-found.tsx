import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F6F6F6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        }}>
          <div style={{
            background: "#fff", border: "1px solid #E8E8E8", borderRadius: 12, padding: "40px 48px",
            maxWidth: 440, width: "100%", textAlign: "center",
          }}>
            <p style={{ fontSize: 64, fontWeight: 800, color: "#E8E8E8", lineHeight: 1, margin: "0 0 4px" }}>404</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1D", margin: "0 0 8px" }}>
              Page not found
            </h1>
            <p style={{ fontSize: 14, color: "#6B6B6B", margin: "0 0 28px", lineHeight: 1.6 }}>
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <a
              href="/dashboard"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#240C64", color: "#fff", textDecoration: "none",
                borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600,
              }}
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
