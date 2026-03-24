import { prisma } from './db';

export interface PersonData {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  dateOfBirth?: string | null;
  isDeceased?: boolean;
  education?: string; // Will be populated from related table if available
}

export interface TreeNode {
  person: PersonData;
  spouse: TreeNode | null;
  parents: Array<{ type: 'father' | 'mother'; node: TreeNode }>;
  children: TreeNode[];
}

async function getPerson(personId: string): Promise<PersonData | null> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      gender: true,
      dateOfBirth: true,
      isDeceased: true,
    },
  });

  if (!person) return null;

  // Convert dateOfBirth to string if it's a Date
  const serializedPerson: PersonData = {
    ...person,
    dateOfBirth: person.dateOfBirth instanceof Date ? person.dateOfBirth.toISOString() : person.dateOfBirth,
  };

  return serializedPerson;
}

// Get education for a person based on their role in the tree
async function getEducationForPerson(personId: string, context: {
  familyId?: string;
  isChild?: boolean;
  childRecord?: any;
}): Promise<string | undefined> {
  // If we already have a child record (from being someone's child), use its education
  if (context.childRecord?.education) {
    return context.childRecord.education;
  }

  // Check if this person is a head of a family (has a Family record)
  if (context.familyId) {
    const family = await prisma.family.findUnique({
      where: { id: context.familyId },
      select: { education: true }
    });
    if (family?.education) {
      return family.education;
    }
  }

  // As a fallback, check if this person appears as a child in ANY family
  // This handles cases where someone (like a parent) is listed as a child in their parents' family record
  const childRecord = await prisma.child.findFirst({
    where: { personId: personId },
    select: { education: true },
    orderBy: { createdAt: 'desc' }
  });
  if (childRecord?.education) {
    return childRecord.education;
  }

  return undefined;
}

async function getImmediateFamily(personId: string): Promise<{
  fatherIds: string[];
  motherIds: string[];
  spouseId: string | null;
  childIds: string[];
  // Also return family context for education lookup
  family?: any;
  childRecordsMap: Map<string, any>; // childId -> child record (for education)
}> {
  // Check if this person is a head of a family (only ACCEPTED families)
  const family = await prisma.family.findFirst({
    where: { headPersonId: personId, status: "ACCEPTED" },
    select: {
      id: true,
      fatherId: true,
      motherId: true,
      spouse: { select: { personId: true } },
      children: { select: { personId: true, education: true, id: true } },
    },
  });

  let fatherIds: string[] = [];
  let motherIds: string[] = [];
  let spouseId: string | null = null;
  let childIds: string[] = [];
  let familyContext = family;
  const childRecordsMap = new Map<string, any>();

  if (family) {
    fatherIds = family.fatherId ? [family.fatherId] : [];
    motherIds = family.motherId ? [family.motherId] : [];
    spouseId = family.spouse?.personId || null;
    childIds = family.children
      ? family.children.map(c => c.personId).filter((id): id is string => id != null)
      : [];
    // Build child records map for education lookup
    for (const child of family.children) {
      if (child.personId) {
        childRecordsMap.set(child.personId, child);
      }
    }
  }

  // Also look for parent relationships (where this person is a child)
  // This helps find parents even if person doesn't have their own family record
  const parentRels = await prisma.relationship.findMany({
    where: { childId: personId },
    select: { parentId: true, relationType: true },
  });
  for (const rel of parentRels) {
    if (rel.relationType === 'FATHER' && !fatherIds.includes(rel.parentId)) {
      fatherIds.push(rel.parentId);
    } else if (rel.relationType === 'MOTHER' && !motherIds.includes(rel.parentId)) {
      motherIds.push(rel.parentId);
    }
  }

  // Find families where this person is a parent (father or mother)
  // These families' head persons are this person's children
  const familiesAsParent = await prisma.family.findMany({
    where: {
      OR: [
        { fatherId: personId, status: "ACCEPTED" },
        { motherId: personId, status: "ACCEPTED" }
      ]
    },
    select: {
      fatherId: true,
      motherId: true,
      headPersonId: true
    }
  });

  for (const fam of familiesAsParent) {
    // Add headPerson as a child (if not already present)
    if (fam.headPersonId && !childIds.includes(fam.headPersonId)) {
      childIds.push(fam.headPersonId);
    }
    // Infer spouse from the first family where we have the other parent
    if (!spouseId) {
      if (fam.fatherId === personId && fam.motherId) {
        spouseId = fam.motherId;
      } else if (fam.motherId === personId && fam.fatherId) {
        spouseId = fam.fatherId;
      }
    }
  }

  // Also look for child relationships via relationship table (supplement for children without family records)
  const childRels = await prisma.relationship.findMany({
    where: { parentId: personId },
    select: { childId: true },
  });
  for (const rel of childRels) {
    if (!childIds.includes(rel.childId)) {
      childIds.push(rel.childId);
    }
  }

  // Build child records map from child records (for education)
  // We need to populate it not just from this person's family, but also from the families
  // of their children where this person might be listed as a child? Actually childRecordsMap
  // is used for education lookup on the children of this person. The education for a child
  // comes from the Child record that links the child to THIS person's family. But if this
  // person doesn't have a family record, there won't be child records. However, if they do
  // have a family record, we already built childRecordsMap above.
  // For people without a family record, childRecordsMap will remain empty, which is fine.
  // Their children will have education fetched via fallback.

  return {
    fatherIds: fatherIds.filter(id => id != null),
    motherIds: motherIds.filter(id => id != null),
    spouseId,
    childIds: childIds.filter(id => id != null),
    family: familyContext,
    childRecordsMap,
  };
}

