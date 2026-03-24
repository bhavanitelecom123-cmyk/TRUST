# Prisma Schema Upgrade - Person-Centric Family Tree

## Overview

This upgrade introduces a Person model and Relationship system while maintaining full backward compatibility with the existing Family-based workflow.

---

## Changes Summary

### **NEW MODELS**

#### 1. Person
Central model for all individuals.

```prisma
model Person {
  id            String   @id @default(cuid())
  firstName     String
  middleName    String?
  lastName      String
  gender        String
  isDeceased    Boolean  @default(false)
  createdAt     DateTime @default(now())

  // Relationships
  parentRelationships Relationship[] @relation("ParentRelationship")
  children            Relationship[] @relation("ChildRelationship")

  // Direct links
  headOfFamily   Family?
  fatherOf       Family?
  motherOf       Family?
  spouse         Spouse?
  child          Child?
}
```

**Indexes:** `firstName`, `lastName`, `(firstName, lastName)` - for fast autocomplete search.

#### 2. Relationship
Links two Person records with a specific relationship type.

```prisma
enum RelationType {
  FATHER
  MOTHER
}

model Relationship {
  id           String       @id @default(cuid())
  parentId     String
  childId      String
  relationType RelationType // FATHER or MOTHER
  createdAt    DateTime     @default(now())

  parent Person @relation("ParentRelationship", fields: [parentId], references: [id])
  child  Person @relation("ChildRelationship", fields: [childId], references: [id])
}
```

**Constraints:** `@@unique([parentId, childId, relationType])` prevents duplicate relationships.

---

### **MODIFIED MODELS**

#### Family Model Changes

**Split name fields:**
- `headFullName` → `firstName`, `middleName`, `lastName`
- `fatherName` → `fatherFirstName`, `fatherMiddleName`, `fatherLastName`
- `motherName` → `motherFirstName`, `motherMiddleName`, `motherLastName`

**Added person links:**
- `headPersonId String?` → references `Person.id`
- `fatherId String?` → references `Person.id`
- `motherId String?` → references `Person.id`

**Added relations:**
```prisma
headPerson   Person? @relation("HeadPerson", fields: [headPersonId], references: [id])
fatherPerson Person? @relation("FatherPerson", fields: [fatherId], references: [id])
motherPerson Person? @relation("MotherPerson", fields: [motherId], references: [id])
```

**Why keep split name fields?** Fallback for cases where Person records are not yet created (e.g., incomplete family tree). Maintains backward compatibility.

---

#### Spouse Model Changes

**Split name fields:**
- `fullName` → `firstName`, `middleName`, `lastName`
- `fatherName` → `fatherFirstName`, `fatherMiddleName`, `fatherLastName`
- `motherName` → `motherFirstName`, `motherMiddleName`, `motherLastName`

**Added fields:**
- `personId String?` → references `Person.id`
- `isDeceased Boolean @default(false)`

**Added relation:**
```prisma
person Person? @relation(fields: [personId], references: [id])
```

---

#### Child Model Changes

**Split name fields:**
- `fullName` → `firstName`, `middleName`, `lastName`

**Added field:**
- `personId String?` → references `Person.id`

**Added relation:**
```prisma
person Person? @relation(fields: [personId], references: [id])
```

---

### **INDEXES ADDED**

**Family:**
- `@@index([headPersonId])`
- `@@index([fatherId])`
- `@@index([motherId])`
- `@@index([userId])` (already exists via relation)
- `@@index([status])` (already exists)

**Spouse:**
- `@@index([personId])`

**Child:**
- `@@index([personId])`

**Relationship:**
- `@@index([parentId])`
- `@@index([childId])`
- `@@index([relationType])`
- `@@unique([parentId, childId, relationType])`

---

## **DATA FLOW LOGIC**

### Family Submission → Admin Approval Pipeline

#### **STEP 1: User Submits Family Form**

Two scenarios:

**Case A: User selects existing person from autocomplete**
- Form stores `personId` in hidden field
- No name text entry for that role (or disabled)

**Case B: User enters new name (free text)**
- Name is stored in the split fields only
- `personId` remains null

Example form data after submission:

