import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: saleOrderId } = await params;
    const body = await req.json();
    const { amountPaidUgx, paymentDate, paymentMethod, referenceNumber, notes } = body;

    if (!amountPaidUgx || !paymentDate || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await prisma.saleOrder.findUnique({
      where: { id: saleOrderId },
      include: {
        invoices: {
          include: { payments: true },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "INVOICED") {
      return NextResponse.json({ error: "Order must be INVOICED before recording payment" }, { status: 400 });
    }

    const invoice = order.invoices[0];
    if (!invoice) return NextResponse.json({ error: "No invoice found for this order" }, { status: 400 });

    const totalPaid = invoice.payments.reduce(
      (s, p) => s + parseFloat(String(p.amountPaidUgx)), 0
    );
    const invoiceAmount = parseFloat(String(invoice.amountUgx));
    const newAmount = parseFloat(amountPaidUgx);
    const newTotalPaid = totalPaid + newAmount;

    if (newTotalPaid > invoiceAmount) {
      return NextResponse.json({
        error: `Payment exceeds invoice amount. Outstanding: UGX ${(invoiceAmount - totalPaid).toLocaleString()}`,
      }, { status: 400 });
    }

    const paymentStatus = newTotalPaid >= invoiceAmount ? "FULLY_PAID" : "PARTIALLY_PAID";

    const [payment] = await prisma.$transaction([
      prisma.buyerPayment.create({
        data: {
          invoiceId: invoice.id,
          amountPaidUgx: newAmount,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          referenceNumber: referenceNumber || null,
          recordedById: userId,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentStatus },
      }),
    ]);

    // Mark order as PAID if fully paid
    if (paymentStatus === "FULLY_PAID") {
      await prisma.saleOrder.update({
        where: { id: saleOrderId },
        data: { status: "PAID" },
      });
    }

    return NextResponse.json({ payment, paymentStatus }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales/[id]/payment error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
