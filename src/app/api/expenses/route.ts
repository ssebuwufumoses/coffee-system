import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const category = searchParams.get("category") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = 25;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (from || to) {
      where.expenseDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
      };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { recordedBy: { select: { name: true } } },
        orderBy: { expenseDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    // Summary for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [monthTotal, yearTotal, byCategory] = await Promise.all([
      prisma.expense.aggregate({ where: { expenseDate: { gte: monthStart } }, _sum: { amountUgx: true } }),
      prisma.expense.aggregate({ where: { expenseDate: { gte: yearStart } }, _sum: { amountUgx: true } }),
      prisma.expense.groupBy({ by: ["category"], _sum: { amountUgx: true }, orderBy: { _sum: { amountUgx: "desc" } } }),
    ]);

    return NextResponse.json({
      expenses,
      total,
      pages: Math.ceil(total / limit),
      summary: {
        monthTotal: Number(monthTotal._sum.amountUgx ?? 0),
        yearTotal: Number(yearTotal._sum.amountUgx ?? 0),
        byCategory: byCategory.map(b => ({ category: b.category, total: Number(b._sum.amountUgx ?? 0) })),
      },
    });
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SALES_FINANCE"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { category, amountUgx, expenseDate, description } = body;

    if (!category?.trim()) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!amountUgx || parseFloat(amountUgx) <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    if (!expenseDate) return NextResponse.json({ error: "Expense date is required" }, { status: 400 });

    const expense = await prisma.expense.create({
      data: {
        category: category.trim(),
        amountUgx: parseFloat(amountUgx),
        expenseDate: new Date(expenseDate),
        description: description?.trim() || null,
        recordedById: session.userId,
      },
      include: { recordedBy: { select: { name: true } } },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json({ error: "Failed to record expense" }, { status: 500 });
  }
}
