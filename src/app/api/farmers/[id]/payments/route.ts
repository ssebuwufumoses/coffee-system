import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"]),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/farmers/[id]/payments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: farmerId } = await params;

  const [payments, agg] = await Promise.all([
    prisma.farmerPayment.findMany({
      where: { farmerId },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.farmerPayment.aggregate({
      where: { farmerId },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    payments,
    totalPaidUgx: Number(agg._sum.amount ?? 0),
  });
}

// POST /api/farmers/[id]/payments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "STORE_MANAGER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: farmerId } = await params;

  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId }, select: { id: true } });
  if (!farmer) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });

  const body = await request.json();
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { amount, paymentDate, paymentMethod, referenceNumber, notes } = parsed.data;

  const payment = await prisma.farmerPayment.create({
    data: {
      farmerId,
      amount,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      referenceNumber: referenceNumber ?? null,
      notes: notes ?? null,
      recordedById: session.userId,
    },
    include: { recordedBy: { select: { name: true } } },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
