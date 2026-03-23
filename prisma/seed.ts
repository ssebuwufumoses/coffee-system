import { PrismaClient, Role, PaymentPreference, BuyerType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Victory Coffee database...");

  // ------------------------------------------------------------------
  // 1. System Settings (configurable business rules)
  // ------------------------------------------------------------------
  const settings = [
    {
      key: "husk_kg_per_bag",
      value: "100",
      description: "How many KG of raw coffee earns 1 bag of husks",
    },
    {
      key: "husk_alert_threshold_bags",
      value: "10",
      description: "Alert when a farmer has accumulated this many uncollected husk bags",
    },
    {
      key: "husk_bag_weight_kg",
      value: "20",
      description: "Physical weight in kg of one husk bag (husks are light — ~20kg per bag)",
    },
    {
      key: "default_payment_due_days",
      value: "30",
      description: "Default invoice due date in days from issue date",
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("  ✓ System settings seeded");

  // ------------------------------------------------------------------
  // 2. Coffee Varieties (Admin can add more from the UI)
  // ------------------------------------------------------------------
  const varieties = [
    { name: "Robusta", code: "ROB", description: "Coffea canephora — the primary variety" },
    { name: "Arabica", code: "ARA", description: "Coffea arabica — highland variety" },
    { name: "Kiboko", code: "KBK", description: "Dry/natural processed cherry coffee" },
  ];

  const createdVarieties: Record<string, string> = {};
  for (const v of varieties) {
    const variety = await prisma.coffeeVariety.upsert({
      where: { code: v.code },
      update: {},
      create: v,
    });
    createdVarieties[v.code] = variety.id;
  }
  console.log("  ✓ Coffee varieties seeded");

  // ------------------------------------------------------------------
  // 3. Admin user
  // ------------------------------------------------------------------
  const adminPassword = await bcrypt.hash("Admin@2024!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@victorycoffee.ug" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@victorycoffee.ug",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`  ✓ Admin user created — email: admin@victorycoffee.ug | password: Admin@2024!`);

  // ------------------------------------------------------------------
  // 4. Sample staff users (one per role)
  // ------------------------------------------------------------------
  const staffPassword = await bcrypt.hash("Staff@2024!", 12);
  const staffUsers = [
    { name: "John Mubiru", email: "operator@victorycoffee.ug", role: Role.OPERATOR },
    { name: "Sarah Nakato", email: "store@victorycoffee.ug", role: Role.STORE_MANAGER },
    { name: "Peter Ssemwanga", email: "sales@victorycoffee.ug", role: Role.SALES_FINANCE },
  ];

  for (const u of staffUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: staffPassword, isActive: true },
    });
  }
  console.log("  ✓ Staff users seeded (password: Staff@2024!)");

  // ------------------------------------------------------------------
  // 5. Inventory items (one per stock category)
  // ------------------------------------------------------------------
  const inventoryItems = [
    {
      name: "Robusta Raw (Kiboko)",
      category: "RAW_COFFEE" as const,
      coffeeVarietyId: createdVarieties["ROB"],
    },
    {
      name: "Arabica Raw",
      category: "RAW_COFFEE" as const,
      coffeeVarietyId: createdVarieties["ARA"],
    },
    {
      name: "Kiboko Raw",
      category: "RAW_COFFEE" as const,
      coffeeVarietyId: createdVarieties["KBK"],
    },
    {
      name: "Robusta Processed Beans (Kase)",
      category: "PROCESSED_BEANS" as const,
      coffeeVarietyId: createdVarieties["ROB"],
      lowStockAlertKg: 500,
    },
    {
      name: "Arabica Processed Beans",
      category: "PROCESSED_BEANS" as const,
      coffeeVarietyId: createdVarieties["ARA"],
      lowStockAlertKg: 500,
    },
    {
      name: "Kiboko Processed Beans",
      category: "PROCESSED_BEANS" as const,
      coffeeVarietyId: createdVarieties["KBK"],
      lowStockAlertKg: 500,
    },
    {
      name: "Husks (Kikuta)",
      category: "HUSKS" as const,
      coffeeVarietyId: null,
      lowStockAlertKg: 200,
    },
    {
      name: "Packaging Bags",
      category: "PACKAGING" as const,
      coffeeVarietyId: null,
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: item.name } as never,
      update: {},
      create: item,
    }).catch(async () => {
      // upsert by name if id not found
      const existing = await prisma.inventoryItem.findFirst({
        where: { name: item.name },
      });
      if (!existing) {
        await prisma.inventoryItem.create({ data: item });
      }
    });
  }
  console.log("  ✓ Inventory items seeded");

  // ------------------------------------------------------------------
  // 6. Sample buyer
  // ------------------------------------------------------------------
  await prisma.buyer.upsert({
    where: { id: "sample-buyer" } as never,
    update: {},
    create: {
      companyName: "Kampala Coffee Exporters Ltd",
      contactName: "David Kiggundu",
      phone: "+256 701 234567",
      email: "david@kcexporters.ug",
      location: "Kampala, Uganda",
      buyerType: BuyerType.EXPORTER,
      createdById: admin.id,
    },
  }).catch(async () => {
    const existing = await prisma.buyer.findFirst({
      where: { companyName: "Kampala Coffee Exporters Ltd" },
    });
    if (!existing) {
      await prisma.buyer.create({
        data: {
          companyName: "Kampala Coffee Exporters Ltd",
          contactName: "David Kiggundu",
          phone: "+256 701 234567",
          email: "david@kcexporters.ug",
          location: "Kampala, Uganda",
          buyerType: BuyerType.EXPORTER,
          createdById: admin.id,
        },
      });
    }
  });
  console.log("  ✓ Sample buyer seeded");

  console.log("\n✅ Database seeded successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin login:    admin@victorycoffee.ug");
  console.log("  Admin password: Admin@2024!");
  console.log("  Staff password: Staff@2024!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
