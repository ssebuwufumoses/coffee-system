"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Factory, Droplets, Leaf, Coffee, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";

interface BatchOwner {
  id: string;
  farmerId: string;
  inputKg: string;
  outputBeansKg: string | null;
  outputHusksKg: string | null;
  farmer: { id: string; name: string; farmerCode: string; location: string };
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
  notes: string | null;
  coffeeVariety: { name: string; code: string };
  createdBy: { name: string };
  owners: BatchOwner[];
}

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
  QUEUED: "bg-gray-100 text-gray-600",
};

export default function MillingBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<MillingBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ outputBeansKg: "", outputHusksKg: "", notes: "" });

  useEffect(() => {
    fetch(`/api/milling/${id}`)
      .then(r => r.json())
      .then(d => { if (d.batch) setBatch(d.batch); })
      .finally(() => setLoading(false));
  }, [id]);

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  }

  const inputKg = batch ? parseFloat(batch.inputRawKg) : 0;
  const beansNum = parseFloat(form.outputBeansKg) || 0;
  const husksNum = parseFloat(form.outputHusksKg) || 0;
  const totalOut = beansNum + husksNum;
  const moistureLoss = inputKg - totalOut;
  const conversionRate = beansNum > 0 && inputKg > 0 ? ((beansNum / inputKg) * 100).toFixed(1) : null;
  const isOverInput = totalOut > inputKg;

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.outputBeansKg || beansNum <= 0) newErrors.outputBeansKg = "Enter beans output";
    if (!form.outputHusksKg || husksNum <= 0) newErrors.outputHusksKg = "Enter husks output";
    if (isOverInput) newErrors.outputBeansKg = `Total output (${totalOut} kg) exceeds input (${inputKg} kg)`;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/milling/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputBeansKg: beansNum,
          outputHusksKg: husksNum,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: typeof data.error === "string" ? data.error : "Failed to complete batch" });
        return;
      }
      setBatch(data.batch);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-secondary rounded-xl animate-pulse" />)}
    </div>
  );

  if (!batch) return (
    <div className="text-center py-20 text-gray-400">
      Batch not found.{" "}
      <Link href="/milling" className="text-primary underline">Back to milling</Link>
    </div>
  );

  const isGroup = batch.batchType === "GROUP";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={batch.batchNumber}
        description={`${batch.coffeeVariety?.name ?? "—"} · Created by ${batch.createdBy?.name ?? "—"}`}
        action={
          <Link href="/milling">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />All Batches
            </Button>
          </Link>
        }
      />

      {/* Batch summary */}
      <div className="bg-white rounded-xl border border-surface-secondary p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">Batch Details</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isGroup ? "bg-primary/10 text-primary" : "bg-surface-secondary text-gray-600"}`}>
              {isGroup ? <><Users className="h-3 w-3 mr-1" />Group</> : <><User className="h-3 w-3 mr-1" />Individual</>}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[batch.status]}`}>
              {batch.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Coffee Type</p>
            <p className="font-medium text-deepest">{batch.coffeeVariety.name}</p>
            <p className="text-xs text-gray-400">{batch.coffeeVariety.code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Milling Date</p>
            <p className="font-medium text-deepest">
              {new Date(batch.milledDate).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Raw Input</p>
            <p className="font-bold text-2xl text-primary">
              {parseFloat(batch.inputRawKg).toLocaleString()}
              <span className="text-sm font-normal text-gray-500"> kg</span>
            </p>
          </div>
        </div>

        {batch.notes && (
          <p className="text-sm text-gray-500 bg-surface-primary rounded-lg p-3">{batch.notes}</p>
        )}
      </div>

      {/* Owner / Member breakdown */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-secondary flex items-center gap-2">
          {isGroup ? <Users className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
          <span className="font-semibold text-primary text-sm">
            {isGroup ? `Group Members (${batch.owners.length})` : "Owner"}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-secondary bg-surface-primary text-xs font-semibold uppercase tracking-wide text-gray-400">
              <th className="text-left px-4 py-2.5">Farmer</th>
              <th className="text-right px-4 py-2.5">Input (kg)</th>
              {isGroup && <th className="text-right px-4 py-2.5">Share</th>}
              {batch.status === "COMPLETED" && (
                <>
                  <th className="text-right px-4 py-2.5">Beans Out</th>
                  <th className="text-right px-4 py-2.5">Husks Out</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-secondary">
            {batch.owners.map(owner => {
              const share = (parseFloat(owner.inputKg) / inputKg) * 100;
              return (
                <tr key={owner.id} className="hover:bg-surface-primary/50">
                  <td className="px-4 py-3">
                    <Link href={`/farmers/${owner.farmer.id}`} className="group">
                      <p className="font-medium text-primary group-hover:underline">{owner.farmer.name}</p>
                      <p className="text-xs text-gray-400">{owner.farmer.farmerCode} · {owner.farmer.location}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-deepest">
                    {parseFloat(owner.inputKg).toLocaleString()}
                  </td>
                  {isGroup && (
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        {share.toFixed(1)}%
                      </span>
                    </td>
                  )}
                  {batch.status === "COMPLETED" && (
                    <>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">
                        {owner.outputBeansKg ? parseFloat(owner.outputBeansKg).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-success font-medium">
                        {owner.outputHusksKg ? parseFloat(owner.outputHusksKg).toLocaleString() : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          {isGroup && batch.status !== "COMPLETED" && (
            <tfoot>
              <tr className="border-t border-surface-secondary bg-surface-primary">
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-primary">
                  {parseFloat(batch.inputRawKg).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-gray-400">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Completed yield summary */}
      {batch.status === "COMPLETED" && batch.outputBeansKg && (
        <div className="bg-white rounded-xl border border-surface-secondary p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="font-semibold text-success">Milling Complete — Yield Summary</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface-primary rounded-lg p-3 text-center">
              <Coffee className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-gray-400">Processed Beans</p>
              <p className="text-xl font-bold text-primary">{parseFloat(batch.outputBeansKg).toLocaleString()}</p>
              <p className="text-xs text-gray-400">kg</p>
            </div>
            <div className="bg-surface-primary rounded-lg p-3 text-center">
              <Leaf className="h-4 w-4 text-success mx-auto mb-1" />
              <p className="text-xs text-gray-400">Husks</p>
              <p className="text-xl font-bold text-success">{parseFloat(batch.outputHusksKg!).toLocaleString()}</p>
              <p className="text-xs text-gray-400">kg added to stock</p>
            </div>
            <div className="bg-surface-primary rounded-lg p-3 text-center">
              <Droplets className="h-4 w-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Moisture Loss</p>
              <p className="text-xl font-bold text-blue-500">{parseFloat(batch.moistureLossKg!).toLocaleString()}</p>
              <p className="text-xs text-gray-400">kg</p>
            </div>
            <div className="bg-primary rounded-lg p-3 text-center">
              <p className="text-xs text-primary-foreground/70">Conversion Rate</p>
              <p className="text-3xl font-bold text-white">{parseFloat(batch.conversionRatePct!).toFixed(1)}%</p>
              <p className="text-xs text-primary-foreground/70">beans / raw</p>
            </div>
          </div>
        </div>
      )}

      {/* Complete batch form */}
      {batch.status !== "COMPLETED" && (
        <form onSubmit={handleComplete} className="bg-white rounded-xl border border-surface-secondary p-5 space-y-5">
          <h3 className="font-semibold text-primary">Record Milling Outputs</h3>
          <p className="text-sm text-gray-500">
            Input: <strong>{parseFloat(batch.inputRawKg).toLocaleString()} kg</strong> of raw {batch.coffeeVariety.name}
            {isGroup && <span className="text-gray-400"> · outputs will be split proportionally between {batch.owners.length} members</span>}
          </p>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{errors.general}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="outputBeansKg">
                <Coffee className="inline h-3.5 w-3.5 mr-1" />
                Processed Beans Out (KG) <span className="text-secondary">*</span>
              </Label>
              <Input
                id="outputBeansKg"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 420"
                value={form.outputBeansKg}
                onChange={e => setField("outputBeansKg", e.target.value)}
              />
              {errors.outputBeansKg && <p className="text-xs text-red-600">{errors.outputBeansKg}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outputHusksKg">
                <Leaf className="inline h-3.5 w-3.5 mr-1" />
                Husks Out (KG) <span className="text-secondary">*</span>
              </Label>
              <Input
                id="outputHusksKg"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 60"
                value={form.outputHusksKg}
                onChange={e => setField("outputHusksKg", e.target.value)}
              />
              {errors.outputHusksKg && <p className="text-xs text-red-600">{errors.outputHusksKg}</p>}
            </div>
          </div>

          {/* Live preview */}
          {(beansNum > 0 || husksNum > 0) && (
            <div className={`rounded-lg p-4 text-sm space-y-1 ${isOverInput ? "bg-red-50 border border-red-200" : "bg-surface-primary border border-surface-secondary"}`}>
              <div className="flex justify-between">
                <span className="text-gray-500">Total output:</span>
                <span className={`font-semibold ${isOverInput ? "text-red-600" : "text-deepest"}`}>{totalOut.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Moisture / weight loss:</span>
                <span className={`font-semibold ${moistureLoss < 0 ? "text-red-600" : "text-blue-500"}`}>{moistureLoss.toFixed(2)} kg</span>
              </div>
              {conversionRate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Conversion rate:</span>
                  <span className="font-bold text-primary">{conversionRate}%</span>
                </div>
              )}

              {/* Per-member preview for group batches */}
              {isGroup && beansNum > 0 && batch.owners.length > 1 && (
                <div className="pt-2 mt-2 border-t border-surface-secondary space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Proportional split</p>
                  {batch.owners.map(owner => {
                    const share = parseFloat(owner.inputKg) / inputKg;
                    return (
                      <div key={owner.id} className="flex justify-between text-xs">
                        <span className="text-gray-600 font-medium">{owner.farmer.name}</span>
                        <span className="text-deepest">
                          {(beansNum * share).toFixed(1)} kg beans · {(husksNum * share).toFixed(1)} kg husks
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="batchNotes">Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
            <textarea
              id="batchNotes"
              rows={2}
              placeholder="e.g. Good quality batch, machine ran smoothly..."
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              className="w-full rounded-md border border-surface-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
            />
          </div>

          <Button type="submit" disabled={saving || isOverInput} className="w-full">
            {saving ? "Completing..." : "Complete Batch & Update Inventory"}
          </Button>
        </form>
      )}
    </div>
  );
}
