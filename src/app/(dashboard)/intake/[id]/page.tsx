"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Scale, User, MapPin, Phone, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DeliveryDetail {
  id: string;
  deliveryDate: string;
  weightKg: string;
  moistureContentPct: string | null;
  foreignMatterPct: string | null;
  notes: string | null;
  createdAt: string;
  farmer: {
    id: string;
    name: string;
    farmerCode: string;
    phone: string;
    location: string;
    paymentPreference: string;
  };
  coffeeVariety: { name: string; code: string };
  recordedBy: { name: string };
}

interface FarmerStats {
  totalDeliveries: number;
  totalDeliveredKg: number;
  husksEarnedBags: number;
  huskKgPerBag: number;
}

export default function DeliveryReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [farmerStats, setFarmerStats] = useState<FarmerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/deliveries/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setDelivery(d.delivery);
        setFarmerStats(d.farmerStats);
      })
      .catch(() => setError("Failed to load delivery"))
      .finally(() => setLoading(false));
  }, [id]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-UG", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
  }

  function formatPayment(p: string) {
    return { CASH: "Cash", MOBILE_MONEY: "Mobile Money", BANK: "Bank Transfer" }[p] ?? p;
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading receipt...</div>;
  if (error || !delivery) return <div className="text-center py-20 text-red-500">{error || "Not found"}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Actions bar — hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/intake">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Deliveries
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/farmers/${delivery.farmer.id}`}>
            <Button variant="outline" size="sm">View Farmer Profile</Button>
          </Link>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Receipt Card */}
      <div className="bg-white rounded-xl border border-surface-secondary overflow-hidden print:border-0 print:shadow-none">
        {/* Header */}
        <div className="bg-primary px-6 py-5 text-white print:bg-white print:text-deepest print:border-b-2 print:border-primary">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">Victory Coffee Factory</h1>
              <p className="text-primary-foreground/70 text-sm print:text-gray-500">Lwengo, Uganda</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary-foreground/70 print:text-gray-500">DELIVERY RECEIPT</p>
              <p className="font-mono text-sm font-bold">{delivery.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Farmer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <User className="h-3 w-3" /> Farmer
              </p>
              <p className="font-bold text-deepest text-lg">{delivery.farmer.name}</p>
              <Badge variant="default">{delivery.farmer.farmerCode}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {delivery.farmer.phone}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {delivery.farmer.location}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-gray-400 text-xs">Payment:</span>
                {formatPayment(delivery.farmer.paymentPreference)}
              </div>
            </div>
          </div>

          <hr className="border-surface-secondary" />

          {/* Delivery Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Date</p>
              <p className="font-medium text-deepest mt-1">{formatDate(delivery.deliveryDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Coffee className="h-3 w-3" /> Coffee Type
              </p>
              <p className="font-medium text-deepest mt-1">{delivery.coffeeVariety.name}</p>
              <p className="text-xs text-gray-400">{delivery.coffeeVariety.code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Scale className="h-3 w-3" /> Weight Received
              </p>
              <p className="font-bold text-2xl text-primary mt-1">
                {parseFloat(delivery.weightKg).toLocaleString()} <span className="text-base font-normal text-gray-500">kg</span>
              </p>
            </div>
          </div>

          {/* Quality Metrics */}
          {(delivery.moistureContentPct || delivery.foreignMatterPct) && (
            <div className="bg-surface-primary rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
              {delivery.moistureContentPct && (
                <div>
                  <p className="text-gray-400 text-xs">Moisture Content</p>
                  <p className="font-semibold text-deepest">{parseFloat(delivery.moistureContentPct).toFixed(1)}%</p>
                </div>
              )}
              {delivery.foreignMatterPct && (
                <div>
                  <p className="text-gray-400 text-xs">Foreign Matter</p>
                  <p className="font-semibold text-deepest">{parseFloat(delivery.foreignMatterPct).toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}

          {delivery.notes && (
            <div className="text-sm text-gray-600 bg-surface-primary rounded-lg p-3">
              <span className="text-gray-400">Notes: </span>{delivery.notes}
            </div>
          )}

          <hr className="border-surface-secondary" />

          {/* Cumulative Stats */}
          {farmerStats && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Farmer Totals (All Time)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-primary rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{farmerStats.totalDeliveries}</p>
                  <p className="text-xs text-gray-400 mt-1">Total Deliveries</p>
                </div>
                <div className="bg-surface-primary rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{farmerStats.totalDeliveredKg.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Total KG Supplied</p>
                </div>
                <div className="bg-surface-primary rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{farmerStats.husksEarnedBags}</p>
                  <p className="text-xs text-gray-400 mt-1">Husk Bags Earned</p>
                </div>
              </div>
            </div>
          )}

          <hr className="border-surface-secondary" />

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Recorded by: {delivery.recordedBy.name}</span>
            <span>{new Date(delivery.createdAt).toLocaleString("en-UG")}</span>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-4 text-center">
            <p className="text-xs text-gray-300">This receipt is computer-generated by the Victory Coffee Factory Management System.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
