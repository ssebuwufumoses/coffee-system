import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// DELETE /api/husks/[id] — void issuance and reverse inventory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STORE_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const issuance = await prisma.huskIssuance.findUnique({
      where: { id },
      include: { farmer: { select: { name: true, farmerCode: true } } },
    });
    if (!issuance) return NextResponse.json({ error: "Issuance not found" }, { status: 404 });

    const kgToRestore = Number(issuance.kgEquivalent);

    const huskItem = await prisma.inventoryItem.findFirst({ where: { category: "HUSKS" } });
    if (!huskItem) return NextResponse.json({ error: "Husk inventory item not found" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      // Reverse the inventory movement
      const newBalance = Number(huskItem.currentStockKg) + kgToRestore;
      await tx.inventoryItem.update({
        where: { id: huskItem.id },
        data: { currentStockKg: newBalance },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: huskItem.id,
          movementType: "ADJUSTMENT",
          direction: "IN",
          quantityKg: kgToRestore,
          balanceAfterKg: newBalance,
          notes: `Void: cancelled issuance of ${issuance.bagsIssued} bag(s) to ${issuance.farmer.name} (${issuance.farmer.farmerCode})`,
          recordedById: session.userId,
        },
      });

      // Delete linked movements then the issuance
      await tx.inventoryMovement.deleteMany({ where: { huskIssuanceId: id } });
      await tx.huskIssuance.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/husks/[id] error:", error);
    return NextResponse.json({ error: "Failed to void issuance" }, { status: 500 });
  }
}

// PATCH /api/husks/[id] — update notes and date only (quantities need delete + re-issue)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "STORE_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, issuedDate } = body;

    const issuance = await prisma.huskIssuance.update({
      where: { id },
      data: {
        notes: notes ?? null,
        issuedDate: issuedDate ? new Date(issuedDate) : undefined,
      },
      include: {
        farmer: { select: { id: true, name: true, farmerCode: true } },
        issuedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ issuance });
  } catch (error) {
    console.error("PATCH /api/husks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update issuance" }, { status: 500 });
  }
}
