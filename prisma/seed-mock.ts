import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { normalizeUzbekPhoneNumber } from '../src/users/phone.util';

const prisma = new PrismaClient();

type UnitSeed = {
  name: string;
  symbol: string;
};

type CategorySeed = {
  name: string;
  image: string;
};

type ProductSeed = {
  name: string;
  description: string;
  image: string;
  price: number;
  categoryName: string;
  unitSymbol: string;
  stockBatches: Array<{ quantity: number; receivedAt: string }>;
};

const units: UnitSeed[] = [
  { name: 'Dona', symbol: 'dona' },
  { name: 'Kilogram', symbol: 'kg' },
  { name: 'Litr', symbol: 'l' },
  { name: 'Millilitr', symbol: 'ml' },
];

const categories: CategorySeed[] = [
  {
    name: 'Ichimliklar',
    image: 'https://cdn.fullfood.uz/categories/drinks.png',
  },
  {
    name: 'Burgerlar',
    image: 'https://cdn.fullfood.uz/categories/burgers.png',
  },
  {
    name: 'Pizza',
    image: 'https://cdn.fullfood.uz/categories/pizza.png',
  },
  {
    name: 'Desertlar',
    image: 'https://cdn.fullfood.uz/categories/desserts.png',
  },
];

const products: ProductSeed[] = [
  {
    name: 'Coca Cola 0.5L',
    description: 'Sovuq gazli ichimlik.',
    image: 'https://cdn.fullfood.uz/products/coca-cola-05.png',
    price: 9000,
    categoryName: 'Ichimliklar',
    unitSymbol: 'dona',
    stockBatches: [
      { quantity: 20, receivedAt: '2026-04-08T09:00:00.000Z' },
      { quantity: 32, receivedAt: '2026-04-09T09:00:00.000Z' },
    ],
  },
  {
    name: 'Fanta 0.5L',
    description: "Apelsin ta'mli gazli ichimlik.",
    image: 'https://cdn.fullfood.uz/products/fanta-05.png',
    price: 9000,
    categoryName: 'Ichimliklar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 18, receivedAt: '2026-04-09T11:00:00.000Z' }],
  },
  {
    name: 'Cheeseburger',
    description: "Mol go'shti, cheddar va sous bilan.",
    image: 'https://cdn.fullfood.uz/products/cheeseburger.png',
    price: 32000,
    categoryName: 'Burgerlar',
    unitSymbol: 'dona',
    stockBatches: [
      { quantity: 15, receivedAt: '2026-04-08T10:30:00.000Z' },
      { quantity: 12, receivedAt: '2026-04-09T10:30:00.000Z' },
    ],
  },
  {
    name: 'Double Burger',
    description: 'Ikki qavatli kotlet va pishloq bilan.',
    image: 'https://cdn.fullfood.uz/products/double-burger.png',
    price: 45000,
    categoryName: 'Burgerlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 10, receivedAt: '2026-04-09T12:00:00.000Z' }],
  },
  {
    name: 'Pepperoni Pizza',
    description: 'Pepperoni va mozzarella bilan.',
    image: 'https://cdn.fullfood.uz/products/pepperoni.png',
    price: 70000,
    categoryName: 'Pizza',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 8, receivedAt: '2026-04-09T09:45:00.000Z' }],
  },
  {
    name: 'Margherita Pizza',
    description: 'Pomidor sousi va mozzarella.',
    image: 'https://cdn.fullfood.uz/products/margherita.png',
    price: 65000,
    categoryName: 'Pizza',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 6, receivedAt: '2026-04-08T14:00:00.000Z' }],
  },
  {
    name: 'Tiramisu',
    description: 'Kofe va kremli desert.',
    image: 'https://cdn.fullfood.uz/products/tiramisu.png',
    price: 28000,
    categoryName: 'Desertlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 9, receivedAt: '2026-04-09T15:00:00.000Z' }],
  },
];

