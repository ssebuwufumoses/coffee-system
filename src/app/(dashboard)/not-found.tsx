import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-7xl font-extrabold text-[#E8E8E8] leading-none mb-2">404</p>
      <h1 className="text-lg font-bold text-[#1D1D1D] mb-2">Page not found</h1>
      <p className="text-sm text-[#6B6B6B] max-w-xs mb-8 leading-relaxed">
        This page doesn&apos;t exist or you may not have permission to view it.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-[#240C64] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a0948] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
