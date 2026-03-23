import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// GET: latest price per coffee variety
export async function GET() {
  try {
    const varieties = await prisma.coffeeVariety.findMany({
      where: { isActive: true },
      include: {
        coffeePrices: {
          orderBy: { effectiveDate: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const prices = varieties.map((v) => ({
      varietyId: v.id,
      varietyName: v.name,
      varietyCode: v.code,
      currentPrice: v.coffeePrices[0] ?? null,
    }));

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("GET /api/prices error:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

// POST: set a new price for a variety
export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { coffeeVarietyId, pricePerKgUgx, effectiveDate } = body;

    if (!coffeeVarietyId || !pricePerKgUgx || !effectiveDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const price = await prisma.coffeePrice.create({
      data: {
        coffeeVarietyId,
        pricePerKgUgx: parseFloat(pricePerKgUgx),
        effectiveDate: new Date(effectiveDate),
        setById: userId,
      },
      include: { coffeeVariety: true },
    });

    return NextResponse.json({ price }, { status: 201 });
  } catch (error) {
    console.error("POST /api/prices error:", error);
    return NextResponse.json({ error: "Failed to set price" }, { status: 500 });
  }
}
