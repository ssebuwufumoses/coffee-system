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

  const [payments, byMethod] = await Promise.all([
    prisma.farmerPayment.findMany({
      where,
      include: {
        farmer: { select: { id: true, name: true, farmerCode: true, location: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.farmerPayment.groupBy({
      by: ["paymentMethod"],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Group by farmer
  const byFarmerMap: Record<string, { name: string; farmerCode: string; location: string; payments: number; totalPaid: number }> = {};
  for (const p of payments) {
    const key = p.farmerId;
    if (!byFarmerMap[key]) {
      byFarmerMap[key] = { name: p.farmer.name, farmerCode: p.farmer.farmerCode, location: p.farmer.location, payments: 0, totalPaid: 0 };
    }
    byFarmerMap[key].payments++;
    byFarmerMap[key].totalPaid += parseFloat(String(p.amount));
  }

  const totalPaid = payments.reduce((s, p) => s + parseFloat(String(p.amount)), 0);

  return NextResponse.json({
    summary: {
      totalPayments: payments.length,
      totalPaidUgx: totalPaid,
      uniqueFarmers: Object.keys(byFarmerMap).length,
    },
    byMethod: byMethod.map(m => ({
      method: m.paymentMethod,
      count: m._count,
      totalUgx: parseFloat(String(m._sum.amount ?? 0)),
    })).sort((a, b) => b.totalUgx - a.totalUgx),
    byFarmer: Object.values(byFarmerMap).sort((a, b) => b.totalPaid - a.totalPaid),
    payments: payments.map(p => ({
      id: p.id,
      farmer: p.farmer.name,
      farmerCode: p.farmer.farmerCode,
      amount: parseFloat(String(p.amount)),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      recordedBy: p.recordedBy.name,
    })),
  });
}
