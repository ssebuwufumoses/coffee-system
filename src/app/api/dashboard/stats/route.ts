import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalFarmers,
    totalDeliveries,
    deliveriesThisMonth,
    inventoryItems,
    millingStats,
    activeBatches,
    // Sales
    ordersThisMonth,
    revenueThisMonth,
    revenueLastMonth,
    ordersByStatus,
    pendingInvoices,
    recentOrders,
  ] = await Promise.all([
    prisma.farmer.count({ where: { isActive: true } }),
    prisma.delivery.count(),

    prisma.delivery.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _count: true,
      _sum: { weightKg: true },
    }),

    prisma.inventoryItem.findMany({
      select: { name: true, category: true, currentStockKg: true, lowStockAlertKg: true },
    }),

    prisma.millingBatch.aggregate({
      where: { status: "COMPLETED" },
      _count: true,
      _avg: { conversionRatePct: true },
    }),

    prisma.millingBatch.count({ where: { status: "IN_PROGRESS" } }),

    // Orders created this month
    prisma.saleOrder.count({
      where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
    }),

    // Revenue this month (confirmed / dispatched / invoiced / paid)
    prisma.saleOrder.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ["CONFIRMED", "DISPATCHED", "INVOICED", "PAID"] },
      },
      _sum: { totalAmountUgx: true },
    }),

    // Revenue last month
    prisma.saleOrder.aggregate({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { in: ["CONFIRMED", "DISPATCHED", "INVOICED", "PAID"] },
      },
      _sum: { totalAmountUgx: true },
    }),

    // Count by status
    prisma.saleOrder.groupBy({
      by: ["status"],
      _count: true,
      where: { status: { not: "CANCELLED" } },
    }),

    // Unpaid / partially paid invoices
    prisma.invoice.count({
      where: { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    }),

    // Recent 5 orders
    prisma.saleOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      where: { status: { not: "CANCELLED" } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmountUgx: true,
        createdAt: true,
        buyer: { select: { companyName: true } },
        coffeeVariety: { select: { name: true, code: true } },
      },
    }),
  ]);

  const rawStockKg = inventoryItems
    .filter(i => i.category === "RAW_COFFEE")
    .reduce((s, i) => s + parseFloat(i.currentStockKg.toString()), 0);

  const processedBeansKg = inventoryItems
    .filter(i => i.category === "PROCESSED_BEANS")
    .reduce((s, i) => s + parseFloat(i.currentStockKg.toString()), 0);

  const husksKg = inventoryItems
    .filter(i => i.category === "HUSKS")
    .reduce((s, i) => s + parseFloat(i.currentStockKg.toString()), 0);

  const lowStockCount = inventoryItems.filter(
    i => i.lowStockAlertKg && parseFloat(i.currentStockKg.toString()) <= parseFloat(i.lowStockAlertKg.toString())
  ).length;

  const statusMap = Object.fromEntries(ordersByStatus.map(r => [r.status, r._count]));

  const revenueThisMonthVal = parseFloat((revenueThisMonth._sum.totalAmountUgx ?? 0).toString());
  const revenueLastMonthVal = parseFloat((revenueLastMonth._sum.totalAmountUgx ?? 0).toString());
  const revenueChange = revenueLastMonthVal > 0
    ? ((revenueThisMonthVal - revenueLastMonthVal) / revenueLastMonthVal) * 100
    : null;

  return NextResponse.json({
    // Farmers & intake
    totalFarmers,
    totalDeliveries,
    deliveriesThisMonth: deliveriesThisMonth._count,
    weightThisMonthKg: parseFloat((deliveriesThisMonth._sum.weightKg ?? 0).toString()),
    // Inventory
    rawStockKg,
    processedBeansKg,
    husksKg,
    lowStockCount,
    // Milling
    completedMillingBatches: millingStats._count,
    avgConversionRate: millingStats._avg.conversionRatePct
      ? parseFloat(millingStats._avg.conversionRatePct.toString()).toFixed(1)
      : null,
    activeBatches,
    // Sales
    ordersThisMonth,
    revenueThisMonth: revenueThisMonthVal,
    revenueLastMonth: revenueLastMonthVal,
    revenueChange,
    draftOrders: statusMap["DRAFT"] ?? 0,
    confirmedOrders: statusMap["CONFIRMED"] ?? 0,
    dispatchedOrders: statusMap["DISPATCHED"] ?? 0,
    pendingInvoices,
    recentOrders,
  });
}
