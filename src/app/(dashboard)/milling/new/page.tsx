"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, User, Plus, Trash2, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

interface CoffeeVariety { id: string; name: string; code: string; }
interface InventoryItem { name: string; currentStockKg: string; coffeeVarietyId: string | null; category: string; }
interface Farmer { id: string; name: string; farmerCode: string; location: string; }

interface Owner {
  key: string; // local UI key
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  inputKg: string;
}

export default function NewMillingBatchPage() {
  const router = useRouter();
  const [varieties, setVarieties] = useState<CoffeeVariety[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [batchType, setBatchType] = useState<"INDIVIDUAL" | "GROUP">("INDIVIDUAL");
  const [form, setForm] = useState({
    coffeeVarietyId: "",
    milledDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Owners list
  const [owners, setOwners] = useState<Owner[]>([{ key: "0", farmerId: "", farmerName: "", farmerCode: "", inputKg: "" }]);

  // Farmer search state (one per owner slot)
  const [searches, setSearches] = useState<Record<string, string>>({ "0": "" });
  const [suggestions, setSuggestions] = useState<Record<string, Farmer[]>>({});
  const [activeSearch, setActiveSearch] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/coffee-varieties").then(r => r.json()),
      fetch("/api/inventory").then(r => r.json()),
    ]).then(([v, inv]) => {
      setVarieties(v.varieties ?? []);
      setInventory(inv.items ?? []);
    });
  }, []);

  const searchFarmers = useCallback(async (q: string, key: string) => {
    if (!q.trim()) { setSuggestions(s => ({ ...s, [key]: [] })); return; }
    const res = await fetch(`/api/farmers?search=${encodeURIComponent(q)}&limit=8`);
    const data = await res.json();
    setSuggestions(s => ({ ...s, [key]: data.farmers ?? [] }));
  }, []);

  function handleSearchChange(key: string, value: string) {
    setSearches(s => ({ ...s, [key]: value }));
    setActiveSearch(key);
    const t = setTimeout(() => searchFarmers(value, key), 300);
    return () => clearTimeout(t);
  }

  function selectFarmerForOwner(key: string, farmer: Farmer) {
    setOwners(owners =>
      owners.map(o =>
        o.key === key
          ? { ...o, farmerId: farmer.id, farmerName: farmer.name, farmerCode: farmer.farmerCode }
          : o
      )
    );
    setSearches(s => ({ ...s, [key]: `${farmer.name} (${farmer.farmerCode})` }));
    setSuggestions(s => ({ ...s, [key]: [] }));
    setActiveSearch(null);
    setErrors(e => ({ ...e, [`owner_${key}_farmer`]: "" }));
  }

  function updateOwnerKg(key: string, kg: string) {
    setOwners(owners => owners.map(o => o.key === key ? { ...o, inputKg: kg } : o));
    setErrors(e => ({ ...e, [`owner_${key}_kg`]: "" }));
  }

  function addOwner() {
    const key = String(Date.now());
    setOwners(o => [...o, { key, farmerId: "", farmerName: "", farmerCode: "", inputKg: "" }]);
    setSearches(s => ({ ...s, [key]: "" }));
  }

  function removeOwner(key: string) {
    setOwners(o => o.filter(o => o.key !== key));
    setSearches(s => { const n = { ...s }; delete n[key]; return n; });
    setSuggestions(s => { const n = { ...s }; delete n[key]; return n; });
  }

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  }

  const rawStock = inventory.find(
    i => i.coffeeVarietyId === form.coffeeVarietyId && i.category === "RAW_COFFEE"
  );

  const totalInputKg = owners.reduce((s, o) => s + (parseFloat(o.inputKg) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.coffeeVarietyId) newErrors.coffeeVarietyId = "Select a coffee type";
    if (!form.milledDate) newErrors.milledDate = "Select a date";

    // Validate owners
    const activeOwners = batchType === "INDIVIDUAL" ? owners.slice(0, 1) : owners;
    for (const o of activeOwners) {
      if (!o.farmerId) newErrors[`owner_${o.key}_farmer`] = "Select a farmer";
      if (!o.inputKg || parseFloat(o.inputKg) <= 0) newErrors[`owner_${o.key}_kg`] = "Enter weight";
    }

    if (totalInputKg <= 0) newErrors.general = "Total input weight must be greater than 0";
    if (rawStock && totalInputKg > parseFloat(rawStock.currentStockKg)) {
      newErrors.general = `Total (${totalInputKg.toLocaleString()} kg) exceeds available stock (${parseFloat(rawStock.currentStockKg).toLocaleString()} kg)`;
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const activeOwnerList = (batchType === "INDIVIDUAL" ? owners.slice(0, 1) : owners).map(o => ({
        farmerId: o.farmerId,
        inputKg: parseFloat(o.inputKg),
      }));

      const res = await fetch("/api/milling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchType,
          coffeeVarietyId: form.coffeeVarietyId,
          milledDate: form.milledDate,
          notes: form.notes || null,
          owners: activeOwnerList,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const apiErrors = data.error;
        if (typeof apiErrors === "object") {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(apiErrors)) {
            mapped[k] = Array.isArray(v) ? v[0] : String(v);
          }
          setErrors(mapped);
        } else {
          setErrors({ general: data.error ?? "Failed to create batch" });
        }
        return;
      }
      router.push(`/milling/${data.batch.id}`);
    } finally {
      setLoading(false);
    }
  }

  const displayOwners = batchType === "INDIVIDUAL" ? owners.slice(0, 1) : owners;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="New Milling Batch"
        description="Send raw coffee to the mill for processing."
        action={
          <Link href="/milling">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {errors.general}
          </div>
        )}

        {/* Batch type selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setBatchType("INDIVIDUAL")}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              batchType === "INDIVIDUAL"
                ? "border-primary bg-primary/5"
                : "border-surface-secondary bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${batchType === "INDIVIDUAL" ? "bg-primary text-white" : "bg-surface-secondary text-gray-500"}`}>
                <User className="h-4 w-4" />
              </div>
              <span className={`font-semibold text-sm ${batchType === "INDIVIDUAL" ? "text-primary" : "text-deepest"}`}>
                Individual
              </span>
            </div>
            <p className="text-xs text-gray-500 pl-9">Single farmer owns all the coffee</p>
          </button>

          <button
            type="button"
            onClick={() => setBatchType("GROUP")}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              batchType === "GROUP"
                ? "border-primary bg-primary/5"
                : "border-surface-secondary bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${batchType === "GROUP" ? "bg-primary text-white" : "bg-surface-secondary text-gray-500"}`}>
                <Users className="h-4 w-4" />
              </div>
              <span className={`font-semibold text-sm ${batchType === "GROUP" ? "text-primary" : "text-deepest"}`}>
                Group
              </span>
            </div>
            <p className="text-xs text-gray-500 pl-9">Multiple farmers pool their coffee</p>
          </button>
        </div>

        {/* Batch details */}
        <div className="bg-white rounded-xl border border-surface-secondary p-5 space-y-5">
          <h3 className="font-semibold text-primary text-sm">Batch Details</h3>

          <div className="space-y-1.5">
            <Label>Coffee Type <span className="text-secondary">*</span></Label>
            <Select value={form.coffeeVarietyId} onValueChange={v => setField("coffeeVarietyId", v)}>
              <SelectTrigger><SelectValue placeholder="Select coffee type..." /></SelectTrigger>
              <SelectContent>
                {varieties.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name} ({v.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rawStock && (
              <p className="text-xs text-gray-500">
                Available raw stock:{" "}
                <span className="font-semibold text-primary">{parseFloat(rawStock.currentStockKg).toLocaleString()} kg</span>
              </p>
            )}
            {errors.coffeeVarietyId && <p className="text-xs text-red-600">{errors.coffeeVarietyId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="milledDate">Milling Date <span className="text-secondary">*</span></Label>
            <Input
              id="milledDate"
              type="date"
              value={form.milledDate}
              onChange={e => setField("milledDate", e.target.value)}
            />
            {errors.milledDate && <p className="text-xs text-red-600">{errors.milledDate}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
            <textarea
              id="notes"
              rows={2}
              placeholder="e.g. Machine 2, afternoon batch..."
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              className="w-full rounded-md border border-surface-secondary px-3 py-2 text-sm text-deepest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
            />
          </div>
        </div>

        {/* Owners section */}
        <div className="bg-white rounded-xl border border-surface-secondary p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary text-sm">
                {batchType === "INDIVIDUAL" ? "Farmer / Owner" : "Group Members"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {batchType === "GROUP"
                  ? "Each member must be a registered farmer. Their outputs will be split proportionally."
                  : "Select the farmer who owns this coffee."}
              </p>
            </div>
            {batchType === "GROUP" && totalInputKg > 0 && (
              <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
                Total: {totalInputKg.toLocaleString()} kg
              </span>
            )}
          </div>

          <div className="space-y-3">
            {displayOwners.map((owner, idx) => (
              <div key={owner.key} className="bg-surface-primary rounded-lg p-3 space-y-3">
                {batchType === "GROUP" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Member {idx + 1}
                    </span>
                    {owners.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOwner(owner.key)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-5 gap-3">
                  {/* Farmer search */}
                  <div className="col-span-3 space-y-1 relative">
                    <Label className="text-xs">Farmer <span className="text-secondary">*</span></Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search name or code..."
                        value={searches[owner.key] ?? ""}
                        onChange={e => handleSearchChange(owner.key, e.target.value)}
                        onFocus={() => setActiveSearch(owner.key)}
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-surface-secondary focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                      />
                    </div>
                    {/* Suggestions dropdown */}
                    {activeSearch === owner.key && (suggestions[owner.key] ?? []).length > 0 && !owner.farmerId && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-surface-secondary rounded-lg shadow-lg overflow-hidden">
                        {suggestions[owner.key].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => selectFarmerForOwner(owner.key, f)}
                            className="w-full text-left px-3 py-2 hover:bg-surface-primary text-sm flex items-center justify-between border-b border-surface-secondary last:border-0"
                          >
                            <span className="font-medium text-deepest">{f.name}</span>
                            <span className="text-xs text-gray-400">{f.farmerCode} · {f.location}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {owner.farmerId && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-success font-medium">✓ Selected</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOwners(o => o.map(x => x.key === owner.key ? { ...x, farmerId: "", farmerName: "", farmerCode: "" } : x));
                            setSearches(s => ({ ...s, [owner.key]: "" }));
                          }}
                          className="text-xs text-gray-400 hover:text-red-500 ml-1 underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {errors[`owner_${owner.key}_farmer`] && (
                      <p className="text-xs text-red-600">{errors[`owner_${owner.key}_farmer`]}</p>
                    )}
                  </div>

                  {/* Input KG */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">
                      {batchType === "GROUP" ? "Their Input (kg)" : "Input Weight (kg)"}
                      <span className="text-secondary ml-0.5">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 500"
                      value={owner.inputKg}
                      onChange={e => updateOwnerKg(owner.key, e.target.value)}
                    />
                    {errors[`owner_${owner.key}_kg`] && (
                      <p className="text-xs text-red-600">{errors[`owner_${owner.key}_kg`]}</p>
                    )}
                  </div>
                </div>

                {/* Share preview for group */}
                {batchType === "GROUP" && owner.farmerId && parseFloat(owner.inputKg) > 0 && totalInputKg > 0 && (
                  <p className="text-xs text-gray-500">
                    Share:{" "}
                    <span className="font-semibold text-primary">
                      {((parseFloat(owner.inputKg) / totalInputKg) * 100).toFixed(1)}%
                    </span>{" "}
                    of batch output
                  </p>
                )}
              </div>
            ))}
          </div>

          {batchType === "GROUP" && (
            <button
              type="button"
              onClick={addOwner}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-surface-secondary hover:border-primary/30 text-sm text-gray-400 hover:text-primary transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Another Member
            </button>
          )}
        </div>

        {/* Summary info box */}
        <div className="bg-surface-primary rounded-lg p-3 text-xs text-gray-500">
          Creating this batch will immediately deduct{" "}
          <strong className="text-deepest">
            {totalInputKg > 0 ? `${totalInputKg.toLocaleString()} kg` : "the input weight"}
          </strong>{" "}
          from raw inventory.
          {batchType === "GROUP" && owners.filter(o => o.farmerId).length > 1 && (
            <> When completed, outputs will be split proportionally between all {owners.filter(o => o.farmerId).length} members.</>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Start Milling Batch"}
          </Button>
          <Link href="/milling">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
