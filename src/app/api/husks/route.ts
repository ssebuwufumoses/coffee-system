import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const issueHuskSchema = z.object({
  farmerId: z.string().uuid(),
  bagsIssued: z.number().int().positive("Must issue at least 1 bag"),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional().nullable(),
});

// GET /api/husks — all issuances, optionally filtered by farmerId
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const farmerId = searchParams.get("farmerId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 25;

  const where = farmerId ? { farmerId } : {};

  const [issuances, total, huskSetting] = await Promise.all([
    prisma.huskIssuance.findMany({
      where,
      include: {
        farmer: { select: { id: true, name: true, farmerCode: true } },
        issuedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.huskIssuance.count({ where }),
    prisma.systemSetting.findUnique({ where: { key: "husk_kg_per_bag" } }),
  ]);

  const huskKgPerBag = parseFloat(huskSetting?.value ?? "20");

  // Compute current husk balance per unique farmer in this page
  const uniqueFarmerIds = [...new Set(issuances.map((i) => i.farmerId))];

  // Earned bags = based on actual milled husk output (from completed batches)
  const [milledHusksRows, issuanceAggs] = await Promise.all([
    prisma.millingBatchOwner.findMany({
      where: {
        farmerId: { in: uniqueFarmerIds },
        millingBatch: { status: "COMPLETED" },
        outputHusksKg: { not: null },
      },
      select: { farmerId: true, outputHusksKg: true },
    }),
    prisma.huskIssuance.groupBy({ by: ["farmerId"], where: { farmerId: { in: uniqueFarmerIds } }, _sum: { bagsIssued: true } }),
  ]);

  const milledHusksMap: Record<string, number> = {};
  for (const row of milledHusksRows) {
    milledHusksMap[row.farmerId] = (milledHusksMap[row.farmerId] ?? 0) + Number(row.outputHusksKg ?? 0);
  }

  const balanceMap = Object.fromEntries(uniqueFarmerIds.map((fId) => {
    const milledKg = milledHusksMap[fId] ?? 0;
    const earned = Math.floor(milledKg / huskKgPerBag);
    const taken = Number(issuanceAggs.find((i) => i.farmerId === fId)?._sum.bagsIssued ?? 0);
    return [fId, { earned, taken, balance: earned - taken }];
  }));

  const enriched = issuances.map((i) => ({ ...i, farmerHuskBalance: balanceMap[i.farmerId] }));

  return NextResponse.json({ issuances: enriched, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/husks — issue husks to a farmer
export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "STORE_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden: Only Store Manager or Admin can issue husks" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = issueHuskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { farmerId, bagsIssued, issuedDate, notes } = parsed.data;

  // --- Business Rule: Cannot issue more than earned ---
  const huskBagSetting = await prisma.systemSetting.findUnique({ where: { key: "husk_kg_per_bag" } });
  // husk_kg_per_bag: physical weight of one husk bag (default 20 kg)
  const huskBagWeightKg = parseFloat(huskBagSetting?.value ?? "20");
  const huskKgPerBag = huskBagWeightKg;

  const [milledHusksAgg, issuanceAgg] = await Promise.all([
    prisma.millingBatchOwner.aggregate({
      where: {
        farmerId,
        millingBatch: { status: "COMPLETED" },
        outputHusksKg: { not: null },
      },
      _sum: { outputHusksKg: true },
    }),
    prisma.huskIssuance.aggregate({ where: { farmerId }, _sum: { bagsIssued: true } }),
  ]);

  const milledHusksKg = Number(milledHusksAgg._sum.outputHusksKg ?? 0);
  const husksEarnedBags = Math.floor(milledHusksKg / huskKgPerBag);
  const husksTakenBags = Number(issuanceAgg._sum.bagsIssued ?? 0);
  const husksBalanceBags = husksEarnedBags - husksTakenBags;

  if (bagsIssued > husksBalanceBags) {
    return NextResponse.json({
      error: `Cannot issue ${bagsIssued} bag(s). This farmer only has a balance of ${husksBalanceBags} bag(s).`,
    }, { status: 400 });
  }

  // Physical kg to deduct from warehouse = bags × physical bag weight (20kg)
  const kgEquivalent = bagsIssued * huskBagWeightKg;

  // Find husk inventory item
  const huskItem = await prisma.inventoryItem.findFirst({
    where: { category: "HUSKS" },
  });

  if (!huskItem) {
    return NextResponse.json({ error: "Husk inventory item not found. Contact admin." }, { status: 400 });
  }

  if (Number(huskItem.currentStockKg) < kgEquivalent) {
    return NextResponse.json({
      error: `Insufficient husk stock. Warehouse has ${Number(huskItem.currentStockKg).toLocaleString()} kg available but issuance requires ${kgEquivalent} kg. Mill more coffee first.`,
    }, { status: 400 });
  }

  // Transaction: create issuance + deduct from inventory
  const issuance = await prisma.$transaction(async (tx) => {
    const record = await tx.huskIssuance.create({
      data: {
        farmerId,
        bagsIssued,
        kgEquivalent,
        issuedDate: new Date(issuedDate),
        issuedById: session.userId,
        notes: notes ?? null,
      },
      include: {
        farmer: { select: { name: true, farmerCode: true } },
        issuedBy: { select: { name: true } },
      },
    });

    const newBalance = Number(huskItem.currentStockKg) - kgEquivalent;
    await tx.inventoryItem.update({
      where: { id: huskItem.id },
      data: { currentStockKg: newBalance },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: huskItem.id,
        movementType: "HUSK_ISSUANCE",
        direction: "OUT",
        quantityKg: kgEquivalent,
        balanceAfterKg: newBalance,
        huskIssuanceId: record.id,
        notes: `Issued ${bagsIssued} bag(s) to ${record.farmer.name} (${record.farmer.farmerCode})`,
        recordedById: session.userId,
      },
    });

    return record;
  });

  return NextResponse.json({ issuance }, { status: 201 });
}
