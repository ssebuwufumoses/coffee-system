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
    status: "COMPLETED" as const,
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
  };

  const batches = await prisma.millingBatch.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      coffeeVariety: { select: { name: true, code: true } },
      createdBy: { select: { name: true } },
      owners: {
        include: { farmer: { select: { name: true, farmerCode: true } } },
      },
    },
  });

  const totalInput = batches.reduce((s, b) => s + parseFloat(String(b.inputRawKg)), 0);
  const totalBeans = batches.reduce((s, b) => s + parseFloat(String(b.outputBeansKg ?? 0)), 0);
  const totalHusks = batches.reduce((s, b) => s + parseFloat(String(b.outputHusksKg ?? 0)), 0);
  const avgConversion = batches.length
    ? batches.reduce((s, b) => s + parseFloat(String(b.conversionRatePct ?? 0)), 0) / batches.length
    : 0;

  // Group by variety
  const byVariety: Record<string, { name: string; code: string; batches: number; inputKg: number; beansKg: number; husksKg: number }> = {};
  for (const b of batches) {
    const key = b.coffeeVarietyId;
    if (!byVariety[key]) {
      byVariety[key] = { name: b.coffeeVariety.name, code: b.coffeeVariety.code, batches: 0, inputKg: 0, beansKg: 0, husksKg: 0 };
    }
    byVariety[key].batches++;
    byVariety[key].inputKg += parseFloat(String(b.inputRawKg));
    byVariety[key].beansKg += parseFloat(String(b.outputBeansKg ?? 0));
    byVariety[key].husksKg += parseFloat(String(b.outputHusksKg ?? 0));
  }

  return NextResponse.json({
    summary: {
      totalBatches: batches.length,
      totalInputKg: totalInput,
      totalBeansKg: totalBeans,
      totalHusksKg: totalHusks,
      avgConversionRate: avgConversion.toFixed(1),
    },
    batches: batches.map(b => ({
      id: b.id,
      batchNumber: b.batchNumber,
      variety: `${b.coffeeVariety.name} (${b.coffeeVariety.code})`,
      batchType: b.batchType,
      inputKg: parseFloat(String(b.inputRawKg)),
      beansKg: parseFloat(String(b.outputBeansKg ?? 0)),
      husksKg: parseFloat(String(b.outputHusksKg ?? 0)),
      moistureLossKg: parseFloat(String(b.moistureLossKg ?? 0)),
      conversionRate: parseFloat(String(b.conversionRatePct ?? 0)),
      createdBy: b.createdBy.name,
      createdAt: b.createdAt,
    })),
    byVariety: Object.values(byVariety)
      .map(v => ({ ...v, avgConversion: v.inputKg > 0 ? ((v.beansKg / v.inputKg) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.inputKg - a.inputKg),
  });
}