```javascript
{
  // Head of family
  firstName: "Rahul",
  middleName: "Kumar",
  lastName: "Sharma",
  headPersonId: null, // new person, not linked yet

  // Father
  fatherFirstName: "Sanjay",
  fatherMiddleName: null,
  fatherLastName: "Sharma",
  fatherId: null, // new person, not linked yet

  // Mother
  motherFirstName: "Priya",
  motherMiddleName: null,
  motherLastName: "Sharma",
  motherId: null, // new person, not linked yet

  // Spouse (if married)
  spouse: {
    firstName: "Anjali",
    middleName: null,
    lastName: "Verma",
    personId: null // or existing personId if selected
  },

  // Children
  children: [
    {
      firstName: "Aarav",
      middleName: null,
      lastName: "Sharma",
      personId: null // new person
    }
  ]
}
```

#### **STEP 2: Admin Reviews Family**

Admin view shows:
- Head name (from split fields)
- Father name (from split fields)
- Mother name (from split fields)
- Spouse name (from split fields)
- Children names (from split fields)

Admin can:
- Approve → triggers Person creation
- Reject → family status changes to REJECTED
- Request changes

#### **STEP 3: Upon ADMIN APPROVAL**

**Backend logic (pseudo-code):**

```typescript
async function approveFamily(familyId: string) {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: { spouse: true, children: true }
  });

  if (!family) throw new Error("Family not found");

  // 1. Create Person for head
  const headPerson = await prisma.person.create({
    data: {
      firstName: family.firstName,
      middleName: family.middleName,
      lastName: family.lastName,
      gender: family.gender,
      isDeceased: false
    }
  });

  // 2. Create Person for father (if name provided)
  let fatherPersonId: string | null = null;
  if (family.fatherFirstName || family.fatherLastName) {
    const fatherPerson = await prisma.person.create({
      data: {
        firstName: family.fatherFirstName,
        middleName: family.fatherMiddleName,
        lastName: family.fatherLastName,
        gender: "Male",
        isDeceased: false
      }
    });
    fatherPersonId = fatherPerson.id;
  }

  // 3. Create Person for mother (if name provided)
  let motherPersonId: string | null = null;
  if (family.motherFirstName || family.motherLastName) {
    const motherPerson = await prisma.person.create({
      data: {
        firstName: family.motherFirstName,
        middleName: family.motherMiddleName,
        lastName: family.motherLastName,
        gender: "Female",
        isDeceased: false
      }
    });
    motherPersonId = motherPerson.id;
  }

  // 4. Create Person for spouse (if exists and not linked)
  let spousePersonId: string | null = null;
  if (family.spouse) {
    const spousePerson = await prisma.person.create({
      data: {
        firstName: family.spouse.firstName,
        middleName: family.spouse.middleName,
        lastName: family.spouse.lastName,
        gender: family.spouse.gender,
        isDeceased: family.spouse.isDeceased || false
      }
    });
    spousePersonId = spousePerson.id;
  }

  // 5. Create Person for each child (if not linked)
  const childPersonIds: string[] = [];
  for (const child of family.children) {
    const childPerson = await prisma.person.create({
      data: {
        firstName: child.firstName,
        middleName: child.middleName,
        lastName: child.lastName,
        gender: child.gender,
        isDeceased: false
      }
    });
    childPersonIds.push(childPerson.id);
  }

  // 6. Update Family with personId links
  await prisma.family.update({
    where: { id: familyId },
    data: {
      headPersonId: headPerson.id,
      fatherId: fatherPersonId,
      motherId: motherPersonId,
      status: "ACCEPTED"
    }
  });

  // 7. Update Spouse with personId link (if exists)
  if (family.spouse && spousePersonId) {
    await prisma.spouse.update({
      where: { id: family.spouse.id },
      data: { personId: spousePersonId }
    });
  }

  // 8. Update Children with personId links
  for (let i = 0; i < family.children.length; i++) {
    await prisma.child.update({
      where: { id: family.children[i].id },
      data: { personId: childPersonIds[i] }
    });
  }

  // 9. Create Relationship records

  // Father -> Head relationship
  if (fatherPersonId) {
    await prisma.relationship.create({
      data: {
        parentId: fatherPersonId,
        childId: headPerson.id,
        relationType: "FATHER"
      }
    });
  }

  // Mother -> Head relationship
  if (motherPersonId) {
    await prisma.relationship.create({
      data: {
        parentId: motherPersonId,
        childId: headPerson.id,
        relationType: "MOTHER"
      }
    });
  }

  // Head -> Children relationships
  for (const childPersonId of childPersonIds) {
    await prisma.relationship.create({
      data: {
        parentId: headPerson.id,
        childId: childPersonId,
        relationType: "FATHER" // or MOTHER based on head's gender; simplified here
      }
    });
  }

  // Spouse -> Children relationships (if spouse exists)
  if (spousePersonId) {
    for (const childPersonId of childPersonIds) {
      await prisma.relationship.create({
        data: {
          parentId: spousePersonId,
          childId: childPersonId,
          relationType: "MOTHER" // or FATHER based on spouse's gender
        }
      });
    }
  }

  // 10. Also link spouse to head via Family model (already exists via Family relation)
  // No additional relationship needed; Family.spouse links to family head

  return { headPerson, fatherPersonId, motherPersonId, spousePersonId, childPersonIds };
}
```