async function buildFamilyTree(
  personId: string,
  ancestorDepth: number,
  descendantDepth: number,
  visited: Set<string>
): Promise<TreeNode | null> {
  if (!personId) {
    return null;
  }
  if (visited.has(personId)) {
    return null; // Already seen this person elsewhere in the tree
  }
  visited.add(personId);

  const person = await getPerson(personId);
  if (!person) {
    return null;
  }

  const familyContext = await getImmediateFamily(personId);

  // Fetch all related persons in batch
  const allRelatedIds = [
    ...familyContext.fatherIds,
    ...familyContext.motherIds,
    familyContext.spouseId,
    ...familyContext.childIds,
  ].filter(id => id != null) as string[];

  const uniqueRelatedIds = Array.from(new Set(allRelatedIds));

  const relatedPersonsMap = new Map<string, PersonData>();
  if (uniqueRelatedIds.length > 0) {
    const related = await prisma.person.findMany({
      where: { id: { in: uniqueRelatedIds } },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        isDeceased: true,
      },
    });
    for (const p of related) {
      const serializedPerson: PersonData = {
        ...p,
        dateOfBirth: p.dateOfBirth instanceof Date ? p.dateOfBirth.toISOString() : p.dateOfBirth,
      };
      relatedPersonsMap.set(p.id, serializedPerson);
    }
  }

  // Get education for this person
  const education = await getEducationForPerson(personId, {
    familyId: familyContext.family?.id,
    childRecord: familyContext.childRecordsMap.get(personId)
  });

  const personWithEducation: PersonData = { ...person, education };

  // Build spouse node
  let spouseNode: TreeNode | null = null;
  if (familyContext.spouseId && relatedPersonsMap.has(familyContext.spouseId)) {
    const spousePerson = relatedPersonsMap.get(familyContext.spouseId)!;

    // Get spouse's education from their own context (only ACCEPTED families)
    const spouseFamily = await prisma.family.findFirst({
      where: { headPersonId: spousePerson.id, status: "ACCEPTED" },
      select: { id: true }
    });
    const spouseEducation = await getEducationForPerson(spousePerson.id, {
      familyId: spouseFamily?.id
    });

    spouseNode = {
      person: { ...spousePerson, education: spouseEducation },
      spouse: null,
      parents: [],
      children: [],
    };

    // Mark spouse as visited to prevent appearing elsewhere (e.g., as a child)
    visited.add(spousePerson.id);
  }

  // Build parent nodes
  const parentNodes: TreeNode['parents'] = [];
  if (ancestorDepth > 0) {
    for (const fatherId of familyContext.fatherIds) {
      const fatherPerson = relatedPersonsMap.get(fatherId);
      if (fatherPerson) {
        // Get father's family for education lookup (only ACCEPTED families)
        const fatherFamily = await prisma.family.findFirst({
          where: { headPersonId: fatherId, status: "ACCEPTED" },
          select: { id: true }
        });
        const fatherEducation = await getEducationForPerson(fatherId, {
          familyId: fatherFamily?.id
        });

        const fatherNode = await buildSubTree(
          fatherId,
          ancestorDepth - 1,
          descendantDepth,
          visited,
          fatherFamily?.id
        );
        if (fatherNode) {
          parentNodes.push({ type: 'father', node: { ...fatherNode, person: { ...fatherNode.person, education: fatherEducation } } });
        }
      }
    }
    for (const motherId of familyContext.motherIds) {
      const motherPerson = relatedPersonsMap.get(motherId);
      if (motherPerson) {
        const motherFamily = await prisma.family.findFirst({
          where: { headPersonId: motherId, status: "ACCEPTED" },
          select: { id: true }
        });
        const motherEducation = await getEducationForPerson(motherId, {
          familyId: motherFamily?.id
        });

        const motherNode = await buildSubTree(
          motherId,
          ancestorDepth - 1,
          descendantDepth,
          visited,
          motherFamily?.id
        );
        if (motherNode) {
          parentNodes.push({ type: 'mother', node: { ...motherNode, person: { ...motherNode.person, education: motherEducation } } });
        }
      }
    }
  }

  // Build child nodes
  const childNodes: TreeNode['children'] = [];
  if (descendantDepth > 0) {
    for (const childId of familyContext.childIds) {
      const childPerson = relatedPersonsMap.get(childId);
      if (childPerson) {
        // Get child's education from the child record in this family context
        const childRecord = familyContext.childRecordsMap.get(childId);
        const childEducation = await getEducationForPerson(childId, {
          childRecord
        });

        const childNode = await buildSubTree(
          childId,
          ancestorDepth,
          descendantDepth - 1,
          visited
        );
        if (childNode) {
          childNodes.push({ ...childNode, person: { ...childNode.person, education: childEducation } });
        }
      }
    }
  }

  return {
    person: personWithEducation,
    spouse: spouseNode,
    parents: parentNodes,
    children: childNodes,
  };
}

// Wrapper with optional familyId parameter for context
async function buildSubTree(
  personId: string,
  ancestorDepth: number,
  descendantDepth: number,
  visited: Set<string>,
  familyId?: string
): Promise<TreeNode | null> {
  // For sub-trees, we need to pass family context if available
  // We'll fetch it inside buildFamilyTree when needed
  return buildFamilyTree(personId, ancestorDepth, descendantDepth, visited);
}

export async function getFamilyTree(
  personId: string,
  ancestorDepth: number = 3,
  descendantDepth: number = 3
): Promise<TreeNode | null> {
  if (!personId) {
    console.error("getFamilyTree called with empty personId");
    return null;
  }
  const visited = new Set<string>();
  return buildFamilyTree(personId, ancestorDepth, descendantDepth, visited);
}
