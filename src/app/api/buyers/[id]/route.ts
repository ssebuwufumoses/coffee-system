import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const buyer = await prisma.buyer.findUnique({
      where: { id },
      include: { _count: { select: { saleOrders: true } } },
    });
    if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    return NextResponse.json({ buyer });
  } catch (error) {
    console.error("GET /api/buyers/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch buyer" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SALES_FINANCE"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { companyName, contactName, phone, email, location, buyerType } = body;

    if (!companyName || !contactName || !phone || !location || !buyerType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buyer = await prisma.buyer.update({
      where: { id },
      data: { companyName, contactName, phone, email: email || null, location, buyerType },
    });

    return NextResponse.json({ buyer });
  } catch (error) {
    console.error("PATCH /api/buyers/[id] error:", error);
    return NextResponse.json({ error: "Failed to update buyer" }, { status: 500 });
  }
}
