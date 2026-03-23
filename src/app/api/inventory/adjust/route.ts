import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STORE_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { inventoryItemId, direction, quantityKg, notes } = body;

    if (!inventoryItemId) return NextResponse.json({ error: "Inventory item is required" }, { status: 400 });
    if (!["IN", "OUT"].includes(direction)) return NextResponse.json({ error: "Direction must be IN or OUT" }, { status: 400 });
    const qty = parseFloat(quantityKg);
    if (!qty || qty <= 0) return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
    if (!notes?.trim()) return NextResponse.json({ error: "Reason / notes are required for adjustments" }, { status: 400 });

    const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });

    const currentStock = parseFloat(item.currentStockKg.toString());
    if (direction === "OUT" && qty > currentStock) {
      return NextResponse.json(
        { error: `Insufficient stock — only ${currentStock.toLocaleString()} kg available` },
        { status: 422 }
      );
    }

    const newStock = direction === "IN" ? currentStock + qty : currentStock - qty;

    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          inventoryItemId,
          movementType: "ADJUSTMENT",
          direction: direction as "IN" | "OUT",
          quantityKg: qty,
          balanceAfterKg: newStock,
          notes: notes.trim(),
          recordedById: session.userId,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { currentStockKg: newStock },
      }),
    ]);

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    console.error("POST /api/inventory/adjust error:", error);
    return NextResponse.json({ error: "Failed to record adjustment" }, { status: 500 });
  }
}
