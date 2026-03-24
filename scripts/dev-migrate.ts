#!/usr/bin/env ts-node

/**
 * DEV-ONLY MIGRATION SCRIPT
 *
 * This script runs the FULL migration in order:
 * 1. Apply additive migration
 * 2. Run data migration
 * 3. Apply constraint migration
 *
 * ⚠️  WARNING: For development only!
 * Do NOT use in production without testing.
 * Backup your database first!
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const MIGRATIONS_DIR = 'migrations';
const ADDITIVE_SQL = `${MIGRATIONS_DIR}/upgrade_to_person_model_additive.sql`;
const CONSTRAINTS_SQL = `${MIGRATIONS_DIR}/upgrade_to_person_model_constraints.sql`;
const DATA_MIGRATION_SCRIPT = 'scripts/migrate-data.ts';

function runCommand(command: string, description: string) {
  console.log(`\n>>> ${description}`);
  console.log(`$ ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed!`);
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Starting full migration process...');
  console.log('⚠️  Make sure you have a database backup!');
  console.log('');
  console.log('Steps:');
  console.log('  1. Apply additive migration (new tables/columns)');
  console.log('  2. Run data migration (populate Person records)');
  console.log('  3. Apply constraints (foreign keys)');
  console.log('');
  console.log('Press Ctrl+C to abort, or wait 5 seconds to continue...');

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 1: Apply additive SQL
  if (!existsSync(ADDITIVE_SQL)) {
    console.error(`❌ Missing file: ${ADDITIVE_SQL}`);
    process.exit(1);
  }
  runCommand(`psql -h localhost -U postgres -d postgres -f ${ADDITIVE_SQL}`, 'Applying additive migration');

  // Step 2: Update Prisma schema and generate client
  runCommand('cp prisma/schema-upgraded.prisma prisma/schema.prisma', 'Copying upgraded schema');
  runCommand('npx prisma generate', 'Generating Prisma client');

  // Step 3: Run data migration script
  if (!existsSync(DATA_MIGRATION_SCRIPT)) {
    console.error(`❌ Missing file: ${DATA_MIGRATION_SCRIPT}`);
    process.exit(1);
  }
  runCommand('ts-node ' + DATA_MIGRATION_SCRIPT, 'Running data migration');

  // Step 4: Apply constraint SQL
  if (!existsSync(CONSTRAINTS_SQL)) {
    console.error(`❌ Missing file: ${CONSTRAINTS_SQL}`);
    process.exit(1);
  }
  runCommand(`psql -h localhost -U postgres -d postgres -f ${CONSTRAINTS_SQL}`, 'Applying constraints');

  console.log('\n✅ Migration complete!');
  console.log('\nNext steps:');
  console.log('  1. Test the application thoroughly');
  console.log('  2. Review if old columns can be dropped (see scripts/cleanup-old-columns.ts)');
  console.log('  3. Update any code that still uses old fullName fields');
}

main().catch(error => {
  console.error('Migration script error:', error);
  process.exit(1);
});