async function upsertUnits() {
  for (const unit of units) {
    await prisma.unit.upsert({
      where: { symbol: unit.symbol },
      update: { name: unit.name },
      create: { name: unit.name, symbol: unit.symbol },
    });
  }
}

async function upsertCategories() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { image: category.image },
      create: { name: category.name, image: category.image },
    });
  }
}

async function upsertProducts() {
  const unitBySymbol = new Map(
    (await prisma.unit.findMany()).map((unit) => [unit.symbol, unit]),
  );
  const categoryByName = new Map(
    (await prisma.category.findMany()).map((category) => [
      category.name,
      category,
    ]),
  );

  for (const product of products) {
    const unit = unitBySymbol.get(product.unitSymbol);
    const category = categoryByName.get(product.categoryName);

    if (!unit || !category) {
      continue;
    }

    const totalQuantity = product.stockBatches.reduce(
      (sum, batch) => sum + batch.quantity,
      0,
    );

    const existingProduct = await prisma.product.findFirst({
      where: { name: product.name },
      select: { id: true },
    });

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          description: product.description,
          image: product.image,
          price: product.price,
          categoryId: category.id,
          unitId: unit.id,
          stockQuantity: totalQuantity,
          isActive: totalQuantity > 0,
        },
      });
    } else {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          image: product.image,
          price: product.price,
          categoryId: category.id,
          unitId: unit.id,
          stockQuantity: totalQuantity,
          isActive: totalQuantity > 0,
        },
      });
    }
  }
}

async function createBatches() {
  const productByName = new Map(
    (await prisma.product.findMany()).map((product) => [product.name, product]),
  );

  const staffPhone =
    process.env.SEED_SUPER_ADMIN_PHONE ??
    process.env.SEED_CASHIER_PHONE ??
    null;
  const staffUser = staffPhone
    ? await prisma.user.findUnique({
        where: { phone: normalizeUzbekPhoneNumber(staffPhone) },
      })
    : null;

  for (const product of products) {
    const dbProduct = productByName.get(product.name);

    if (!dbProduct) {
      continue;
    }

    for (const batch of product.stockBatches) {
      await prisma.inventoryBatch.create({
        data: {
          productId: dbProduct.id,
          quantity: batch.quantity,
          receivedAt: new Date(batch.receivedAt),
          createdByStaffId: staffUser?.id ?? null,
        },
      });
    }
  }
}

async function seedStaffUsers() {
  const superAdminPhone = normalizeUzbekPhoneNumber(
    process.env.SEED_SUPER_ADMIN_PHONE ?? '777422302',
  );
  const superAdminPassword =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? '777422302';
  const hashedSuperAdminPassword = await hash(superAdminPassword, 10);

  await prisma.user.upsert({
    where: { phone: superAdminPhone },
    update: {
      role: Role.SUPER_ADMIN,
      password: hashedSuperAdminPassword,
    },
    create: {
      phone: superAdminPhone,
      role: Role.SUPER_ADMIN,
      password: hashedSuperAdminPassword,
      firstName: '-',
      lastName: '-',
    },
  });

  const cashierPhone = normalizeUzbekPhoneNumber(
    process.env.SEED_CASHIER_PHONE ?? '991258875',
  );
  const cashierPassword = process.env.SEED_CASHIER_PASSWORD ?? '12345678';
  const hashedCashierPassword = await hash(cashierPassword, 10);

  await prisma.user.upsert({
    where: { phone: cashierPhone },
    update: {
      role: Role.CASHIER,
      password: hashedCashierPassword,
    },
    create: {
      phone: cashierPhone,
      role: Role.CASHIER,
      password: hashedCashierPassword,
      firstName: '-',
      lastName: '-',
    },
  });
}

async function main() {
  await seedStaffUsers();
  await upsertUnits();
  await upsertCategories();
  await upsertProducts();
  await createBatches();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
