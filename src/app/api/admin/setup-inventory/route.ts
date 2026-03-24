import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { InventoryCategory } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 1. Ensure coffee varieties exist
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

    // 2. Define the correct 8 items
    const correct: { name: string; category: InventoryCategory; coffeeVarietyId: string | null; lowStockAlertKg: number | null }[] = [
      { name: "Raw Coffee (Robusta)",     category: InventoryCategory.RAW_COFFEE,      coffeeVarietyId: ROB, lowStockAlertKg: null },
      { name: "Raw Coffee (Arabica)",     category: InventoryCategory.RAW_COFFEE,      coffeeVarietyId: ARA, lowStockAlertKg: null },
      { name: "Raw Coffee (Kiboko)",      category: InventoryCategory.RAW_COFFEE,      coffeeVarietyId: KBK, lowStockAlertKg: null },
      { name: "Processed Beans (Robusta)", category: InventoryCategory.PROCESSED_BEANS, coffeeVarietyId: ROB, lowStockAlertKg: 500 },
      { name: "Processed Beans (Arabica)", category: InventoryCategory.PROCESSED_BEANS, coffeeVarietyId: ARA, lowStockAlertKg: 500 },
      { name: "Processed Beans (Kiboko)", category: InventoryCategory.PROCESSED_BEANS, coffeeVarietyId: KBK, lowStockAlertKg: 500 },
      { name: "Coffee Husks",             category: InventoryCategory.HUSKS,           coffeeVarietyId: null, lowStockAlertKg: 200 },
      { name: "Packaging Materials",      category: InventoryCategory.PACKAGING,       coffeeVarietyId: null, lowStockAlertKg: null },
    ];

    const updated: string[] = [];
    const created: string[] = [];

    for (const item of correct) {
      // 1. Find by exact name — fix its variety/category if wrong
      const byName = await prisma.inventoryItem.findFirst({ where: { name: item.name } });
      if (byName) {
        await prisma.inventoryItem.update({
          where: { id: byName.id },
          data: { category: item.category, coffeeVarietyId: item.coffeeVarietyId, lowStockAlertKg: item.lowStockAlertKg },
        });
        updated.push(item.name);
        continue;
      }

      // 2. Find by category + variety — rename it to the correct name
      const byVariety = await prisma.inventoryItem.findFirst({
        where: { category: item.category, coffeeVarietyId: item.coffeeVarietyId },
      });
      if (byVariety) {
        await prisma.inventoryItem.update({
          where: { id: byVariety.id },
          data: { name: item.name, lowStockAlertKg: item.lowStockAlertKg },
        });
        updated.push(`${byVariety.name} → ${item.name}`);
        continue;
      }

      // 3. Neither found — create fresh
      await prisma.inventoryItem.create({
        data: { ...item, currentStockKg: 0 },
      });
      created.push(item.name);
    }

    return NextResponse.json({ updated, created, message: "Inventory setup complete." });
  } catch (err) {
    console.error("setup-inventory error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
