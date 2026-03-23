import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const ownerSchema = z.object({
  farmerId: z.string().uuid("Invalid farmer"),
  inputKg: z.number().positive("Each owner's input must be > 0"),
});

const createBatchSchema = z.object({
  batchType: z.enum(["INDIVIDUAL", "GROUP"]),
  coffeeVarietyId: z.string().uuid("Select a coffee variety"),
  milledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional().nullable(),
  owners: z.array(ownerSchema).min(1, "At least one owner is required"),
});

async function generateBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.millingBatch.findFirst({
    orderBy: { createdAt: "desc" },
    select: { batchNumber: true },
  });
  if (!last) return `MILL-${year}-0001`;
  const parts = last.batchNumber.split("-");
  const num = parseInt(parts[2] ?? "0", 10);
  return `MILL-${year}-${String(num + 1).padStart(4, "0")}`;
}

// GET /api/milling — list all batches
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const [batches, total] = await Promise.all([
    prisma.millingBatch.findMany({
      include: {
        coffeeVariety: { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
        owners: {
          include: { farmer: { select: { name: true, farmerCode: true } } },
          orderBy: { inputKg: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.millingBatch.count(),
  ]);

  const avgConversion = await prisma.millingBatch.aggregate({
    where: { status: "COMPLETED", conversionRatePct: { not: null } },
    _avg: { conversionRatePct: true },
    _count: true,
  });

  return NextResponse.json({
    batches,
    total,
    page,
    pages: Math.ceil(total / limit),
    avgConversionRate: avgConversion._avg.conversionRatePct
      ? Number(avgConversion._avg.conversionRatePct).toFixed(2)
      : null,
    completedBatchCount: avgConversion._count,
  });
}

// POST /api/milling — create a new milling batch
export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "STORE_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { batchType, coffeeVarietyId, milledDate, notes, owners } = parsed.data;

  // Deduplicate owners: if same farmer appears twice, reject
  const farmerIds = owners.map((o) => o.farmerId);
  if (new Set(farmerIds).size !== farmerIds.length) {
    return NextResponse.json({ error: "Duplicate farmers in owner list." }, { status: 400 });
  }

  // Validate all farmers exist
  const farmerRecords = await prisma.farmer.findMany({
    where: { id: { in: farmerIds } },
    select: { id: true, name: true },
  });
  if (farmerRecords.length !== farmerIds.length) {
    return NextResponse.json({ error: "One or more farmers not found." }, { status: 400 });
  }

  const inputRawKg = owners.reduce((s, o) => s + o.inputKg, 0);

  // Validate each farmer has enough unprocessed coffee of this variety
  const [farmerDeliveries, coffeeVariety] = await Promise.all([
    prisma.delivery.groupBy({
      by: ["farmerId"],
      where: { farmerId: { in: farmerIds }, coffeeVarietyId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      _sum: { weightKg: true },
    }),
    prisma.coffeeVariety.findUnique({ where: { id: coffeeVarietyId }, select: { name: true } }),
  ]);
  const farmerDeliveredMap = Object.fromEntries(farmerDeliveries.map((d) => [d.farmerId, Number(d._sum.weightKg ?? 0)]));
  const varietyName = coffeeVariety?.name ?? "this coffee type";

  for (const owner of owners) {
    const available = farmerDeliveredMap[owner.farmerId] ?? 0;
    const farmerName = farmerRecords.find((f) => f.id === owner.farmerId)?.name ?? owner.farmerId;
    if (owner.inputKg > available) {
      return NextResponse.json({
        error: `${farmerName} only has ${available.toLocaleString()} kg of unprocessed ${varietyName} available, but you entered ${owner.inputKg.toLocaleString()} kg.`,
      }, { status: 400 });
    }
  }

  // Check raw inventory
  const rawItem = await prisma.inventoryItem.findFirst({
    where: { coffeeVarietyId, category: "RAW_COFFEE" },
  });
  if (!rawItem) {
    return NextResponse.json({ error: "No raw inventory item found for this coffee type." }, { status: 400 });
  }
  if (Number(rawItem.currentStockKg) < inputRawKg) {
    return NextResponse.json({
      error: `Insufficient raw stock. Available: ${Number(rawItem.currentStockKg).toLocaleString()} kg, requested: ${inputRawKg.toLocaleString()} kg.`,
    }, { status: 400 });
  }

  const batchNumber = await generateBatchNumber();

  const batch = await prisma.$transaction(async (tx) => {
    const newBatch = await tx.millingBatch.create({
      data: {
        batchNumber,
        batchType,
        coffeeVarietyId,
        inputRawKg,
        milledDate: new Date(milledDate),
        status: "IN_PROGRESS",
        notes: notes ?? null,
        createdById: session.userId,
        owners: {
          create: owners.map((o) => ({
            farmerId: o.farmerId,
            inputKg: o.inputKg,
          })),
        },
      },
      include: {
        coffeeVariety: { select: { name: true, code: true } },
        owners: {
          include: { farmer: { select: { name: true, farmerCode: true } } },
        },
      },
    });

    // Mark matching PENDING deliveries as IN_PROGRESS (oldest first, up to inputRawKg)
    const pendingDeliveries = await tx.delivery.findMany({
      where: {
        coffeeVarietyId,
        farmerId: { in: farmerIds },
        status: "PENDING",
      },
      orderBy: { deliveryDate: "asc" },
      select: { id: true, weightKg: true },
    });
    let remaining = inputRawKg;
    const toMark: string[] = [];
    for (const d of pendingDeliveries) {
      if (remaining <= 0) break;
      toMark.push(d.id);
      remaining -= Number(d.weightKg);
    }
    if (toMark.length > 0) {
      await tx.delivery.updateMany({
        where: { id: { in: toMark } },
        data: { status: "IN_PROGRESS" },
      });
    }

    // Deduct from raw inventory immediately
    const newRawBalance = Number(rawItem.currentStockKg) - inputRawKg;
    await tx.inventoryItem.update({
      where: { id: rawItem.id },
      data: { currentStockKg: newRawBalance },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: rawItem.id,
        movementType: "MILLING_INPUT",
        direction: "OUT",
        quantityKg: inputRawKg,
        balanceAfterKg: newRawBalance,
        millingBatchId: newBatch.id,
        notes: `Sent to milling batch ${batchNumber}`,
        recordedById: session.userId,
      },
    });

    return newBatch;
  });

  return NextResponse.json({ batch }, { status: 201 });
}
