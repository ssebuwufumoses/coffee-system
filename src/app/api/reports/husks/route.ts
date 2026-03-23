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
  const issuanceWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const [issuances, huskSetting, inventoryItem] = await Promise.all([
    prisma.huskIssuance.findMany({
      where: issuanceWhere,
      include: {
        farmer: { select: { id: true, name: true, farmerCode: true, location: true } },
        issuedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.systemSetting.findUnique({ where: { key: "husk_kg_per_bag" } }),
    prisma.inventoryItem.findFirst({ where: { category: "HUSKS" } }),
  ]);

  const huskKgPerBag = parseFloat(huskSetting?.value ?? "100");
  const warehouseStockKg = inventoryItem ? parseFloat(String(inventoryItem.currentStockKg)) : 0;

  // Per-farmer balance (all time, not date-filtered — balance is cumulative)
  const allFarmerIds = [...new Set(issuances.map(i => i.farmerId))];
  const [deliveryAggs, issuanceAggs] = await Promise.all([
    prisma.delivery.groupBy({
      by: ["farmerId"],
      where: { farmerId: { in: allFarmerIds } },
      _sum: { weightKg: true },
    }),
    prisma.huskIssuance.groupBy({
      by: ["farmerId"],
      where: { farmerId: { in: allFarmerIds } },
      _sum: { bagsIssued: true },
    }),
  ]);

  const balanceMap = Object.fromEntries(allFarmerIds.map(fId => {
    const delivered = Number(deliveryAggs.find(d => d.farmerId === fId)?._sum.weightKg ?? 0);
    const earned = Math.floor(delivered / huskKgPerBag);
    const taken = Number(issuanceAggs.find(i => i.farmerId === fId)?._sum.bagsIssued ?? 0);
    return [fId, { earned, taken, balance: earned - taken }];
  }));

  // Group by farmer for the period
  const byFarmerMap: Record<string, { name: string; farmerCode: string; location: string; issuances: number; bagsIssued: number; kgIssued: number }> = {};
  for (const i of issuances) {
    const key = i.farmerId;
    if (!byFarmerMap[key]) {
      byFarmerMap[key] = { name: i.farmer.name, farmerCode: i.farmer.farmerCode, location: i.farmer.location, issuances: 0, bagsIssued: 0, kgIssued: 0 };
    }
    byFarmerMap[key].issuances++;
    byFarmerMap[key].bagsIssued += i.bagsIssued;
    byFarmerMap[key].kgIssued += parseFloat(String(i.kgEquivalent));
  }

  const totalBags = issuances.reduce((s, i) => s + i.bagsIssued, 0);
  const totalKg = issuances.reduce((s, i) => s + parseFloat(String(i.kgEquivalent)), 0);

  return NextResponse.json({
    summary: {
      totalIssuances: issuances.length,
      totalBagsIssued: totalBags,
      totalKgIssued: totalKg,
      warehouseStockKg,
      huskKgPerBag,
    },
    byFarmer: Object.entries(byFarmerMap)
      .map(([farmerId, f]) => ({
        ...f,
        farmerId,
        currentBalance: balanceMap[farmerId]?.balance ?? 0,
        totalEarned: balanceMap[farmerId]?.earned ?? 0,
      }))
      .sort((a, b) => b.bagsIssued - a.bagsIssued),
    issuances: issuances.map(i => ({
      id: i.id,
      farmer: i.farmer.name,
      farmerCode: i.farmer.farmerCode,
      bagsIssued: i.bagsIssued,
      kgEquivalent: parseFloat(String(i.kgEquivalent)),
      issuedDate: i.issuedDate,
      issuedBy: i.issuedBy.name,
      notes: i.notes,
      farmerBalance: balanceMap[i.farmerId]?.balance ?? 0,
    })),
  });
}
