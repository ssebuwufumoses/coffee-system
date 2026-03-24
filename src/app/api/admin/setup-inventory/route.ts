import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { InventoryCategory } from "@prisma/client";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Ensure coffee varieties exist (upsert)
  const varietyDefs = [
    { code: "ROB", name: "Robusta", description: "Coffea canephora — the primary variety" },
    { code: "ARA", name: "Arabica", description: "Coffea arabica — highland variety" },
    { code: "KBK", name: "Kiboko", description: "Dry/natural processed cherry coffee" },
  ];
  for (const v of varietyDefs) {
    await prisma.coffeeVariety.upsert({ where: { code: v.code }, update: {}, create: v });
  }

  const varieties = await prisma.coffeeVariety.findMany();
  const byCode = Object.fromEntries(varieties.map(v => [v.code, v.id]));

  const ROB = byCode["ROB"];
  const ARA = byCode["ARA"];
  const KBK = byCode["KBK"];

  // Delete items that have 0 stock and no movement history (safe to remove)
  const allItems = await prisma.inventoryItem.findMany();
  const deleted: string[] = [];

  for (const item of allItems) {
    const hasMovements = await prisma.inventoryMovement.count({ where: { inventoryItemId: item.id } });
    const hasStock = parseFloat(String(item.currentStockKg)) > 0;
    if (!hasMovements && !hasStock) {
      await prisma.inventoryItem.delete({ where: { id: item.id } });
      deleted.push(item.name);
    }
  }

  // Define the correct 8 items
  const correct: { name: string; category: InventoryCategory; coffeeVarietyId: string | null; lowStockAlertKg: number | null }[] = [
    { name: "Raw Coffee (Robusta)",          category: InventoryCategory.RAW_COFFEE,      coffeeVarietyId: ROB, lowStockAlertKg: null },
    { name: "Raw Coffee (Arabica)",           category: InventoryCategory.RAW_COFFEE,      coffeeVarietyId: ARA, lowStockAlertKg: null },
    { name: "Raw Coffee (Kiboko)",            category: InventoryCategory.RAW_COFFEE,      coffeeVarietyId: KBK, lowStockAlertKg: null },
    { name: "Processed Beans (Robusta)",      category: InventoryCategory.PROCESSED_BEANS, coffeeVarietyId: ROB, lowStockAlertKg: 500 },
    { name: "Processed Beans (Arabica)",      category: InventoryCategory.PROCESSED_BEANS, coffeeVarietyId: ARA, lowStockAlertKg: 500 },
    { name: "Processed Beans (Kiboko)",       category: InventoryCategory.PROCESSED_BEANS, coffeeVarietyId: KBK, lowStockAlertKg: 500 },
    { name: "Coffee Husks",                   category: InventoryCategory.HUSKS,           coffeeVarietyId: null, lowStockAlertKg: 200 },
    { name: "Packaging Materials",            category: InventoryCategory.PACKAGING,       coffeeVarietyId: null, lowStockAlertKg: null },
  ];

  const created: string[] = [];
  for (const item of correct) {
    // Check if an item with same category+variety already exists (skip if so)
    const exists = await prisma.inventoryItem.findFirst({
      where: { category: item.category, coffeeVarietyId: item.coffeeVarietyId },
    });
    if (!exists) {
      await prisma.inventoryItem.create({
        data: { ...item, currentStockKg: 0 },
      });
      created.push(item.name);
    }
  }

  return NextResponse.json({ deleted, created, message: "Inventory setup complete." });
}
