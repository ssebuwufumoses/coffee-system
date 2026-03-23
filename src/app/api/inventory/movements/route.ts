import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const category = searchParams.get("category") ?? undefined;

  // Build optional filter on inventory item category
  const whereClause = category
    ? { inventoryItem: { category: category as never } }
    : {};

  const movements = await prisma.inventoryMovement.findMany({
    where: whereClause,
    include: {
      inventoryItem: { select: { name: true, category: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ movements });
}
