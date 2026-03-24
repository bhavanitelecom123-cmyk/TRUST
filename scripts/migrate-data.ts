import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to split full name into first, middle, last
function splitName(fullName: string | null | undefined): { first: string; middle: string | null; last: string } {
  if (!fullName || fullName.trim() === '') {
    return { first: 'Unknown', middle: null, last: 'Unknown' };
  }

  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return { first: parts[0], middle: null, last: 'Unknown' };
  }

  if (parts.length === 2) {
    return { first: parts[0], middle: null, last: parts[1] };
  }

  // More than 2 parts: first is first, last is last, everything else is middle
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1]
  };
}

async function migrate() {
  console.log('Starting data migration...');

  // 1. Migrate Families - create Person for head, father, mother
  console.log('Migrating families...');
  const families = await prisma.family.findMany({
    include: { spouse: true, children: true }
  });

  let stats = { families: 0, heads: 0, fathers: 0, mothers: 0, spouses: 0, children: 0, relationships: 0 };

  for (const family of families) {
    stats.families++;

    // Skip if head already has personId (idempotent check)
    if (family.headPersonId) {
      console.log(`Family ${family.id} already migrated (headPersonId exists), skipping...`);
      continue;
    }

    // Split head fullName
    const headName = splitName(family.headFullName);

    // Create Person for head
    const headPerson = await prisma.person.create({
      data: {
        firstName: headName.first,
        middleName: headName.middle,
        lastName: headName.last,
        gender: family.gender,
        isDeceased: false
      }
    });
    stats.heads++;

    // Update family with headPersonId and split name fields
    await prisma.family.update({
      where: { id: family.id },
      data: {
        headPersonId: headPerson.id,
        firstName: headName.first,
        middleName: headName.middle,
        lastName: headName.last
      }
    });

    // Handle father
    let fatherPersonId: string | null = null;
    if (family.fatherName && !family.fatherId) {
      const fatherName = splitName(family.fatherName);
      const fatherPerson = await prisma.person.create({
        data: {
          firstName: fatherName.first,
          middleName: fatherName.middle,
          lastName: fatherName.last,
          gender: 'Male',
          isDeceased: false
        }
      });
      fatherPersonId = fatherPerson.id;
      stats.fathers++;

      await prisma.family.update({
        where: { id: family.id },
        data: {
          fatherId: fatherPersonId,
          fatherFirstName: fatherName.first,
          fatherMiddleName: fatherName.middle,
          fatherLastName: fatherName.last
        }
      });

      // Create relationship: Father -> Head
      await prisma.relationship.create({
        data: {
          parentId: fatherPersonId,
          childId: headPerson.id,
          relationType: 'FATHER'
        }
      });
      stats.relationships++;
    } else if (family.fatherId) {
      // Already migrated
      fatherPersonId = family.fatherId;
    }

    // Handle mother
    let motherPersonId: string | null = null;
    if (family.motherName && !family.motherId) {
      const motherName = splitName(family.motherName);
      const motherPerson = await prisma.person.create({
        data: {
          firstName: motherName.first,
          middleName: motherName.middle,
          lastName: motherName.last,
          gender: 'Female',
          isDeceased: false
        }
      });
      motherPersonId = motherPerson.id;
      stats.mothers++;

      await prisma.family.update({
        where: { id: family.id },
        data: {
          motherId: motherPersonId,
          motherFirstName: motherName.first,
          motherMiddleName: motherName.middle,
          motherLastName: motherName.last
        }
      });

      // Create relationship: Mother -> Head
      await prisma.relationship.create({
        data: {
          parentId: motherPersonId,
          childId: headPerson.id,
          relationType: 'MOTHER'
        }
      });
      stats.relationships++;
    } else if (family.motherId) {
      motherPersonId = family.motherId;
    }

    // Handle spouse
    if (family.spouse && !family.spouse.personId) {
      const spouse = family.spouse;
      const spouseName = splitName(spouse.fullName);

      const spousePerson = await prisma.person.create({
        data: {
          firstName: spouseName.first,
          middleName: spouseName.middle,
          lastName: spouseName.last,
          gender: spouse.gender || 'Female',
          isDeceased: spouse.isDeceased || false
        }
      });
      stats.spouses++;

      // Update spouse record with split fields and personId
      await prisma.spouse.update({
        where: { id: spouse.id },
        data: {
          personId: spousePerson.id,
          firstName: spouseName.first,
          middleName: spouseName.middle,
          lastName: spouseName.last,
          fatherFirstName: spouse.fatherName ? splitName(spouse.fatherName).first : null,
          fatherMiddleName: spouse.fatherName ? splitName(spouse.fatherName).middle : null,
          fatherLastName: spouse.fatherName ? splitName(spouse.fatherName).last : null,
          motherFirstName: spouse.motherName ? splitName(spouse.motherName).first : null,
          motherMiddleName: spouse.motherName ? splitName(spouse.motherName).middle : null,
          motherLastName: spouse.motherName ? splitName(spouse.motherName).last : null,
          isDeceased: spouse.isDeceased || false
        }
      });
    }

    // Handle children
    const children = await prisma.child.findMany({
      where: { familyId: family.id }
    });

    for (const child of children) {
      if (child.personId) {
        continue; // Already migrated
      }

      const childName = splitName(child.fullName);

      const childPerson = await prisma.person.create({
        data: {
          firstName: childName.first,
          middleName: childName.middle,
          lastName: childName.last,
          gender: child.gender,
          isDeceased: false
        }
      });
      stats.children++;

      // Update child record with split fields and personId
      await prisma.child.update({
        where: { id: child.id },
        data: {
          personId: childPerson.id,
          firstName: childName.first,
          middleName: childName.middle,
          lastName: childName.last
        }
      });

      // Create relationship: Head -> Child
      await prisma.relationship.create({
        data: {
          parentId: headPerson.id,
          childId: childPerson.id,
          relationType: family.gender === 'Female' ? 'MOTHER' : 'FATHER'
        }
      });
      stats.relationships++;

      // Create relationship: Spouse -> Child (if spouse exists and has personId)
      if (family.spouse?.personId) {
        await prisma.relationship.create({
          data: {
            parentId: family.spouse.personId,
            childId: childPerson.id,
            relationType: family.spouse.gender === 'Female' ? 'MOTHER' : 'FATHER'
          }
        });
        stats.relationships++;
      }
    }
  }

  console.log('Migration statistics:');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`Total families processed: ${stats.families}`);
  console.log('Data migration complete!');
}

migrate()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
