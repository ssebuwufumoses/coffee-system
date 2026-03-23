import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: {
        buyer: true,
        coffeeVariety: true,
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        dispatches: {
          include: { dispatchedBy: { select: { name: true } } },
          orderBy: { dispatchDate: "asc" },
        },
        invoices: {
          include: {
            createdBy: { select: { name: true } },
            payments: {
              include: { recordedBy: { select: { name: true } } },
              orderBy: { paymentDate: "asc" },
            },
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("GET /api/sales/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action, paymentStatus, paymentMethod, paymentAmount, paymentReference } = body;

    const order = await prisma.saleOrder.findUnique({
      where: { id },
      include: { buyer: true, coffeeVariety: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (action === "confirm") {
      if (order.status !== "DRAFT") {
        return NextResponse.json({ error: "Only DRAFT orders can be confirmed" }, { status: 400 });
      }

      // Build payment note
      let paymentNote = "";
      if (paymentStatus && paymentStatus !== "NONE") {
        const methodLabel: Record<string, string> = {
          CASH: "Cash", MOBILE_MONEY: "Mobile Money",
          BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
        };
        paymentNote = paymentStatus === "FULL" ? "Fully paid" : "Partially paid";
        if (paymentAmount) paymentNote += ` — UGX ${parseFloat(paymentAmount).toLocaleString()}`;
        if (paymentMethod) paymentNote += ` via ${methodLabel[paymentMethod] ?? paymentMethod}`;
        if (paymentReference) paymentNote += ` | Ref: ${paymentReference}`;
        paymentNote = `[PAYMENT @ CONFIRMATION: ${paymentNote}]`;
      }

      const existingNotes = order.notes ?? "";
      const newNotes = paymentNote
        ? existingNotes ? `${existingNotes}\n${paymentNote}` : paymentNote
        : existingNotes || null;

      const updated = await prisma.saleOrder.update({
        where: { id },
        data: { status: "CONFIRMED", approvedById: userId, notes: newNotes },
      });

      // WhatsApp to buyer on confirmation
      const qty = Number(order.quantityKg).toLocaleString();
      const confirmMsg =
        `Victory Coffee: Your order #${order.orderNumber} for ${qty}kg of ${order.coffeeVariety.name} has been CONFIRMED. We will notify you when it is dispatched.`;
      const { sent: confirmSent, url: confirmUrl } = await sendWhatsApp(order.buyer.phone, confirmMsg);

      return NextResponse.json({ order: updated, whatsappSent: confirmSent, whatsappUrl: confirmUrl });
    }

    if (action === "mark_delivered") {
      if (order.status !== "DISPATCHED") {
        return NextResponse.json(
          { error: "Order must be in DISPATCHED status to mark as delivered" },
          { status: 400 }
        );
      }

      const updated = await prisma.saleOrder.update({
        where: { id },
        data: { status: "DELIVERED" },
      });

      // WhatsApp delivery confirmation to buyer
      const deliveredMsg =
        `Victory Coffee: Order #${order.orderNumber} — delivery confirmed! Thank you for your business, ${order.buyer.companyName}. Please contact us with any queries.`;
      const { sent: deliveredSent, url: deliveredUrl } = await sendWhatsApp(order.buyer.phone, deliveredMsg);

      return NextResponse.json({ order: updated, whatsappSent: deliveredSent, whatsappUrl: deliveredUrl });
    }

    if (action === "cancel") {
      if (!["DRAFT", "CONFIRMED"].includes(order.status)) {
        return NextResponse.json({ error: "Order cannot be cancelled at this stage" }, { status: 400 });
      }
      const updated = await prisma.saleOrder.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ order: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/sales/[id] error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
