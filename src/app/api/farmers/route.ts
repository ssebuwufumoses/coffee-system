import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const createFarmerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(9, "Enter a valid phone number"),
  location: z.string().min(2, "Location is required"),
  coffeeVarietyId: z.string().uuid("Select a valid coffee variety"),
  paymentPreference: z.enum(["CASH", "MOBILE_MONEY", "BANK"]),
  // EUDR compliance fields
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  landBoundary: z.string().optional().nullable(),
  // Payment details
  mobileMoneyNetwork: z.enum(["MTN", "AIRTEL"]).optional().nullable(),
  mobileMoneyNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
});

/** Generate next farmer code e.g. VCF-0042 */
async function generateFarmerCode(): Promise<string> {
  const last = await prisma.farmer.findFirst({
    orderBy: { createdAt: "desc" },
    select: { farmerCode: true },
  });

  if (!last) return "VCF-0001";

  const num = parseInt(last.farmerCode.split("-")[1] ?? "0", 10);
  return `VCF-${String(num + 1).padStart(4, "0")}`;
}

// GET /api/farmers — list with search + pagination
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { farmerCode: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { location: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [farmers, total] = await Promise.all([
    prisma.farmer.findMany({
      where,
      include: {
        coffeeVariety: { select: { name: true, code: true } },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.farmer.count({ where }),
  ]);

  // Attach delivery totals
  const farmerIds = farmers.map((f) => f.id);
  const totals = await prisma.delivery.groupBy({
    by: ["farmerId"],
    where: { farmerId: { in: farmerIds } },
    _sum: { weightKg: true },
  });
  const totalMap = Object.fromEntries(totals.map((t) => [t.farmerId, t._sum.weightKg ?? 0]));

  const huskKgPerBag = await prisma.systemSetting
    .findUnique({ where: { key: "husk_kg_per_bag" } })
    .then((s) => parseFloat(s?.value ?? "100"));

  // Attach husk issuance totals per farmer
  const issuanceTotals = await prisma.huskIssuance.groupBy({
    by: ["farmerId"],
    where: { farmerId: { in: farmerIds } },
    _sum: { bagsIssued: true },
  });
  const issuanceMap = Object.fromEntries(issuanceTotals.map((t) => [t.farmerId, Number(t._sum.bagsIssued ?? 0)]));

  const result = farmers.map((f) => {
    const deliveredKg = Number(totalMap[f.id] ?? 0);
    const husksEarned = Math.floor(deliveredKg / huskKgPerBag);
    const husksTaken = issuanceMap[f.id] ?? 0;
    const husksBalance = husksEarned - husksTaken;
    return { ...f, deliveredKg, husksEarned, husksTaken, husksBalance };
  });

  return NextResponse.json({ farmers: result, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/farmers — register new farmer
export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "OPERATOR"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createFarmerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const farmerCode = await generateFarmerCode();

  const farmer = await prisma.farmer.create({
    data: {
      ...parsed.data,
      farmerCode,
      createdById: session.userId,
    },
    include: { coffeeVariety: { select: { name: true, code: true } } },
  });

  return NextResponse.json({ farmer }, { status: 201 });
}
