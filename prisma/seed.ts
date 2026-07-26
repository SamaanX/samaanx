import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CategorySeed = {
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

/**
 * MVP category catalog — Lucide icon names as strings.
 * Upserted by slug so `prisma db seed` is idempotent.
 */
const CATEGORIES: CategorySeed[] = [
  {
    name: "Electronics",
    slug: "electronics",
    icon: "Cpu",
    sortOrder: 10,
    isActive: true,
  },
  {
    name: "Mobiles",
    slug: "mobiles",
    icon: "Smartphone",
    sortOrder: 20,
    isActive: true,
  },
  {
    name: "Laptops",
    slug: "laptops",
    icon: "Laptop",
    sortOrder: 30,
    isActive: true,
  },
  {
    name: "Cameras",
    slug: "cameras",
    icon: "Camera",
    sortOrder: 40,
    isActive: true,
  },
  {
    name: "Vehicles",
    slug: "vehicles",
    icon: "Car",
    sortOrder: 50,
    isActive: true,
  },
  { name: "Bikes", slug: "bikes", icon: "Bike", sortOrder: 60, isActive: true },
  {
    name: "Furniture",
    slug: "furniture",
    icon: "Armchair",
    sortOrder: 70,
    isActive: true,
  },
  {
    name: "Home Appliances",
    slug: "home-appliances",
    icon: "Refrigerator",
    sortOrder: 80,
    isActive: true,
  },
  {
    name: "Gaming",
    slug: "gaming",
    icon: "Gamepad2",
    sortOrder: 90,
    isActive: true,
  },
  {
    name: "Sports",
    slug: "sports",
    icon: "Dumbbell",
    sortOrder: 100,
    isActive: true,
  },
  {
    name: "Fashion",
    slug: "fashion",
    icon: "Shirt",
    sortOrder: 110,
    isActive: true,
  },
  {
    name: "Tools",
    slug: "tools",
    icon: "Wrench",
    sortOrder: 120,
    isActive: true,
  },
  {
    name: "Musical Instruments",
    slug: "musical-instruments",
    icon: "Music",
    sortOrder: 130,
    isActive: true,
  },
  {
    name: "Event Equipment",
    slug: "event-equipment",
    icon: "PartyPopper",
    sortOrder: 140,
    isActive: true,
  },
  {
    name: "Baby Products",
    slug: "baby-products",
    icon: "Baby",
    sortOrder: 150,
    isActive: true,
  },
  {
    name: "Books",
    slug: "books",
    icon: "BookOpen",
    sortOrder: 160,
    isActive: true,
  },
  {
    name: "Others",
    slug: "others",
    icon: "LayoutGrid",
    sortOrder: 999,
    isActive: true,
  },
];

async function seedCategories(): Promise<void> {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      },
    });
  }
}

async function main(): Promise<void> {
  await seedCategories();

  const count = await prisma.category.count();
  console.warn(`Seed complete. Categories in database: ${count}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
