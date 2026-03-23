import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
  };
  const where = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const [deliveries, byFarmer, byVariety] = await Promise.all([
    prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        farmer: { select: { name: true, farmerCode: true, location: true } },
        coffeeVariety: { select: { name: true, code: true } },
        recordedBy: { select: { name: true } },
      },
    }),

    prisma.delivery.groupBy({
      by: ["farmerId"],
      where,
      _sum: { weightKg: true },
      _count: true,
    }),

    prisma.delivery.groupBy({
      by: ["coffeeVarietyId"],
      where,
      _sum: { weightKg: true },
      _count: true,
    }),
  ]);

  const farmerIds = byFarmer.map(f => f.farmerId);
  const farmers = await prisma.farmer.findMany({
    where: { id: { in: farmerIds } },
    select: { id: true, name: true, farmerCode: true },
  });
  const farmerMap = Object.fromEntries(farmers.map(f => [f.id, f]));

  const varietyIds = byVariety.map(v => v.coffeeVarietyId);
  const varieties = await prisma.coffeeVariety.findMany({
    where: { id: { in: varietyIds } },
    select: { id: true, name: true, code: true },
  });
  const varietyMap = Object.fromEntries(varieties.map(v => [v.id, v]));

  const totalKg = deliveries.reduce((s, d) => s + parseFloat(String(d.weightKg)), 0);

  return NextResponse.json({
    summary: {
      totalDeliveries: deliveries.length,
      totalKg,
      uniqueFarmers: byFarmer.length,
    },
    deliveries: deliveries.map(d => ({
      id: d.id,
      farmer: d.farmer.name,
      farmerCode: d.farmer.farmerCode,
      location: d.farmer.location,
      variety: `${d.coffeeVariety.name} (${d.coffeeVariety.code})`,
      weightKg: parseFloat(String(d.weightKg)),
      status: (d as any).status ?? "PENDING",
      recordedBy: d.recordedBy.name,
      createdAt: d.createdAt,
    })),
    byFarmer: byFarmer
      .map(f => ({
        farmerName: farmerMap[f.farmerId]?.name ?? "Unknown",
        farmerCode: farmerMap[f.farmerId]?.farmerCode ?? "",
        deliveries: f._count,
        totalKg: parseFloat(String(f._sum.weightKg ?? 0)),
      }))
      .sort((a, b) => b.totalKg - a.totalKg),
    byVariety: byVariety
      .map(v => ({
        variety: varietyMap[v.coffeeVarietyId]?.name ?? "Unknown",
        code: varietyMap[v.coffeeVarietyId]?.code ?? "",
        deliveries: v._count,
        totalKg: parseFloat(String(v._sum.weightKg ?? 0)),
      }))
      .sort((a, b) => b.totalKg - a.totalKg),
  });
}
