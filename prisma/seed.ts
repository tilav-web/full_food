import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { normalizeUzbekPhoneNumber } from '../src/users/phone.util';

const prisma = new PrismaClient();

async function main() {
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
