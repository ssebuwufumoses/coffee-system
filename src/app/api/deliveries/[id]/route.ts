import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

// GET /api/deliveries/[id] — single delivery with full context
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      farmer: {
        select: {
          id: true,
          name: true,
          farmerCode: true,
          phone: true,
          location: true,
          paymentPreference: true,
        },
      },
      coffeeVariety: { select: { name: true, code: true } },
      recordedBy: { select: { name: true } },
      inventoryMovements: {
        select: { movementType: true, quantityKg: true, balanceAfterKg: true },
      },
    },
  });

  if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });

  // Farmer cumulative stats at time of this delivery
  const agg = await prisma.delivery.aggregate({
    where: { farmerId: delivery.farmerId },
    _sum: { weightKg: true },
    _count: true,
  });

  const huskSetting = await prisma.systemSetting.findUnique({ where: { key: "husk_coffee_kg_per_bag" } });
  const huskKgPerBag = parseFloat(huskSetting?.value ?? "100");
  const totalKg = Number(agg._sum.weightKg ?? 0);
  const husksEarned = Math.floor(totalKg / huskKgPerBag);

  return NextResponse.json({
    delivery,
    farmerStats: {
      totalDeliveries: agg._count,
      totalDeliveredKg: totalKg,
      husksEarnedBags: husksEarned,
      huskKgPerBag,
    },
  });
}
