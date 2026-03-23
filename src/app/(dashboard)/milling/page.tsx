"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Factory, TrendingUp, Calculator, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

interface BatchOwner {
  farmerId: string;
  inputKg: string;
  farmer: { name: string; farmerCode: string };
}

interface MillingBatch {
  id: string;
  batchNumber: string;
  batchType: "INDIVIDUAL" | "GROUP";
  status: "QUEUED" | "IN_PROGRESS" | "COMPLETED";
  inputRawKg: string;
  outputBeansKg: string | null;
  outputHusksKg: string | null;
  moistureLossKg: string | null;
  conversionRatePct: string | null;
  milledDate: string;
  coffeeVariety: { name: string; code: string };
  createdBy: { name: string };
  owners: BatchOwner[];
}

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export default function MillingPage() {
  const [batches, setBatches] = useState<MillingBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRate, setAvgRate] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Target calculator state
  const [targetKg, setTargetKg] = useState("");
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/milling?page=${page}`);
      const data = await res.json();
      setBatches(data.batches ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setAvgRate(data.avgConversionRate);
      setCompletedCount(data.completedBatchCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function calculateTarget() {
    const target = parseFloat(targetKg);
    if (!target || !avgRate) return;
    const rate = parseFloat(avgRate) / 100;
    setCalcResult(Math.ceil(target / rate));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Milling & Processing"
        description={`${total} total batches`}
        action={
          <Link href="/milling/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />New Milling Batch
            </Button>
          </Link>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Avg Conversion Rate</p>
          <p className="text-3xl font-bold text-primary mt-1">
            {avgRate ? `${avgRate}%` : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {completedCount > 0 ? `Based on ${completedCount} completed batch${completedCount !== 1 ? "es" : ""}` : "No completed batches yet"}
          </p>
        </div>

        {/* Predictive Calculator */}
        <div className="md:col-span-2 bg-white rounded-xl border border-surface-secondary p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Target Calculator</p>
            {!avgRate && <span className="text-xs text-gray-400">(Complete batches first to enable)</span>}
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Target processed beans needed (kg)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 2000"
                value={targetKg}
                onChange={e => { setTargetKg(e.target.value); setCalcResult(null); }}
                disabled={!avgRate}
                className="w-full rounded-md border border-surface-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <Button
              onClick={calculateTarget}
              disabled={!avgRate || !targetKg}
              variant="outline"
              size="sm"
            >
              Calculate
            </Button>
          </div>
          {calcResult && (
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                To produce <strong>{parseFloat(targetKg).toLocaleString()} kg</strong> of processed beans at{" "}
                <strong>{avgRate}%</strong> conversion rate, you need approximately:
              </p>
              <p className="text-2xl font-bold text-primary mt-1">
                {calcResult.toLocaleString()} kg <span className="text-base font-normal text-gray-500">of raw coffee</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Batches table */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-secondary bg-surface-primary">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Batch</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden sm:table-cell">Owner(s)</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Coffee</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Input (kg)</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Beans Out</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden lg:table-cell">Rate %</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading batches...</td></tr>

            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Factory className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No milling batches yet</p>
                  <p className="text-gray-300 text-xs mt-1">Create the first batch to start processing</p>
                </td>
              </tr>
            ) : (
              batches.map(b => (
                <tr key={b.id} className="border-b border-surface-secondary last:border-0 hover:bg-surface-primary/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-medium text-primary">{b.batchNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(b.milledDate).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {b.batchType === "GROUP" ? (
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Users className="h-3 w-3 text-primary" />
                          <span className="text-xs font-semibold text-primary">{b.owners.length} members</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">
                          {b.owners.map(o => o.farmer.name).join(", ")}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-deepest">{b.owners[0]?.farmer.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{b.owners[0]?.farmer.farmerCode}</p>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="muted">{b.coffeeVariety.name}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[b.status]}`}>
                      {STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-deepest">
                    {parseFloat(b.inputRawKg).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                    {b.outputBeansKg ? parseFloat(b.outputBeansKg).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {b.conversionRatePct ? (
                      <span className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <span className="text-success font-medium">{parseFloat(b.conversionRatePct).toFixed(1)}%</span>
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/milling/${b.id}`}>
                      <Button variant="outline" size="sm">
                        {b.status === "COMPLETED" ? "View" : "Complete"}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-secondary">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
