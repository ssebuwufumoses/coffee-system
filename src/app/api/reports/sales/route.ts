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

  const where = {
    status: { not: "CANCELLED" as const },
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
  };

  const [orders, byBuyer, byVariety] = await Promise.all([
    // All orders in range
    prisma.saleOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { companyName: true } },
        coffeeVariety: { select: { name: true, code: true } },
        dispatches: { select: { dispatchedKg: true } },
        invoices: {
          select: {
            amountUgx: true,
            paymentStatus: true,
            payments: { select: { amountPaidUgx: true } },
          },
        },
      },
    }),

    // Revenue grouped by buyer
    prisma.saleOrder.groupBy({
      by: ["buyerId"],
      where,
      _sum: { totalAmountUgx: true, quantityKg: true },
      _count: true,
    }),

    // Revenue grouped by variety
    prisma.saleOrder.groupBy({
      by: ["coffeeVarietyId"],
      where,
      _sum: { totalAmountUgx: true, quantityKg: true },
      _count: true,
    }),
  ]);

  // Enrich buyer breakdown
  const buyerIds = byBuyer.map(b => b.buyerId);
  const buyers = await prisma.buyer.findMany({
    where: { id: { in: buyerIds } },
    select: { id: true, companyName: true },
  });
  const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b.companyName]));

  // Enrich variety breakdown
  const varietyIds = byVariety.map(v => v.coffeeVarietyId);
  const varieties = await prisma.coffeeVariety.findMany({
    where: { id: { in: varietyIds } },
    select: { id: true, name: true, code: true },
  });
  const varietyMap = Object.fromEntries(varieties.map(v => [v.id, v]));

  // Summary totals
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(String(o.totalAmountUgx)), 0);
  const totalKg = orders.reduce((s, o) => s + parseFloat(String(o.quantityKg)), 0);
  const totalPaid = orders.reduce((s, o) => {
    const inv = o.invoices[0];
    if (!inv) return s;
    return s + inv.payments.reduce((ps, p) => ps + parseFloat(String(p.amountPaidUgx)), 0);
  }, 0);

  return NextResponse.json({
    summary: {
      totalOrders: orders.length,
      totalRevenue,
      totalKg,
      totalPaid,
      outstanding: totalRevenue - totalPaid,
    },
    orders: orders.map(o => {
      const inv = o.invoices[0];
      const paid = inv ? inv.payments.reduce((s, p) => s + parseFloat(String(p.amountPaidUgx)), 0) : 0;
      const dispatched = o.dispatches.reduce((s, d) => s + parseFloat(String(d.dispatchedKg)), 0);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        buyer: o.buyer.companyName,
        variety: `${o.coffeeVariety.name} (${o.coffeeVariety.code})`,
        quantityKg: parseFloat(String(o.quantityKg)),
        dispatchedKg: dispatched,
        totalAmountUgx: parseFloat(String(o.totalAmountUgx)),
        paidUgx: paid,
        outstandingUgx: parseFloat(String(o.totalAmountUgx)) - paid,
        paymentStatus: inv?.paymentStatus ?? "NO_INVOICE",
        createdAt: o.createdAt,
      };
    }),
    byBuyer: byBuyer
      .map(b => ({
        buyerName: buyerMap[b.buyerId] ?? "Unknown",
        orders: b._count,
        totalKg: parseFloat(String(b._sum.quantityKg ?? 0)),
        totalRevenue: parseFloat(String(b._sum.totalAmountUgx ?? 0)),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue),
    byVariety: byVariety
      .map(v => ({
        variety: varietyMap[v.coffeeVarietyId]?.name ?? "Unknown",
        code: varietyMap[v.coffeeVarietyId]?.code ?? "",
        orders: v._count,
        totalKg: parseFloat(String(v._sum.quantityKg ?? 0)),
        totalRevenue: parseFloat(String(v._sum.totalAmountUgx ?? 0)),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue),
  });
}
