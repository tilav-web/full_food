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
    image:
      'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd76?w=400&h=400&fit=crop',
  },
  {
    name: 'Burgerlar',
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
  },
  {
    name: 'Pizza',
    image:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
  },
  {
    name: 'Lavash',
    image:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=400&fit=crop',
  },
  {
    name: 'Hot-dog',
    image:
      'https://images.unsplash.com/photo-1612392062422-ef19b42f4a46?w=400&h=400&fit=crop',
  },
  {
    name: 'Salatlar',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop',
  },
  {
    name: 'Desertlar',
    image:
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=400&fit=crop',
  },
  {
    name: 'Garnirlar',
    image:
      'https://images.unsplash.com/photo-1585672840563-f2af2ced55c9?w=400&h=400&fit=crop',
  },
];

const products: ProductSeed[] = [
  // ── Ichimliklar ──
  {
    name: 'Coca-Cola 0.5L',
    description: 'Klassik sovuq gazli ichimlik.',
    image:
      'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop',
    price: 9000,
    categoryName: 'Ichimliklar',
    unitSymbol: 'dona',
    stockBatches: [
      { quantity: 48, receivedAt: '2026-04-07T09:00:00.000Z' },
      { quantity: 24, receivedAt: '2026-04-10T09:00:00.000Z' },
    ],
  },
  {
    name: 'Fanta 0.5L',
    description: "Apelsin ta'mli gazli ichimlik.",
    image:
      'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=400&fit=crop',
    price: 9000,
    categoryName: 'Ichimliklar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 36, receivedAt: '2026-04-09T11:00:00.000Z' }],
  },
  {
    name: 'Sprite 0.5L',
    description: "Limon-laym ta'mli gazli ichimlik.",
    image:
      'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop',
    price: 9000,
    categoryName: 'Ichimliklar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 30, receivedAt: '2026-04-09T11:00:00.000Z' }],
  },
  {
    name: 'Limonad 0.4L',
    description: "Uyda tayyorlangan limon va yalpiz bilan sovuq ichimlik.",
    image:
      'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=400&fit=crop',
    price: 15000,
    categoryName: 'Ichimliklar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 20, receivedAt: '2026-04-10T08:00:00.000Z' }],
  },
  {
    name: 'Mojito (alkogolsiz)',
    description: "Yalpiz, laim va gazli suv bilan tayyorlangan sovuq kokteyl.",
    image:
      'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop',
    price: 18000,
    categoryName: 'Ichimliklar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 15, receivedAt: '2026-04-10T08:00:00.000Z' }],
  },

  // ── Burgerlar ──
  {
    name: 'Classic Burger',
    description:
      "Yangi pishirilgan kotlet, salat bargi, pomidor va maxsus sous bilan.",
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
    price: 28000,
    categoryName: 'Burgerlar',
    unitSymbol: 'dona',
    stockBatches: [
      { quantity: 20, receivedAt: '2026-04-08T10:30:00.000Z' },
      { quantity: 15, receivedAt: '2026-04-10T10:30:00.000Z' },
    ],
  },
  {
    name: 'Cheeseburger',
    description: "Mol go'shti kotleti, cheddar pishloq va achchiq sous.",
    image:
      'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=400&fit=crop',
    price: 32000,
    categoryName: 'Burgerlar',
    unitSymbol: 'dona',
    stockBatches: [
      { quantity: 18, receivedAt: '2026-04-08T10:30:00.000Z' },
      { quantity: 12, receivedAt: '2026-04-10T10:30:00.000Z' },
    ],
  },
  {
    name: 'Double Burger',
    description:
      "Ikki qavatli mol go'shti kotleti, pishloq va barbekyu sous.",
    image:
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=400&fit=crop',
    price: 45000,
    categoryName: 'Burgerlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 10, receivedAt: '2026-04-09T12:00:00.000Z' }],
  },
  {
    name: 'Chicken Burger',
    description: "Qarsildoq tovuq filesi, kol-slou va mayo sous bilan.",
    image:
      'https://images.unsplash.com/photo-1615297928064-24977384d0da?w=400&h=400&fit=crop',
    price: 30000,
    categoryName: 'Burgerlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 14, receivedAt: '2026-04-10T11:00:00.000Z' }],
  },

  // ── Pizza ──
  {
    name: 'Pepperoni Pizza',
    description: "Pepperoni kolbasa va mozzarella pishloq bilan.",
    image:
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=400&fit=crop',
    price: 70000,
    categoryName: 'Pizza',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 12, receivedAt: '2026-04-09T09:45:00.000Z' }],
  },
  {
    name: 'Margherita Pizza',
    description: "Pomidor sousi, mozzarella va yangi rayhon barglari.",
    image:
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=400&fit=crop',
    price: 60000,
    categoryName: 'Pizza',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 8, receivedAt: '2026-04-08T14:00:00.000Z' }],
  },
  {
    name: 'BBQ Chicken Pizza',
    description: "Barbekyu sousli tovuq, piyoz halqalari va mozzarella.",
    image:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
    price: 75000,
    categoryName: 'Pizza',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 6, receivedAt: '2026-04-10T10:00:00.000Z' }],
  },
  {
    name: 'Four Cheese Pizza',
    description:
      "Mozzarella, gorgonzola, parmezan va cheddar pishloqlari bilan.",
    image:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
    price: 72000,
    categoryName: 'Pizza',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 7, receivedAt: '2026-04-10T10:00:00.000Z' }],
  },

  // ── Lavash ──
  {
    name: 'Tovuqli Lavash',
    description: "Tovuq filesi, sabzavotlar va sarimsoqli sous bilan.",
    image:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=400&fit=crop',
    price: 25000,
    categoryName: 'Lavash',
    unitSymbol: 'dona',
    stockBatches: [
      { quantity: 20, receivedAt: '2026-04-09T08:00:00.000Z' },
      { quantity: 15, receivedAt: '2026-04-10T08:00:00.000Z' },
    ],
  },
  {
    name: "Go'shtli Lavash",
    description: "Mol go'shti, sabzavotlar va achchiq sous bilan o'ralgan.",
    image:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=400&fit=crop',
    price: 30000,
    categoryName: 'Lavash',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 18, receivedAt: '2026-04-10T08:00:00.000Z' }],
  },
  {
    name: 'Mix Lavash',
    description:
      "Tovuq va mol go'shti aralashmasi, pishloq va barbekyu sous.",
    image:
      'https://images.unsplash.com/photo-1561651188-d207bbec4ec3?w=400&h=400&fit=crop',
    price: 35000,
    categoryName: 'Lavash',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 12, receivedAt: '2026-04-10T08:00:00.000Z' }],
  },

  // ── Hot-dog ──
  {
    name: 'Classic Hot-dog',
    description: "Sosiska, ketchup va gorchitsa bilan.",
    image:
      'https://images.unsplash.com/photo-1612392062422-ef19b42f4a46?w=400&h=400&fit=crop',
    price: 18000,
    categoryName: 'Hot-dog',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 25, receivedAt: '2026-04-09T09:00:00.000Z' }],
  },
  {
    name: 'Cheese Hot-dog',
    description: "Sosiska, eritilgan pishloq va jalapeño bilan.",
    image:
      'https://images.unsplash.com/photo-1619740455993-9d701c01be9e?w=400&h=400&fit=crop',
    price: 22000,
    categoryName: 'Hot-dog',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 20, receivedAt: '2026-04-10T09:00:00.000Z' }],
  },

  // ── Salatlar ──
  {
    name: 'Sezar Salat',
    description:
      "Tovuq filesi, salat bargi, krutonlar va parmezan sous bilan.",
    image:
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=400&fit=crop',
    price: 32000,
    categoryName: 'Salatlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 10, receivedAt: '2026-04-10T07:00:00.000Z' }],
  },
  {
    name: 'Grek Salati',
    description: "Bodring, pomidor, zaytun, feta pishloq va zaytun moyi.",
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop',
    price: 28000,
    categoryName: 'Salatlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 8, receivedAt: '2026-04-10T07:00:00.000Z' }],
  },

  // ── Desertlar ──
  {
    name: 'Tiramisu',
    description: "Italyan kofe va maskarpone kremli klassik desert.",
    image:
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=400&fit=crop',
    price: 28000,
    categoryName: 'Desertlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 12, receivedAt: '2026-04-09T15:00:00.000Z' }],
  },
  {
    name: 'Chocolate Fondant',
    description: "Issiq shokoladli kek, ichida oqib chiquvchi shokolad.",
    image:
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=400&fit=crop',
    price: 32000,
    categoryName: 'Desertlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 8, receivedAt: '2026-04-10T14:00:00.000Z' }],
  },
  {
    name: 'Cheesecake',
    description: "Kremli pishloqli desert, yong'oqli taglik bilan.",
    image:
      'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400&h=400&fit=crop',
    price: 30000,
    categoryName: 'Desertlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 6, receivedAt: '2026-04-10T14:00:00.000Z' }],
  },

  // ── Garnirlar ──
  {
    name: 'Fri Kartoshka',
    description: "Qarsildoq qilib qovurilgan kartoshka, tuz bilan.",
    image:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop',
    price: 15000,
    categoryName: 'Garnirlar',
    unitSymbol: 'dona',
    stockBatches: [
      { quantity: 30, receivedAt: '2026-04-09T10:00:00.000Z' },
      { quantity: 20, receivedAt: '2026-04-10T10:00:00.000Z' },
    ],
  },
  {
    name: 'Chicken Nuggets (6 dona)',
    description: "Qarsildoq tovuq bo'laklari, sous bilan.",
    image:
      'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=400&fit=crop',
    price: 22000,
    categoryName: 'Garnirlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 15, receivedAt: '2026-04-10T10:00:00.000Z' }],
  },
  {
    name: "Piyoz Halqalari",
    description: "Qarsildoq qovurilgan piyoz halqalari, ranch sous bilan.",
    image:
      'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=400&fit=crop',
    price: 18000,
    categoryName: 'Garnirlar',
    unitSymbol: 'dona',
    stockBatches: [{ quantity: 12, receivedAt: '2026-04-10T10:00:00.000Z' }],
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
