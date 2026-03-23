"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-5">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>

      <h1 className="text-lg font-bold text-[#1D1D1D] mb-2">Something went wrong</h1>
      <p className="text-sm text-[#6B6B6B] max-w-sm mb-1 leading-relaxed">
        This page ran into an unexpected error. Try again or go back to the dashboard.
      </p>

      {error.digest && (
        <p className="text-xs text-[#9B9B9B] font-mono mb-6">Error ID: {error.digest}</p>
      )}

      <div className="flex items-center gap-3 mt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#F6F6F6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[#240C64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
