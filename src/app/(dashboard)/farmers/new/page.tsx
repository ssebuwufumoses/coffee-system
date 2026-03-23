"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Loader2, MapPin, Smartphone, Building2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CoffeeVariety = { id: string; name: string; code: string };

type FormData = {
  name: string;
  phone: string;
  location: string;
  coffeeVarietyId: string;
  paymentPreference: string;
  latitude: string;
  longitude: string;
  // Mobile Money
  mobileMoneyNetwork: string;
  mobileMoneyNumber: string;
  // Bank
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

type FieldErrors = Partial<Record<keyof FormData, string[]>>;

export default function NewFarmerPage() {
  const router = useRouter();
  const [varieties, setVarieties] = useState<CoffeeVariety[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    location: "",
    coffeeVarietyId: "",
    paymentPreference: "",
    latitude: "",
    longitude: "",
    mobileMoneyNetwork: "",
    mobileMoneyNumber: "",
    bankName: "",
    bankBranch: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });

  useEffect(() => {
    fetch("/api/coffee-varieties")
      .then((r) => r.json())
      .then((d) => setVarieties(d.varieties ?? []));
  }, []);

  function set(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function detectGPS() {
    if (!navigator.geolocation) {
      alert("GPS is not available on this device.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      () => {
        alert("Could not get GPS location. Please enter coordinates manually.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const payload = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      mobileMoneyNetwork: formData.mobileMoneyNetwork || null,
      mobileMoneyNumber: formData.mobileMoneyNumber || null,
      bankName: formData.bankName || null,
      bankBranch: formData.bankBranch || null,
      bankAccountNumber: formData.bankAccountNumber || null,
      bankAccountName: formData.bankAccountName || null,
    };

    try {
      const res = await fetch("/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        // server returned empty body
      }

      if (!res.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : "Something went wrong. Please try again.";
        setErrors({ name: [msg] });
        return;
      }

      router.push(`/farmers/${data.farmer.id}?created=1`);
    } finally {
      setLoading(false);
    }
  }

  const hasGps = formData.latitude && formData.longitude;
  const pref = formData.paymentPreference;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Register Farmer"
        description="Add a new farmer to the Victory Coffee system."
        action={
          <Link href="/farmers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Farmers
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-secondary p-6 space-y-5">

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Nakato Grace"
            value={formData.name}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name[0]}</p>}
        </div>

        {/* Phone — contact number */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Contact Phone Number *
            <span className="text-gray-400 font-normal text-xs ml-1">(for WhatsApp receipts)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="e.g. 0701234567"
            value={formData.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone[0]}</p>}
        </div>

        {/* Village / Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location">Village / Location *</Label>
          <Input
            id="location"
            placeholder="e.g. Kiwumu, Lwengo"
            value={formData.location}
            onChange={(e) => set("location", e.target.value)}
          />
          {errors.location && <p className="text-xs text-red-600">{errors.location[0]}</p>}
        </div>

        {/* Coffee Variety */}
        <div className="space-y-1.5">
          <Label>Primary Coffee Type *</Label>
          <Select value={formData.coffeeVarietyId} onValueChange={(v) => set("coffeeVarietyId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select coffee type…" />
            </SelectTrigger>
            <SelectContent>
              {varieties.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.coffeeVarietyId && <p className="text-xs text-red-600">{errors.coffeeVarietyId[0]}</p>}
        </div>

        {/* Payment Preference */}
        <div className="space-y-1.5">
          <Label>Payment Preference *</Label>
          <Select value={pref} onValueChange={(v) => set("paymentPreference", v)}>
            <SelectTrigger>
              <SelectValue placeholder="How should this farmer be paid?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
              <SelectItem value="BANK">Bank Transfer</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
            </SelectContent>
          </Select>
          {errors.paymentPreference && <p className="text-xs text-red-600">{errors.paymentPreference[0]}</p>}
        </div>

        {/* Mobile Money details */}
        {pref === "MOBILE_MONEY" && (
          <div className="rounded-xl border-2 border-secondary/20 bg-secondary/4 p-4 space-y-3">
            <Label className="text-secondary font-semibold flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" />
              Mobile Money Details
            </Label>

            {/* Network selector — MTN or Airtel only */}
            <div className="space-y-1.5">
              <Label className="text-xs">Network *</Label>
              <div className="grid grid-cols-2 gap-3">
                {["MTN", "AIRTEL"].map((network) => (
                  <button
                    key={network}
                    type="button"
                    onClick={() => set("mobileMoneyNetwork", network)}
                    className={`rounded-lg border-2 py-3 font-bold text-sm transition-all ${
                      formData.mobileMoneyNetwork === network
                        ? network === "MTN"
                          ? "border-yellow-400 bg-yellow-400 text-black"
                          : "border-red-500 bg-red-500 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {network === "MTN" ? "📱 MTN Mobile Money" : "📱 Airtel Money"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobileMoneyNumber" className="text-xs">
                Mobile Money Number *
                <span className="text-gray-400 font-normal ml-1">(number to send money to)</span>
              </Label>
              <Input
                id="mobileMoneyNumber"
                type="tel"
                placeholder={formData.mobileMoneyNetwork === "AIRTEL" ? "e.g. 0701234567" : "e.g. 0771234567"}
                value={formData.mobileMoneyNumber}
                onChange={(e) => set("mobileMoneyNumber", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobileMoneyAccountName" className="text-xs">
                Registered Name on that Number *
                <span className="text-gray-400 font-normal ml-1">(name that appears when you send money)</span>
              </Label>
              <Input
                id="mobileMoneyAccountName"
                placeholder="e.g. Nakato Grace"
                value={formData.bankAccountName}
                onChange={(e) => set("bankAccountName", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Bank details */}
        {pref === "BANK" && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/4 p-4 space-y-3">
            <Label className="text-primary font-semibold flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Bank Account Details
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bankName" className="text-xs">Bank Name *</Label>
                <Input
                  id="bankName"
                  placeholder="e.g. Stanbic Bank"
                  value={formData.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankBranch" className="text-xs">Branch</Label>
                <Input
                  id="bankBranch"
                  placeholder="e.g. Masaka Branch"
                  value={formData.bankBranch}
                  onChange={(e) => set("bankBranch", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankAccountName" className="text-xs">Account Name *</Label>
              <Input
                id="bankAccountName"
                placeholder="Name on the bank account"
                value={formData.bankAccountName}
                onChange={(e) => set("bankAccountName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankAccountNumber" className="text-xs">Account Number *</Label>
              <Input
                id="bankAccountNumber"
                placeholder="e.g. 9030012345678"
                value={formData.bankAccountNumber}
                onChange={(e) => set("bankAccountNumber", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* EUDR GPS Coordinates */}
        <div className="space-y-3 rounded-xl border-2 border-dashed border-primary/20 bg-primary/4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-primary font-semibold flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                GPS Coordinates
                <span className="text-xs font-normal text-primary/70 ml-1">(Required for EU Export)</span>
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                EUDR 2026: Without GPS data, this farmer's coffee cannot be exported to Europe.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={detectGPS}
              disabled={gpsLoading}
              className="border-primary/30 text-primary hover:bg-primary/5 flex-shrink-0 ml-3"
            >
              {gpsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
              {gpsLoading ? "Getting…" : "Use Device GPS"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="latitude" className="text-xs">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                placeholder="e.g. -0.3912"
                value={formData.latitude}
                onChange={(e) => set("latitude", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude" className="text-xs">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                placeholder="e.g. 31.4145"
                value={formData.longitude}
                onChange={(e) => set("longitude", e.target.value)}
              />
            </div>
          </div>

          {hasGps ? (
            <p className="text-xs text-success font-medium">✓ GPS saved — this farmer is EUDR compliant</p>
          ) : (
            <p className="text-xs text-warning font-medium">⚠ No GPS — add coordinates now or edit this farmer later before exporting</p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering…</>
            ) : (
              <><UserPlus className="h-4 w-4 mr-2" />Register Farmer</>
            )}
          </Button>
          <Link href="/farmers">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
