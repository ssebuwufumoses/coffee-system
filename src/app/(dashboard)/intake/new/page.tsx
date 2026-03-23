"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Scale, CheckCircle, AlertTriangle, MapPin, MessageCircle, FileText, Package, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

interface Farmer {
  id: string;
  farmerCode: string;
  name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface CoffeeVariety {
  id: string;
  name: string;
  code: string;
}

interface HuskAlert {
  qualified: boolean;
  balance: number;
  large: boolean;
}

const UCDA_GRADES = [
  { value: "SCREEN_18", label: "Screen 18 — Robusta (Coarse)" },
  { value: "SCREEN_15", label: "Screen 15 — Robusta (Medium)" },
  { value: "SCREEN_12", label: "Screen 12 — Robusta (Fine)" },
  { value: "FAQ",       label: "FAQ — Fair Average Quality" },
  { value: "KIBOKO",    label: "Kiboko — Dry Cherry" },
  { value: "OTHER",     label: "Other" },
];

export default function NewIntakePage() {
  const router = useRouter();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [varieties, setVarieties] = useState<CoffeeVariety[]>([]);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    deliveryId: string;
    farmerName: string;
    farmerCode: string;
    weightKg: number;
    coffeeType: string;
    grade: string;
    huskAlert: HuskAlert | null;
    whatsappSent: boolean;
    whatsappUrl: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    farmerId: "",
    coffeeVarietyId: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    weightKg: "",
    moistureContentPct: "",
    foreignMatterPct: "",
    ucdaGrade: "",
    notes: "",
  });

  // Load coffee varieties once
  useEffect(() => {
    fetch("/api/coffee-varieties")
      .then((r) => r.json())
      .then((d) => setVarieties(d.varieties ?? []));
  }, []);

  // Debounced farmer search
  const searchFarmers = useCallback(async (q: string) => {
    const res = await fetch(`/api/farmers?search=${encodeURIComponent(q)}&limit=10`);
    const data = await res.json();
    setFarmers(data.farmers ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchFarmers(farmerSearch), 300);
    return () => clearTimeout(t);
  }, [farmerSearch, searchFarmers]);

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  // Live moisture check — show warning as user types
  const moistureVal = form.moistureContentPct ? parseFloat(form.moistureContentPct) : null;
  const moistureTooHigh = moistureVal !== null && moistureVal > 13;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!form.farmerId) newErrors.farmerId = "Select a farmer";
    if (!form.coffeeVarietyId) newErrors.coffeeVarietyId = "Select a coffee type";
    if (!form.weightKg || parseFloat(form.weightKg) <= 0) newErrors.weightKg = "Enter a valid weight";
    if (!form.deliveryDate) newErrors.deliveryDate = "Select a date";
    if (!form.ucdaGrade) newErrors.ucdaGrade = "Select a UCDA grade";
    if (moistureTooHigh) {
      newErrors.moistureContentPct = `Rejected: Too Wet (${moistureVal}%). UCDA max is 13%.`;
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: form.farmerId,
          coffeeVarietyId: form.coffeeVarietyId,
          deliveryDate: form.deliveryDate,
          weightKg: parseFloat(form.weightKg),
          moistureContentPct: form.moistureContentPct ? parseFloat(form.moistureContentPct) : null,
          foreignMatterPct: form.foreignMatterPct ? parseFloat(form.foreignMatterPct) : null,
          ucdaGrade: form.ucdaGrade || null,
          notes: form.notes || null,
        }),
      });

      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty body */ }

      if (!res.ok) {
        const apiErrors = data.error;
        if (apiErrors && typeof apiErrors === "object") {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(apiErrors as Record<string, unknown>)) {
            mapped[k] = Array.isArray(v) ? v[0] : String(v);
          }
          setErrors(mapped);
        } else {
          setErrors({ general: typeof apiErrors === "string" ? apiErrors : "Something went wrong. Please log out and log back in." });
        }
        return;
      }

      const gradeLabel = UCDA_GRADES.find(g => g.value === form.ucdaGrade)?.label ?? form.ucdaGrade;
      const delivery = data.delivery as { id: string };
      setSuccessData({
        deliveryId: delivery.id,
        farmerName: selectedFarmer?.name ?? "",
        farmerCode: selectedFarmer?.farmerCode ?? "",
        weightKg: parseFloat(form.weightKg),
        coffeeType: varieties.find(v => v.id === form.coffeeVarietyId)?.name ?? "",
        grade: gradeLabel,
        huskAlert: (data.huskAlert as HuskAlert) ?? null,
        whatsappSent: (data.whatsappSent as boolean) ?? false,
        whatsappUrl: (data.whatsappUrl as string) ?? "",
      });
    } finally {
      setLoading(false);
    }
  }

  function recordAnother() {
    setSuccessData(null);
    setSelectedFarmer(null);
    setForm({
      farmerId: "",
      coffeeVarietyId: "",
      deliveryDate: new Date().toISOString().split("T")[0],
      weightKg: "",
      moistureContentPct: "",
      foreignMatterPct: "",
      ucdaGrade: "",
      notes: "",
    });
    setFarmerSearch("");
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (successData) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-surface-secondary overflow-hidden">
          <div className="h-2 bg-success w-full" />
          <div className="p-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-success">Delivery Recorded</h2>
              <p className="text-gray-500 text-sm mt-1">
                {successData.whatsappSent
                  ? "WhatsApp receipt sent automatically · Inventory updated"
                  : "Inventory updated · Tap button below to send WhatsApp receipt"}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
              <div className="bg-primary/8 rounded-full px-4 py-1.5 text-sm font-semibold text-primary">
                {successData.farmerName}
              </div>
              <div className="text-gray-300 text-lg">·</div>
              <div className="bg-surface-secondary rounded-full px-4 py-1.5 text-sm font-medium text-gray-600">
                {successData.coffeeType}
              </div>
              <div className="text-gray-300 text-lg">·</div>
              <div className="bg-secondary rounded-full px-4 py-1.5 text-sm font-bold text-deepest">
                {successData.weightKg.toLocaleString()} kg
              </div>
              <div className="text-gray-300 text-lg">·</div>
              <div className="bg-primary/6 rounded-full px-4 py-1.5 text-xs font-medium text-primary">
                {successData.grade}
              </div>
            </div>
          </div>
        </div>

        {/* Husk alert banner */}
        {successData.huskAlert && (
          <div className={`rounded-2xl overflow-hidden border ${
            successData.huskAlert.large ? "border-warning/40" : "border-success/30"
          }`}>
            {/* Top colour strip */}
            <div className={`px-5 py-2.5 flex items-center gap-2 ${
              successData.huskAlert.large ? "bg-warning text-white" : "bg-primary text-white"
            }`}>
              {successData.huskAlert.large
                ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                : <Layers className="h-3.5 w-3.5 flex-shrink-0" />}
              <span className="text-xs font-bold tracking-wide uppercase">
                {successData.huskAlert.large ? "Warehouse Alert — Action Required" : "Husk Entitlement Ready"}
              </span>
            </div>

            {/* Body */}
            <div className={`p-5 flex items-center gap-4 ${
              successData.huskAlert.large ? "bg-warning/6" : "bg-primary/4"
            }`}>
              {/* Big bag count */}
              <div className={`flex-shrink-0 rounded-xl px-4 py-3 flex flex-col items-center min-w-[72px] ${
                successData.huskAlert.large ? "bg-warning/15" : "bg-primary/10"
              }`}>
                <Package className={`h-5 w-5 mb-1 ${successData.huskAlert.large ? "text-warning" : "text-primary"}`} />
                <span className={`text-3xl font-black leading-none ${successData.huskAlert.large ? "text-warning" : "text-primary"}`}>
                  {successData.huskAlert.balance}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${successData.huskAlert.large ? "text-warning/80" : "text-primary/70"}`}>
                  bags
                </span>
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-deepest text-sm leading-snug">
                  {successData.farmerName}
                </p>
                <p className="text-gray-500 text-sm mt-1 leading-snug">
                  {successData.huskAlert.large
                    ? <>Has <strong className="text-warning">{successData.huskAlert.balance} bags</strong> of husk uncollected — consider arranging collection to free up warehouse space.</>
                    : <>Has earned <strong className="text-primary">{successData.huskAlert.balance} bag{successData.huskAlert.balance !== 1 ? "s" : ""}</strong> of husk and may collect at any time.</>
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt buttons */}
        <div className="flex gap-3">
          {/* Save PDF receipt */}
          <a
            href={`/intake/${successData.deliveryId}/receipt`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-2xl p-4 font-bold text-sm transition-colors"
          >
            <FileText className="h-5 w-5" />
            Save / Print PDF Receipt
          </a>

          {/* WhatsApp button */}
          {!successData.whatsappSent && successData.whatsappUrl && (
            <a
              href={successData.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-deepest rounded-2xl p-4 font-bold text-sm transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Send WhatsApp Receipt
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={recordAnother}
            className="bg-white border-2 border-surface-secondary rounded-xl p-4 text-center hover:border-primary/30 hover:bg-surface-primary transition-all group"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/20 transition-colors">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-bold text-deepest">New Delivery</p>
            <p className="text-xs text-gray-400 mt-0.5">Record another</p>
          </button>

          <button
            onClick={() => router.push(`/intake/${successData.deliveryId}`)}
            className="bg-primary rounded-xl p-4 text-center hover:bg-primary/90 transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <p className="text-xs font-bold text-white">View Receipt</p>
            <p className="text-xs text-white/70 mt-0.5">Print or share</p>
          </button>

          <button
            onClick={() => router.push("/intake")}
            className="bg-white border-2 border-surface-secondary rounded-xl p-4 text-center hover:border-primary/30 hover:bg-surface-primary transition-all group"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/20 transition-colors">
              <AlertTriangle className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-bold text-deepest">All Deliveries</p>
            <p className="text-xs text-gray-400 mt-0.5">View history</p>
          </button>
        </div>
      </div>
    );
  }

  // ── Entry form ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Record Delivery"
        description="Log incoming coffee from a farmer."
        action={
          <Link href="/intake">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deliveries
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-secondary p-6 space-y-5">
        {errors.general && (
          <div className="bg-red-50 border-2 border-red-300 text-red-800 rounded-xl p-4 text-sm font-semibold">
            {errors.general}
          </div>
        )}

        {/* Farmer Search */}
        <div className="space-y-1.5">
          <Label htmlFor="farmerSearch">
            Farmer <span className="text-secondary font-bold">*</span>
          </Label>
          <Input
            id="farmerSearch"
            placeholder="Search by name or farmer code..."
            value={farmerSearch}
            onChange={(e) => setFarmerSearch(e.target.value)}
          />
          {farmers.length > 0 && !form.farmerId && (
            <div className="border border-surface-secondary rounded-lg overflow-hidden mt-1 shadow-sm">
              {farmers.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-primary text-sm flex flex-col gap-0.5 border-b border-surface-secondary last:border-0"
                  onClick={() => {
                    setField("farmerId", f.id);
                    setSelectedFarmer(f);
                    setFarmerSearch(`${f.name} (${f.farmerCode})`);
                    setFarmers([]);
                  }}
                >
                  <span className="font-semibold text-deepest">{f.name}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400 text-xs">{f.farmerCode} · {f.location}</span>
                    {!f.latitude && (
                      <span className="text-warning text-xs font-medium bg-warning/10 px-1.5 py-0.5 rounded">No GPS</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {form.farmerId && selectedFarmer && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-success font-medium">✓ Farmer selected</p>
              {!selectedFarmer.latitude && (
                <span className="text-xs text-warning font-semibold bg-warning/10 border border-warning/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  No GPS — cannot export to EU
                </span>
              )}
            </div>
          )}
          {errors.farmerId && <p className="text-xs text-red-600">{errors.farmerId}</p>}
        </div>

        {/* Coffee Type */}
        <div className="space-y-1.5">
          <Label>
            Coffee Type <span className="text-secondary font-bold">*</span>
          </Label>
          <Select value={form.coffeeVarietyId} onValueChange={(v) => setField("coffeeVarietyId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select coffee type..." />
            </SelectTrigger>
            <SelectContent>
              {varieties.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.coffeeVarietyId && <p className="text-xs text-red-600">{errors.coffeeVarietyId}</p>}
        </div>

        {/* UCDA Grade — required */}
        <div className="space-y-1.5">
          <Label>
            UCDA Grade <span className="text-secondary font-bold">*</span>
          </Label>
          <Select value={form.ucdaGrade} onValueChange={(v) => setField("ucdaGrade", v)}>
            <SelectTrigger className={errors.ucdaGrade ? "border-red-400" : ""}>
              <SelectValue placeholder="Select UCDA grade..." />
            </SelectTrigger>
            <SelectContent>
              {UCDA_GRADES.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.ucdaGrade && <p className="text-xs text-red-600">{errors.ucdaGrade}</p>}
        </div>

        {/* Date + Weight — side by side on sm+, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="deliveryDate">
              Delivery Date <span className="text-secondary font-bold">*</span>
            </Label>
            <Input
              id="deliveryDate"
              type="date"
              value={form.deliveryDate}
              onChange={(e) => setField("deliveryDate", e.target.value)}
            />
            {errors.deliveryDate && <p className="text-xs text-red-600">{errors.deliveryDate}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weightKg">
              <Scale className="inline h-3.5 w-3.5 mr-1" />
              Weight (KG) <span className="text-secondary font-bold">*</span>
            </Label>
            <Input
              id="weightKg"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 250.50"
              value={form.weightKg}
              onChange={(e) => setField("weightKg", e.target.value)}
            />
            {errors.weightKg && <p className="text-xs text-red-600">{errors.weightKg}</p>}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="moistureContentPct">
              Moisture Content %
              <span className="text-gray-400 text-xs ml-1">(UCDA max: 13%)</span>
            </Label>
            <Input
              id="moistureContentPct"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="e.g. 12.5"
              value={form.moistureContentPct}
              onChange={(e) => setField("moistureContentPct", e.target.value)}
              className={moistureTooHigh ? "border-red-500 bg-red-50 text-red-700 font-bold" : ""}
            />
            {/* Live moisture warning */}
            {moistureTooHigh ? (
              <div className="flex items-start gap-1.5 bg-red-100 border-2 border-red-400 text-red-800 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold">
                  REJECTED: Too Wet ({moistureVal}%). Dry the coffee first.
                </p>
              </div>
            ) : moistureVal !== null && moistureVal > 11 ? (
              <p className="text-xs text-warning font-medium">
                ⚠ Approaching limit — monitor closely
              </p>
            ) : moistureVal !== null && moistureVal <= 13 ? (
              <p className="text-xs text-success font-medium">✓ Moisture OK</p>
            ) : null}
            {errors.moistureContentPct && (
              <p className="text-xs text-red-600">{errors.moistureContentPct}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="foreignMatterPct">
              Foreign Matter %
              <span className="text-gray-400 text-xs ml-1">(optional)</span>
            </Label>
            <Input
              id="foreignMatterPct"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="e.g. 2.0"
              value={form.foreignMatterPct}
              onChange={(e) => setField("foreignMatterPct", e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
          <textarea
            id="notes"
            rows={2}
            placeholder="Any additional remarks..."
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className="w-full rounded-md border border-surface-secondary px-3 py-2 text-sm text-deepest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
          />
        </div>

        {/* Submit — large high-contrast buttons for tablet use */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || moistureTooHigh}
            className="flex-1 h-14 text-base font-bold tracking-wide disabled:opacity-60"
          >
            {loading ? "Saving…" : moistureTooHigh ? "Cannot Save — Too Wet" : "Record Delivery"}
          </Button>
          <Link href="/intake">
            <Button type="button" variant="outline" className="h-14 px-6 text-base font-bold">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
