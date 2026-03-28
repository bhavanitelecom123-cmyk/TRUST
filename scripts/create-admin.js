const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
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
          ...(existing.password ? {} : { password: hashedPassword })
        }
      });
      console.log('Admin updated:', updated);
    } else {
      const admin = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      console.log('Admin created:', admin);
      console.log('\n=== ADMIN CREDENTIALS ===');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('========================\n');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
