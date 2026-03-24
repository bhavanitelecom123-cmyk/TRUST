#!/usr/bin/env ts-node

/**
 * VERIFICATION SCRIPT: Check data migration results
 *
 * Run this after migrate-data.ts to verify all data was migrated correctly.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying migration...\n');

  // Count records
  const familyCount = await prisma.family.count();
  const spouseCount = await prisma.spouse.count();
  const childCount = await prisma.child.count();
  const personCount = await prisma.person.count();
  const relationshipCount = await prisma.relationship.count();

  console.log('📊 Record counts:');
  console.log(`  Families: ${familyCount}`);
  console.log(`  Spouses: ${spouseCount}`);
  console.log(`  Children: ${childCount}`);
  console.log(`  Persons: ${personCount}`);
  console.log(`  Relationships: ${relationshipCount}`);
  console.log('');

  // Check that all families have headPersonId
  const familiesWithoutHead = await prisma.family.count({
    where: { headPersonId: null }
  });
  if (familiesWithoutHead > 0) {
    console.warn(`⚠️  ${familiesWithoutHead} families missing headPersonId`);
  } else {
    console.log('✅ All families have headPersonId');
  }

  // Check that all children have personId
  const childrenWithoutPerson = await prisma.child.count({
    where: { personId: null }
  });
  if (childrenWithoutPerson > 0) {
    console.warn(`⚠️  ${childrenWithoutPerson} children missing personId`);
  } else {
    console.log('✅ All children have personId');
  }

  // Check that all spouses have personId (if any spouses exist)
  if (spouseCount > 0) {
    const spousesWithoutPerson = await prisma.spouse.count({
      where: { personId: null }
    });
    if (spousesWithoutPerson > 0) {
      console.warn(`⚠️  ${spousesWithoutPerson} spouses missing personId`);
    } else {
      console.log('✅ All spouses have personId');
    }
  }

  // Check relationship coverage
  const familiesWithChildren = await prisma.family.count({
    where: { children: { some: {} } }
  });
  const expectedChildRelationships = familiesWithChildren * 2; // head + spouse per child family
  // Actually we need to compute properly
  const childrenWithParents = await prisma.relationship.count({
    where: { relationType: 'FATHER' } // count father relationships, not perfect
  });
  console.log(`\n🔗 Relationships:`);
  console.log(`  Children that should have 2 parents each: ${await countChildrenWithTwoParents()}`);
  console.log('');

  // Sample some data
  console.log('📋 Sample Person records:');
  const samplePersons = await prisma.person.findMany({
    take: 3,
    select: { id: true, firstName: true, lastName: true, gender: true }
  });
  console.log(samplePersons);

  console.log('\n✅ Verification complete!');
}

async function countChildrenWithTwoParents(): Promise<number> {
  // Count children who have both FATHER and MOTHER relationships
  const children = await prisma.child.findMany({
    select: {
      personId: true,
      relationships: {
        where: { relationType: { in: ['FATHER', 'MOTHER'] } }
      }
    }
  });

  return children.filter(c => c.relationships.length >= 2).length;
}

verify()
  .catch(e => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
