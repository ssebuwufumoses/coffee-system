import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SALES_FINANCE"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { category, amountUgx, expenseDate, description } = body;

    if (!category?.trim()) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!amountUgx || parseFloat(amountUgx) <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    if (!expenseDate) return NextResponse.json({ error: "Expense date is required" }, { status: 400 });

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        category: category.trim(),
        amountUgx: parseFloat(amountUgx),
        expenseDate: new Date(expenseDate),
        description: description?.trim() || null,
      },
      include: { recordedBy: { select: { name: true } } },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("PATCH /api/expenses/[id] error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SALES_FINANCE"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/expenses/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
