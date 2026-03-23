import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format UGX currency — no decimal places, thousands separator
 */
export function formatUGX(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format weight in KG with 2 decimal places
 */
export function formatKg(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

/**
 * Generate sequential codes like VCF-0001, SO-2024-0001
 */
export function generateCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Calculate husk entitlement
 */
export function calculateHuskEntitlement(
  totalDeliveredKg: number,
  kgPerBag: number
): { bags: number; kgEarned: number } {
  const bags = Math.floor(totalDeliveredKg / kgPerBag);
  return { bags, kgEarned: bags * kgPerBag };
}
