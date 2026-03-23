import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const orders = await prisma.saleOrder.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        buyer: { select: { id: true, companyName: true, buyerType: true } },
        coffeeVariety: { select: { id: true, name: true, code: true } },
        createdBy: { select: { name: true } },
        dispatches: { select: { id: true, dispatchedKg: true, dispatchDate: true } },
        invoices: { select: { id: true, invoiceNumber: true, paymentStatus: true, amountUgx: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { buyerId, coffeeVarietyId, quantityKg, pricePerKgUgx, notes } = body;

    if (!buyerId || !coffeeVarietyId || !quantityKg || !pricePerKgUgx) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const qty = parseFloat(quantityKg);
    const price = parseFloat(pricePerKgUgx);
    const total = qty * price;

    // Generate order number: SO-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const countToday = await prisma.saleOrder.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const orderNumber = `SO-${dateStr}-${String(countToday + 1).padStart(3, "0")}`;

    const order = await prisma.saleOrder.create({
      data: {
        orderNumber,
        buyerId,
        coffeeVarietyId,
        quantityKg: qty,
        pricePerKgUgx: price,
        totalAmountUgx: total,
        notes: notes || null,
        createdById: userId,
      },
      include: {
        buyer: true,
        coffeeVariety: true,
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
