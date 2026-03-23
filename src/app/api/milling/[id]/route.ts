import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { sendHullingAlertEmail } from "@/lib/email";

const completeBatchSchema = z.object({
  outputBeansKg: z.number().positive("Beans output must be greater than 0"),
  outputHusksKg: z.number().positive("Husks output must be greater than 0"),
  notes: z.string().optional().nullable(),
});

// GET /api/milling/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const batch = await prisma.millingBatch.findUnique({
    where: { id },
    include: {
      coffeeVariety: true,
      createdBy: { select: { name: true } },
      owners: {
        include: {
          farmer: { select: { id: true, name: true, farmerCode: true, location: true } },
        },
        orderBy: { inputKg: "desc" },
      },
      inventoryMovements: {
        include: { inventoryItem: { select: { name: true, category: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  return NextResponse.json({ batch });
}

// PATCH /api/milling/[id] — complete the batch (record outputs + distribute to owners)
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

  const { id } = await params;
  const body = await request.json();
  const parsed = completeBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { outputBeansKg, outputHusksKg, notes } = parsed.data;

  const batch = await prisma.millingBatch.findUnique({
    where: { id },
    include: { owners: true },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status === "COMPLETED") {
    return NextResponse.json({ error: "Batch is already completed." }, { status: 400 });
  }

  const inputRawKg = Number(batch.inputRawKg);
  const totalOutput = outputBeansKg + outputHusksKg;

  if (totalOutput > inputRawKg) {
    return NextResponse.json({
      error: `Output total (${totalOutput} kg) cannot exceed input (${inputRawKg} kg).`,
    }, { status: 400 });
  }

  const moistureLossKg = inputRawKg - totalOutput;
  const conversionRatePct = (outputBeansKg / inputRawKg) * 100;

  // Find processed beans and husk inventory items
  const [beansItem, huskItem] = await Promise.all([
    prisma.inventoryItem.findFirst({
      where: { coffeeVarietyId: batch.coffeeVarietyId, category: "PROCESSED_BEANS" },
    }),
    prisma.inventoryItem.findFirst({ where: { category: "HUSKS" } }),
  ]);

  if (!beansItem) return NextResponse.json({ error: "Processed beans inventory item not found." }, { status: 400 });
  if (!huskItem) return NextResponse.json({ error: "Husk inventory item not found." }, { status: 400 });

  const completedBatch = await prisma.$transaction(async (tx) => {
    // 1. Update batch record
    await tx.millingBatch.update({
      where: { id },
      data: {
        status: "COMPLETED",
        outputBeansKg,
        outputHusksKg,
        moistureLossKg,
        conversionRatePct,
        notes: notes ?? batch.notes,
      },
    });

    // 2. Distribute outputs proportionally to each owner
    for (const owner of batch.owners) {
      const share = Number(owner.inputKg) / inputRawKg;
      const ownerBeans = Math.round(outputBeansKg * share * 100) / 100;
      const ownerHusks = Math.round(outputHusksKg * share * 100) / 100;

      await tx.millingBatchOwner.update({
        where: { id: owner.id },
        data: { outputBeansKg: ownerBeans, outputHusksKg: ownerHusks },
      });
    }

    // Re-fetch after all updates so owners have their output values
    const updated = await tx.millingBatch.findUniqueOrThrow({
      where: { id },
      include: {
        coffeeVariety: { select: { name: true } },
        createdBy: { select: { name: true } },
        owners: {
          include: { farmer: { select: { id: true, name: true, farmerCode: true } } },
          orderBy: { inputKg: "desc" },
        },
      },
    });

    // 3. Add processed beans to inventory
    const newBeansBalance = Number(beansItem.currentStockKg) + outputBeansKg;
    await tx.inventoryItem.update({
      where: { id: beansItem.id },
      data: { currentStockKg: newBeansBalance },
    });
    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: beansItem.id,
        movementType: "MILLING_OUTPUT_BEANS",
        direction: "IN",
        quantityKg: outputBeansKg,
        balanceAfterKg: newBeansBalance,
        millingBatchId: id,
        notes: `Processed beans from batch ${batch.batchNumber}`,
        recordedById: session.userId,
      },
    });

    // 4. Add husks to inventory
    const newHusksBalance = Number(huskItem.currentStockKg) + outputHusksKg;
    await tx.inventoryItem.update({
      where: { id: huskItem.id },
      data: { currentStockKg: newHusksBalance },
    });
    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: huskItem.id,
        movementType: "MILLING_OUTPUT_HUSKS",
        direction: "IN",
        quantityKg: outputHusksKg,
        balanceAfterKg: newHusksBalance,
        millingBatchId: id,
        notes: `Husks from batch ${batch.batchNumber}`,
        recordedById: session.userId,
      },
    });

    return updated;
  });

  // ── Auto-mark deliveries as MILLED (oldest-first up to inputRawKg) ──────────
  const farmerIds = batch.owners.map((o) => o.farmerId);
  const pendingDeliveries = await prisma.delivery.findMany({
    where: {
      coffeeVarietyId: batch.coffeeVarietyId,
      ...(farmerIds.length > 0 ? { farmerId: { in: farmerIds } } : {}),
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: { deliveryDate: "asc" },
    select: { id: true, weightKg: true },
  });

  let remaining = inputRawKg;
  const toMill: string[] = [];
  for (const d of pendingDeliveries) {
    if (remaining <= 0) break;
    toMill.push(d.id);
    remaining -= Number(d.weightKg);
  }
  if (toMill.length > 0) {
    await prisma.delivery.updateMany({
      where: { id: { in: toMill } },
      data: { status: "MILLED" },
    });
  }

  // ── Hulling ratio alert: if clean beans / kiboko input < 45%, email manager ──
  if (conversionRatePct < 45) {
    sendHullingAlertEmail({
      batchNumber: batch.batchNumber,
      inputKg: inputRawKg,
      outputBeansKg,
      hullRatioPct: conversionRatePct,
    }).catch(() => {});
  }

  return NextResponse.json({ batch: completedBatch, hullRatioPct: conversionRatePct });
}
