"use client";

import { useState } from "react";
import { X, Leaf, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IssueHusksModalProps {
  farmer: { id: string; name: string; farmerCode: string };
  balanceBags: number;
  huskKgPerBag: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IssueHusksModal({
  farmer,
  balanceBags,
  huskKgPerBag,
  onClose,
  onSuccess,
}: IssueHusksModalProps) {
  const [bags, setBags] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bagsNum = parseInt(bags, 10) || 0;
  const kgEquivalent = bagsNum * huskKgPerBag;
  const isOverBalance = bagsNum > balanceBags;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (bagsNum < 1) { setError("Enter at least 1 bag"); return; }
    if (isOverBalance) { setError(`Cannot issue more than the balance of ${balanceBags} bag(s)`); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/husks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: farmer.id,
          bagsIssued: bagsNum,
          issuedDate: date,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to issue husks");
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-secondary">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-primary">Issue Husks</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Farmer summary */}
          <div className="bg-surface-primary rounded-lg p-4">
            <p className="text-sm font-semibold text-deepest">{farmer.name}</p>
            <p className="text-xs text-gray-400">{farmer.farmerCode}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-500">Balance available:</span>
              <span className="font-bold text-primary">{balanceBags} bag{balanceBags !== 1 ? "s" : ""}</span>
              <span className="text-gray-400">({(balanceBags * huskKgPerBag).toLocaleString()} kg)</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Bags to issue */}
          <div className="space-y-1.5">
            <Label htmlFor="bags">Number of Bags to Issue <span className="text-secondary">*</span></Label>
            <Input
              id="bags"
              type="number"
              min="1"
              max={balanceBags}
              value={bags}
              onChange={(e) => setBags(e.target.value)}
              className={isOverBalance ? "border-red-400 focus:ring-red-400" : ""}
            />
            {bagsNum > 0 && (
              <p className={`text-xs ${isOverBalance ? "text-red-600 font-medium" : "text-gray-500"}`}>
                = {kgEquivalent.toLocaleString()} kg equivalent
                {isOverBalance && ` — exceeds balance of ${balanceBags} bag(s)`}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="issueDate">Date of Collection <span className="text-secondary">*</span></Label>
            <Input
              id="issueDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="huskNotes">Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
            <textarea
              id="huskNotes"
              rows={2}
              placeholder="e.g. Collected by son, transport arranged..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-surface-secondary px-3 py-2 text-sm text-deepest placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={loading || isOverBalance || bagsNum < 1}
              className="flex-1"
            >
              {loading ? "Issuing..." : `Issue ${bagsNum > 0 ? bagsNum : ""} Bag${bagsNum !== 1 ? "s" : ""}`}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
