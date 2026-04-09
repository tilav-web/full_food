import { PrismaClient, Role } from '@prisma/client';
import { normalizeUzbekPhoneNumber } from '../src/users/phone.util';

const prisma = new PrismaClient();

async function main() {
  const phone = normalizeUzbekPhoneNumber('777422302');

  await prisma.user.upsert({
    where: { phone },
    update: {
      role: Role.SUPER_ADMIN,
    },
    create: {
      phone,
      role: Role.SUPER_ADMIN,
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
