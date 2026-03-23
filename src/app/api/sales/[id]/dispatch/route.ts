import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendDispatchEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

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
    const { dispatchedKg, dispatchDateTime, truckRegistration, driverName, driverPhone } = body;

    if (!dispatchedKg || !dispatchDateTime) {
      return NextResponse.json({ error: "Quantity and dispatch date/time are required" }, { status: 400 });
    }

    const order = await prisma.saleOrder.findUnique({
      where: { id: saleOrderId },
      include: {
        coffeeVariety: true,
        buyer: true,
        dispatches: true,
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot dispatch a cancelled order" }, { status: 400 });
    }
    if (!["CONFIRMED", "DISPATCHED"].includes(order.status)) {
      return NextResponse.json({ error: "Order must be CONFIRMED before dispatch" }, { status: 400 });
    }

    const dispKg = parseFloat(dispatchedKg);
    const alreadyDispatched = order.dispatches.reduce(
      (s, d) => s + parseFloat(String(d.dispatchedKg)), 0
    );
    const remaining = parseFloat(String(order.quantityKg)) - alreadyDispatched;

    if (dispKg > remaining) {
      return NextResponse.json({
        error: `Cannot dispatch ${dispKg} kg — only ${remaining} kg remaining on this order`,
      }, { status: 400 });
    }

    // Find processed beans inventory item for this variety
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { category: "PROCESSED_BEANS", coffeeVarietyId: order.coffeeVarietyId },
    });

    if (!inventoryItem) {
      return NextResponse.json({ error: "No processed beans inventory item found for this variety" }, { status: 400 });
    }

    const currentStock = parseFloat(String(inventoryItem.currentStockKg));
    if (currentStock < dispKg) {
      return NextResponse.json({
        error: `Insufficient stock — only ${currentStock} kg available`,
      }, { status: 400 });
    }

    // Generate gate pass number: GP-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const countToday = await prisma.dispatch.count({
      where: { createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } },
    });
    const gatePassNumber = `GP-${dateStr}-${String(countToday + 1).padStart(3, "0")}`;

    const newStock = currentStock - dispKg;
    const dispatchDate = new Date(dispatchDateTime);

    const [dispatch] = await prisma.$transaction([
      prisma.dispatch.create({
        data: {
          saleOrderId,
          gatePassNumber,
          dispatchedKg: dispKg,
          dispatchDate,
          truckRegistration: truckRegistration || null,
          driverName: driverName || null,
          driverPhone: driverPhone || null,
          dispatchedById: userId,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { currentStockKg: newStock },
      }),
    ]);

    // Inventory movement
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: inventoryItem.id,
        movementType: "SALE_DISPATCH",
        direction: "OUT",
        quantityKg: dispKg,
        balanceAfterKg: newStock,
        recordedById: userId,
        dispatchId: dispatch.id,
        notes: `Gate Pass: ${gatePassNumber}`,
      },
    });

    // Update order status
    const totalDispatched = alreadyDispatched + dispKg;
    const newStatus = totalDispatched >= parseFloat(String(order.quantityKg)) ? "DISPATCHED" : "CONFIRMED";
    await prisma.saleOrder.update({
      where: { id: saleOrderId },
      data: { status: newStatus },
    });

    // Send email to buyer if they have an email on file
    if (order.buyer.email) {
      await sendDispatchEmail({
        to: order.buyer.email,
        buyerName: order.buyer.companyName,
        orderNumber: order.orderNumber,
        gatePassNumber,
        variety: order.coffeeVariety.name,
        dispatchedKg: dispKg,
        dispatchDate,
        truckRegistration: truckRegistration || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
      });
    }

    // WhatsApp dispatch notification to buyer
    const driverInfo = driverName
      ? ` Driver: ${driverName}${driverPhone ? ` (${driverPhone})` : ""}.`
      : "";
    const truckInfo = truckRegistration ? ` Truck: ${truckRegistration}.` : "";
    const waMsg =
      `Victory Coffee: Order #${order.orderNumber} — ${dispKg.toLocaleString()}kg DISPATCHED.` +
      driverInfo + truckInfo +
      ` Gate Pass: ${gatePassNumber}. We will contact you when delivery is confirmed.`;
    const { sent: waSent, url: waUrl } = await sendWhatsApp(order.buyer.phone, waMsg);

    return NextResponse.json({ dispatch, gatePassNumber, whatsappSent: waSent, whatsappUrl: waUrl }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sales/[id]/dispatch error:", error);
    return NextResponse.json({ error: "Failed to record dispatch" }, { status: 500 });
  }
}
