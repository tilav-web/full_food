import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑  Bazadagi malumotlarni tozalash boshlandi...');

  const orderItems = await prisma.orderItem.deleteMany();
  console.log(`   - OrderItem: ${orderItems.count} ta o'chirildi`);

  const orders = await prisma.order.deleteMany();
  console.log(`   - Order: ${orders.count} ta o'chirildi`);

  const cartItems = await prisma.cartItem.deleteMany();
  console.log(`   - CartItem: ${cartItems.count} ta o'chirildi`);

  const batches = await prisma.inventoryBatch.deleteMany();
  console.log(`   - InventoryBatch: ${batches.count} ta o'chirildi`);

  const products = await prisma.product.deleteMany();
  console.log(`   - Product: ${products.count} ta o'chirildi`);

  const categories = await prisma.category.deleteMany();
  console.log(`   - Category: ${categories.count} ta o'chirildi`);

  const units = await prisma.unit.deleteMany();
  console.log(`   - Unit: ${units.count} ta o'chirildi`);

  const userCount = await prisma.user.count();
  console.log(`\n✅ Tayyor. ${userCount} ta user saqlanib qoldi.`);
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
