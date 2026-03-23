import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: saleOrderId } = await params;
    const { dueDate } = await req.json();

    if (!dueDate) return NextResponse.json({ error: "Due date is required" }, { status: 400 });

    const order = await prisma.saleOrder.findUnique({
      where: { id: saleOrderId },
      include: {
        invoices: true,
        buyer: true,
        coffeeVariety: { select: { name: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "DISPATCHED") {
      return NextResponse.json({ error: "Order must be fully dispatched before invoicing" }, { status: 400 });
    }
    if (order.invoices.length > 0) {
      return NextResponse.json({ error: "Invoice already exists for this order" }, { status: 400 });
    }

    // Generate invoice number: INV-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const countToday = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const invoiceNumber = `INV-${dateStr}-${String(countToday + 1).padStart(3, "0")}`;

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          invoiceNumber,
          saleOrderId,
          amountUgx: order.totalAmountUgx,
          dueDate: new Date(dueDate),
          createdById: userId,
        },
      }),
      prisma.saleOrder.update({
        where: { id: saleOrderId },
        data: { status: "INVOICED" },
      }),
    ]);

    // Send invoice email to buyer if they have an email
    if (order.buyer.email) {
      sendInvoiceEmail({
        to: order.buyer.email,
        buyerName: order.buyer.companyName,
        invoiceNumber,
        orderNumber: order.orderNumber,
        variety: order.coffeeVariety.name,
        quantityKg: parseFloat(String(order.quantityKg)),
        pricePerKgUgx: parseFloat(String(order.pricePerKgUgx)),
        totalAmountUgx: parseFloat(String(order.totalAmountUgx)),
        dueDate: new Date(dueDate),
      }).catch(() => {});
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales/[id]/invoice error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
