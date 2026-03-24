#!/usr/bin/env ts-node

/**
 * CLEANUP SCRIPT: Drop old name columns after migration verification
 *
 * ⚠️  WARNING: This is irreversible!
 * Only run after you've verified:
 * - All data correctly migrated
 * - Application works with new split-name fields + Person model
 * - No code depends on old columns
 *
 * Usage:
 *   ts-node scripts/cleanup-old-columns.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('Starting cleanup of old name columns...');
  console.log('⚠️  This operation CANNOT be undone!');
  console.log('Press Ctrl+C to abort within 5 seconds...');

  // Wait 5 seconds for user to abort
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Drop columns from families
    console.log('Dropping old columns from families...');
    await prisma.$executeRaw`
      ALTER TABLE "families"
      DROP COLUMN IF EXISTS "headFullName",
      DROP COLUMN IF EXISTS "fatherName",
      DROP COLUMN IF EXISTS "motherName";
    `;

    // Drop columns from spouses
    console.log('Dropping old columns from spouses...');
    await prisma.$executeRaw`
      ALTER TABLE "spouses"
      DROP COLUMN IF EXISTS "fullName",
      DROP COLUMN IF EXISTS "fatherName",
      DROP COLUMN IF EXISTS "motherName";
    `;

    // Drop columns from children
    console.log('Dropping old columns from children...');
    await prisma.$executeRaw`
      ALTER TABLE "children"
      DROP COLUMN IF EXISTS "fullName";
    `;

    console.log('✅ Cleanup complete! Old name columns removed.');
    console.log('You should now update your Prisma schema to remove these fields:');
    console.log('  - families: headFullName, fatherName, motherName');
    console.log('  - spouses: fullName, fatherName, motherName');
    console.log('  - children: fullName');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
