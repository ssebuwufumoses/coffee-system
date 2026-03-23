import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: "asc" },
    include: { updatedBy: { select: { name: true } } },
  });

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { key, value, description } = body as { key: string; value: string; description?: string };

  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: {
      value: String(value),
      ...(description !== undefined ? { description } : {}),
      updatedById: session.userId,
    },
    create: {
      key,
      value: String(value),
      description: description ?? null,
      updatedById: session.userId,
    },
  });

  return NextResponse.json({ setting });
}
