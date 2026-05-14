import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const login = process.env.SUPER_ADMIN_LOGIN ?? 'admin';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'admin12345';

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    console.log(`Super admin "${login}" already exists`);
    return;
  }

  await prisma.user.create({
    data: {
      login,
      passwordHash: await argon2.hash(password),
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`Created super admin "${login}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
