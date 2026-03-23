"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Scale, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

interface Delivery {
  id: string;
  deliveryDate: string;
  weightKg: string;
  moistureContentPct: string | null;
  status: "PENDING" | "IN_PROGRESS" | "MILLED";
  farmer: { id: string; name: string; farmerCode: string };
  coffeeVariety: { name: string; code: string };
  recordedBy: { name: string };
  createdAt: string;
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page) });
      const res = await fetch(`/api/deliveries?${params}`);
      const data = await res.json();
      setDeliveries(data.deliveries ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(loadDeliveries, 300);
    return () => clearTimeout(t);
  }, [loadDeliveries]);

  function formatWeight(kg: string) {
    return `${parseFloat(kg).toLocaleString()} kg`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intake & Deliveries"
        description={`${total.toLocaleString()} total delivery records`}
        action={
          <Link href="/intake/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Delivery
            </Button>
          </Link>
        }
      />

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search farmer name or code..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-secondary bg-surface-primary">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Farmer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Coffee Type</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Weight</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden lg:table-cell">Moisture %</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide hidden lg:table-cell">Recorded By</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">Loading deliveries...</td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Scale className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No deliveries recorded yet</p>
                    <p className="text-gray-300 text-xs mt-1">Record the first delivery to get started</p>
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-surface-secondary last:border-0 hover:bg-surface-primary/50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{formatDate(d.deliveryDate)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/farmers/${d.farmer.id}`} className="group">
                        <div className="font-medium text-primary group-hover:underline flex items-center gap-1">
                          {d.farmer.name}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                        <div className="text-xs text-gray-400">{d.farmer.farmerCode}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="muted">{d.coffeeVariety.name}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-deepest">{formatWeight(d.weightKg)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">
                      {d.moistureContentPct ? `${parseFloat(d.moistureContentPct).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{d.recordedBy.name}</td>
                    <td className="px-4 py-3">
                      {d.status === "MILLED" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 rounded-full px-2.5 py-1">
                          ✓ Milled
                        </span>
                      ) : d.status === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                          ⚙ In Milling
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 rounded-full px-2.5 py-1">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/intake/${d.id}`}>
                        <Button variant="outline" size="sm">Receipt</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-secondary">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
