import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const buyers = await prisma.buyer.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { saleOrders: true } },
      },
      orderBy: { companyName: "asc" },
    });
    return NextResponse.json({ buyers });
  } catch (error) {
    console.error("GET /api/buyers error:", error);
    return NextResponse.json({ error: "Failed to fetch buyers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { companyName, contactName, phone, email, location, buyerType } = body;

    if (!companyName || !contactName || !phone || !location || !buyerType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buyer = await prisma.buyer.create({
      data: {
        companyName,
        contactName,
        phone,
        email: email || null,
        location,
        buyerType,
        createdById: userId,
      },
    });

    return NextResponse.json({ buyer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/buyers error:", error);
    return NextResponse.json({ error: "Failed to create buyer" }, { status: 500 });
  }
}
