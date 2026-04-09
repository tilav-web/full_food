import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { normalizeUzbekPhoneNumber } from '../src/users/phone.util';

const prisma = new PrismaClient();

async function main() {
  const phone = normalizeUzbekPhoneNumber('777422302');
  const hashedPassword = await hash(
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? '777422302',
    10,
  );

  await prisma.user.upsert({
    where: { phone },
    update: {
      role: Role.SUPER_ADMIN,
      password: hashedPassword,
    },
    create: {
      phone,
      role: Role.SUPER_ADMIN,
      password: hashedPassword,
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