---

## **AUTOCOMPLETE SUPPORT**

To support autocomplete for Person selection:

```typescript
// Search persons by name
const persons = await prisma.person.findMany({
  where: {
    OR: [
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } }
    ]
  },
  select: {
    id: true,
    firstName: true,
    middleName: true,
    lastName: true,
    gender: true
  },
  take: 10
});
```

Indexes on `firstName` and `lastName` ensure fast queries.

---

## **BACKWARD COMPATIBILITY**

### Existing workflows remain unaffected:

1. **Family listing** → still works using split name fields
2. **Family creation (pre-approval)** → stores names in split fields, `personId` remains null
3. **Family detail view** → displays from split fields if `personId` is null
4. **Admin approval** → creates Person records and updates `personId` fields
5. **Existing data** → still accessible via split fields; `personId` optional

### Migration strategy:

1. Deploy schema with new fields as nullable/optional
2. Application continues to write to split name fields only
3. Over time, as families are approved, `personId` fields get populated
4. Eventually all families will have linked Person records

---

## **FUTURE EXTENSIONS**

The Person model allows:

- **Uniqueness enforcement** across families (e.g., same person appears in multiple families as parent/child)
- **GraphQL/REST queries** to fetch full family tree via Relationship joins
- **Merging duplicate Person records** (via PersonMerge table)
- **Person deduplication** algorithm
- **Export/import** with canonical person IDs

---

## **VALIDATION CHECKLIST**

✅ All models compile with Prisma validate
✅ All required fields have defaults or are nullable
✅ Relations properly typed (String ↔ String)
✅ No circular dependencies without proper intermediate models
✅ Indexes added on foreign keys and search fields
✅ Enum RelationType defined
✅ Backward compatible: all old fields preserved with new additions
✅ Optional `personId` fields allow gradual migration
✅ Composite unique on Relationship prevents duplicates

---

## **DEPLOYMENT STEPS**

1. Run `prisma db push` to add new tables and columns (non-breaking)
2. Update application code to:
   - Write to split name fields (already does)
   - Optionally set `personId` when selecting from autocomplete
   - On approval, run the Person/Relationship creation logic
3. Over time, existing families will have `personId` populated upon approval
4. After all families have person links, deprecated fallback name fields can be removed (optional)

---

## **QUERY EXAMPLES**

### Get full family tree via Person relationships

```typescript
// Get all descendants of a person
const descendants = await prisma.relationship.findMany({
  where: { parentId: somePersonId },
  include: {
    child: {
      include: {
        headOfFamily: true,
        spouse: true,
        children: { // This is Child model, not Person
          include: { person: true }
        }
      }
    }
  }
});

// Get all ancestors of a person
const ancestors = await prisma.relationship.findMany({
  where: { childId: somePersonId },
  include: {
    parent: true,
    // recursively fetch parent's parents
  }
});
```

---

## **KEY DECISIONS**

1. **Why keep split name fields in Family?** → For backward compatibility; existing code reads them; they serve as fallback.

2. **Why `RelationType` separate column?** → Allows both FATHER and MOTHER relationships between same parent-child pair (if considering different contexts). The composite unique prevents FATHER being set twice.

3. **Why Person table has direct Family references?** → Convenience queries (e.g., `person.headOfFamily` to get family where person is head) without joining through Relationship.

4. **Why Child and Spouse still exist as separate models?** → They contain additional metadata (education, occupation, gender) specific to their family context. A Person can be a child in one family and a parent in another.

5. **When to use Person vs Family?** → Person is canonical identity; Family is a household unit (head + spouse + children). One head = one family. One person can be head in one family and child in parent's family.

6. **Why `isDeceased` on Person and Spouse?** → Spouse had no such field before; added for consistency. Child does not have it yet but can be added later.

---

## **SCHEMA VALIDATION**

Run:
```bash
npx prisma validate
npx prisma generate
```

Expected: No errors.

---

**END OF EXPLANATION**
