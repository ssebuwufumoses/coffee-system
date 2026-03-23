"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

interface CoffeeVariety { id: string; name: string; code: string; }

export default function EditFarmerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [varieties, setVarieties] = useState<CoffeeVariety[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "", phone: "", location: "",
    coffeeVarietyId: "", paymentPreference: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/farmers/${id}`).then(r => r.json()),
      fetch("/api/coffee-varieties").then(r => r.json()),
    ]).then(([farmerData, varietyData]) => {
      if (farmerData.farmer) {
        const f = farmerData.farmer;
        setForm({
          name: f.name,
          phone: f.phone,
          location: f.location,
          coffeeVarietyId: f.coffeeVarietyId,
          paymentPreference: f.paymentPreference,
        });
      }
      setVarieties(varietyData.varieties ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone is required";
    if (!form.location.trim()) newErrors.location = "Location is required";
    if (!form.coffeeVarietyId) newErrors.coffeeVarietyId = "Select a coffee type";
    if (!form.paymentPreference) newErrors.paymentPreference = "Select a payment preference";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/farmers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          setErrors({ general: data.error ?? "Failed to update farmer" });
        }
        return;
      }
      router.push(`/farmers/${id}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-16 bg-surface-secondary rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="Edit Farmer"
        description="Update farmer profile details."
        action={
          <Link href={`/farmers/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-secondary p-6 space-y-5">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{errors.general}</div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name <span className="text-secondary">*</span></Label>
          <Input id="name" value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. Nakato Grace" />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number <span className="text-secondary">*</span></Label>
          <Input id="phone" value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="e.g. 0701234567" />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Village / Location <span className="text-secondary">*</span></Label>
          <Input id="location" value={form.location} onChange={e => setField("location", e.target.value)} placeholder="e.g. Kiwumu, Lwengo" />
          {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Primary Coffee Type <span className="text-secondary">*</span></Label>
          <Select value={form.coffeeVarietyId} onValueChange={v => setField("coffeeVarietyId", v)}>
            <SelectTrigger><SelectValue placeholder="Select coffee type..." /></SelectTrigger>
            <SelectContent>
              {varieties.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.name} ({v.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.coffeeVarietyId && <p className="text-xs text-red-600">{errors.coffeeVarietyId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Payment Preference <span className="text-secondary">*</span></Label>
          <Select value={form.paymentPreference} onValueChange={v => setField("paymentPreference", v)}>
            <SelectTrigger><SelectValue placeholder="How should this farmer be paid?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
              <SelectItem value="BANK">Bank Transfer</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
            </SelectContent>
          </Select>
          {errors.paymentPreference && <p className="text-xs text-red-600">{errors.paymentPreference}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href={`/farmers/${id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
