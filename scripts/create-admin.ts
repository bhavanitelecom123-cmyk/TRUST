import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@caste.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Admin already exists, updating role to ADMIN and marking email verified...');
    const updated = await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        emailVerified: new Date(),
        // If user has no password (e.g., was OTP-only), set one
        ...(existing.password ? {} : { password: hashedPassword })
      }
    });
    console.log('Admin updated:', updated);
    await prisma.$disconnect();
    process.exit(0);
  }

  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(), // Admin emails auto-verified
    },
  });

  console.log('Admin created:', admin);
  await prisma.$disconnect();
}

createAdmin().catch((e) => {
  console.error(e);
  process.exit(1);
});
