import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const UCDA_GRADES = ["SCREEN_18", "SCREEN_15", "SCREEN_12", "FAQ", "KIBOKO", "OTHER"] as const;

const createDeliverySchema = z.object({
  farmerId: z.string().uuid("Select a valid farmer"),
  coffeeVarietyId: z.string().uuid("Select a valid coffee type"),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  weightKg: z.number().positive("Weight must be greater than 0"),
  moistureContentPct: z.number().min(0).max(100).optional().nullable(),
  foreignMatterPct: z.number().min(0).max(100).optional().nullable(),
  ucdaGrade: z.enum(UCDA_GRADES).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const UCDA_GRADE_LABELS: Record<string, string> = {
  SCREEN_18: "Screen 18",
  SCREEN_15: "Screen 15",
  SCREEN_12: "Screen 12",
  FAQ: "FAQ",
  KIBOKO: "Kiboko",
  OTHER: "Other",
};

// GET /api/deliveries — list with farmer search + date filter
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const farmerId = searchParams.get("farmerId");
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 25;

  const where: Record<string, unknown> = {};
  if (farmerId) where.farmerId = farmerId;
  if (search) {
    where.farmer = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { farmerCode: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({
      where,
      include: {
        farmer: { select: { id: true, name: true, farmerCode: true } },
        coffeeVariety: { select: { name: true, code: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.delivery.count({ where }),
  ]);

  return NextResponse.json({ deliveries, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/deliveries — record a new delivery
export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "OPERATOR"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDeliverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    farmerId,
    coffeeVarietyId,
    deliveryDate,
    weightKg,
    moistureContentPct,
    foreignMatterPct,
    ucdaGrade,
    notes,
  } = parsed.data;

  // ── UCDA Rule: Reject if moisture > 13% ─────────────────────────────────────
  if (moistureContentPct != null && moistureContentPct > 13) {
    return NextResponse.json(
      { error: `Rejected: Too Wet. Moisture is ${moistureContentPct}% — UCDA maximum is 13%. Dry the coffee before re-submission.` },
      { status: 422 }
    );
  }

  // Find the matching raw inventory item for this coffee variety
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { coffeeVarietyId, category: "RAW_COFFEE" },
  });

  if (!inventoryItem) {
    return NextResponse.json(
      { error: "No raw inventory item found for this coffee type. Contact admin." },
      { status: 400 }
    );
  }

  // Use a transaction to create delivery + update inventory atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the delivery record
    const delivery = await tx.delivery.create({
      data: {
        farmerId,
        coffeeVarietyId,
        deliveryDate: new Date(deliveryDate),
        weightKg,
        moistureContentPct: moistureContentPct ?? null,
        foreignMatterPct: foreignMatterPct ?? null,
        ucdaGrade: ucdaGrade ?? null,
        notes: notes ?? null,
        recordedById: session.userId,
      },
      include: {
        farmer: { select: { id: true, name: true, farmerCode: true, phone: true } },
        coffeeVariety: { select: { name: true, code: true } },
      },
    });

    // 2. Update inventory item stock
    const newBalance = Number(inventoryItem.currentStockKg) + weightKg;
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { currentStockKg: newBalance },
    });

    // 3. Log the inventory movement
    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: inventoryItem.id,
        movementType: "INTAKE",
        direction: "IN",
        quantityKg: weightKg,
        balanceAfterKg: newBalance,
        deliveryId: delivery.id,
        notes: `Intake from ${delivery.farmer.name} (${delivery.farmer.farmerCode})`,
        recordedById: session.userId,
      },
    });

    return delivery;
  });

  // 4. Calculate husk entitlement for response alert
  const huskSetting = await prisma.systemSetting.findUnique({ where: { key: "husk_kg_per_bag" } });
  const huskAlertSetting = await prisma.systemSetting.findUnique({ where: { key: "husk_alert_threshold_bags" } });
  const huskKgPerBag = parseFloat(huskSetting?.value ?? "100");
  const alertThreshold = parseInt(huskAlertSetting?.value ?? "10", 10);

  const deliveryAgg = await prisma.delivery.aggregate({
    where: { farmerId },
    _sum: { weightKg: true },
  });
  const huskIssuanceAgg = await prisma.huskIssuance.aggregate({
    where: { farmerId },
    _sum: { bagsIssued: true },
  });

  const totalKg = Number(deliveryAgg._sum.weightKg ?? 0);
  const husksEarned = Math.floor(totalKg / huskKgPerBag);
  const husksTaken = Number(huskIssuanceAgg._sum.bagsIssued ?? 0);
  const husksBalance = husksEarned - husksTaken;

  const huskAlert =
    husksBalance > 0
      ? { qualified: true, balance: husksBalance, large: husksBalance >= alertThreshold }
      : null;

  // 5. WhatsApp receipt to farmer (auto-send if API configured, else return deep-link)
  const batchRef = result.id.slice(0, 8).toUpperCase();
  const gradeLabel = ucdaGrade ? ` | Grade: ${UCDA_GRADE_LABELS[ucdaGrade]}` : "";
  const whatsappMsg =
    `Victory Coffee: Received ${weightKg.toLocaleString()}kg of ${result.coffeeVariety.name}${gradeLabel}. Ref: #${batchRef}. Thank you, ${result.farmer.name}!`;

  const { sent: whatsappSent, url: whatsappUrl } = await sendWhatsApp(
    result.farmer.phone,
    whatsappMsg
  );

  return NextResponse.json(
    { delivery: result, huskAlert, whatsappSent, whatsappUrl },
    { status: 201 }
  );
}
