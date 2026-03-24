"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, UserPlus, Phone, MapPin, Leaf, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Farmer = {
  id: string;
  farmerCode: string;
  name: string;
  phone: string;
  location: string;
  isActive: boolean;
  paymentPreference: string;
  coffeeVariety: { name: string; code: string };
  deliveredKg: number;
  husksEarned: number;
  husksTaken: number;
  husksBalance: number;
  _count: { deliveries: number };
};

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Farmer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/farmers?${params}`);
      const data = await res.json();
      setFarmers(data.farmers ?? []);
      setPages(data.pages ?? 1);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchFarmers, 300);
    return () => clearTimeout(timer);
  }, [fetchFarmers]);

  // Reset to page 1 on new search
  useEffect(() => { setPage(1); }, [search]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(""); setDeleteLoading(true);
    try {
      const res = await fetch(`/api/farmers/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "Failed to delete farmer"); return; }
      setDeleteTarget(null);
      fetchFarmers();
    } finally { setDeleteLoading(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farmers"
        description={`${total} registered farmers`}
        action={
          <Link href="/farmers/new">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Register Farmer
            </Button>
          </Link>
        }
      />

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, code, phone or village…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-secondary bg-surface-primary">
              <th className="text-left px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide hidden sm:table-cell">Contact</th>
              <th className="text-left px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide hidden md:table-cell">Variety</th>
              <th className="text-right px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide hidden md:table-cell">Delivered (kg)</th>
              <th className="text-right px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide">Husks</th>
              <th className="text-left px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-secondary">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-surface-secondary rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : farmers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {search ? "No farmers match your search." : "No farmers registered yet."}
                </td>
              </tr>
            ) : (
              farmers.map((farmer) => (
                <tr
                  key={farmer.id}
                  className="hover:bg-surface-primary/50 transition-colors cursor-pointer"
                  onClick={() => (window.location.href = `/farmers/${farmer.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-primary font-semibold">{farmer.farmerCode}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-deepest">{farmer.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {farmer.phone}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {farmer.location}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Leaf className="h-3 w-3 text-success" />
                      <span className="text-gray-600">{farmer.coffeeVariety.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-deepest hidden md:table-cell">
                    {farmer.deliveredKg.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${farmer.husksBalance === 0 ? "text-success" : farmer.husksBalance > 20 ? "text-warning" : "text-primary"}`}>
                      {farmer.husksBalance}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">bags</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={farmer.isActive ? "success" : "muted"}>
                      {farmer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {farmer.deliveredKg === 0 && farmer._count.deliveries === 0 && (
                      <button
                        onClick={() => { setDeleteTarget(farmer); setDeleteError(""); }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete farmer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Delete Farmer</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700">
                Delete <span className="font-semibold">{deleteTarget.name}</span> ({deleteTarget.farmerCode})?
                This cannot be undone.
              </p>
              <p className="text-xs text-gray-400">Only farmers with no deliveries or payments can be deleted.</p>
              {deleteError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={deleteLoading} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {deleteLoading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
