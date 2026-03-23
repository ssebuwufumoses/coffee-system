import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    include: { coffeeVariety: { select: { name: true, code: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, category, coffeeVarietyId, lowStockAlertKg } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });

  const existing = await prisma.inventoryItem.findFirst({ where: { name: name.trim() } });
  if (existing) return NextResponse.json({ error: "An inventory item with this name already exists" }, { status: 409 });

  const item = await prisma.inventoryItem.create({
    data: {
      name: name.trim(),
      category,
      coffeeVarietyId: coffeeVarietyId || null,
      lowStockAlertKg: lowStockAlertKg ? parseFloat(lowStockAlertKg) : null,
      currentStockKg: 0,
    },
    include: { coffeeVariety: { select: { name: true, code: true } } },
  });

  return NextResponse.json({ item }, { status: 201 });
}
