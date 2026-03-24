import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const updateFarmerSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(9).optional(),
  location: z.string().min(2).optional(),
  coffeeVarietyId: z.string().uuid().optional(),
  paymentPreference: z.enum(["CASH", "MOBILE_MONEY", "BANK"]).optional(),
  isActive: z.boolean().optional(),
  // EUDR compliance fields
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  landBoundary: z.string().optional().nullable(),
  // Payment details
  mobileMoneyNetwork: z.enum(["MTN", "AIRTEL"]).optional().nullable(),
  mobileMoneyNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
});

// GET /api/farmers/[id] — full farmer profile with stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const farmer = await prisma.farmer.findUnique({
    where: { id },
    include: {
      coffeeVariety: true,
      createdBy: { select: { name: true } },
      deliveries: {
        include: { coffeeVariety: { select: { name: true } }, recordedBy: { select: { name: true } } },
        orderBy: { deliveryDate: "desc" },
        take: 20,
      },
      huskIssuances: {
        include: { issuedBy: { select: { name: true } } },
        orderBy: { issuedDate: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 10,
      },
    },
  });

  if (!farmer) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });

  // Compute aggregates
  const deliveryAgg = await prisma.delivery.aggregate({
    where: { farmerId: id },
    _sum: { weightKg: true },
    _count: true,
  });

  const huskIssuanceAgg = await prisma.huskIssuance.aggregate({
    where: { farmerId: id },
    _sum: { kgEquivalent: true, bagsIssued: true },
  });

  const paymentAgg = await prisma.farmerPayment.aggregate({
    where: { farmerId: id },
    _sum: { amount: true },
  });

  const huskSetting = await prisma.systemSetting.findUnique({
    where: { key: "husk_kg_per_bag" },
  });
  const huskKgPerBag = parseFloat(huskSetting?.value ?? "100");

  const totalDeliveredKg = Number(deliveryAgg._sum.weightKg ?? 0);
  const husksEarnedBags = Math.floor(totalDeliveredKg / huskKgPerBag);
  const husksTakenBags = Number(huskIssuanceAgg._sum.bagsIssued ?? 0);
  const husksBalanceBags = husksEarnedBags - husksTakenBags;

  return NextResponse.json({
    farmer,
    stats: {
      totalDeliveries: deliveryAgg._count,
      totalDeliveredKg,
      husksEarnedBags,
      husksTakenBags,
      husksBalanceBags,
      huskKgPerBag,
      totalPaidUgx: Number(paymentAgg._sum.amount ?? 0),
    },
  });
}

// PATCH /api/farmers/[id] — update farmer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "OPERATOR"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateFarmerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const farmer = await prisma.farmer.update({
    where: { id },
    data: parsed.data,
    include: { coffeeVariety: { select: { name: true, code: true } } },
  });

  return NextResponse.json({ farmer });
}

// DELETE /api/farmers/[id] — only if farmer has no activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [deliveries, millingOwners, huskIssuances, payments] = await Promise.all([
    prisma.delivery.count({ where: { farmerId: id } }),
    prisma.millingBatchOwner.count({ where: { farmerId: id } }),
    prisma.huskIssuance.count({ where: { farmerId: id } }),
    prisma.farmerPayment.count({ where: { farmerId: id } }),
  ]);

  const total = deliveries + millingOwners + huskIssuances + payments;
  if (total > 0) {
    return NextResponse.json(
      { error: "Cannot delete: this farmer has existing deliveries, milling records, or payments. Deactivate them instead." },
      { status: 400 }
    );
  }

  await prisma.farmer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
