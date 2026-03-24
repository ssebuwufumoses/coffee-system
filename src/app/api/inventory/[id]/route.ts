import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, category, coffeeVarietyId, lowStockAlertKg } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });

  const duplicate = await prisma.inventoryItem.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (duplicate) return NextResponse.json({ error: "Another item with this name already exists" }, { status: 409 });

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: name.trim(),
      category,
      coffeeVarietyId: coffeeVarietyId || null,
      lowStockAlertKg: lowStockAlertKg ? parseFloat(lowStockAlertKg) : null,
    },
    include: { coffeeVariety: { select: { name: true, code: true } } },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (parseFloat(String(item.currentStockKg)) > 0) {
    return NextResponse.json(
      { error: "Cannot delete: item has stock. Adjust to 0 first." },
      { status: 400 }
    );
  }

  const movementCount = await prisma.inventoryMovement.count({ where: { inventoryItemId: id } });
  if (movementCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete: item has stock movement history and cannot be removed." },
      { status: 400 }
    );
  }

  await prisma.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
