import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ChildInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  personId?: string;
  gender: string;
  education?: string;
};

// GET - Retrieve family data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const family = await prisma.family.findUnique({
      where: { userId: session.user.id },
      include: {
        headPerson: true,
        fatherPerson: true,
        motherPerson: true,
        spouse: true,
        children: {
          include: { person: true }
        },
      },
    });

    if (!family) {
      return NextResponse.json(
        { error: "No family record found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ family });
  } catch (error) {
    console.error("Get family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create family record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      // Head fields
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      headPersonId,
      // Father fields
      fatherFirstName,
      fatherMiddleName,
      fatherLastName,
      fatherDateOfBirth,
      fatherId,
      // Mother fields
      motherFirstName,
      motherMiddleName,
      motherLastName,
      motherDateOfBirth,
      motherId,
      // Other family fields
      education,
      occupationType,
      occupationLocation,
      gender,
      maritalStatus,
      spouse,
      children,
    } = body;

    if (!firstName?.trim() || !lastName?.trim() || !gender || !maritalStatus) {
      return NextResponse.json(
        { error: "Missing required fields (head first name and last name are required)" },
        { status: 400 }
      );
    }

    const existingFamily = await prisma.family.findUnique({
      where: { userId: session.user.id },
    });

    if (existingFamily) {
      return NextResponse.json(
        { error: "Family record already exists. Use update to modify." },
        { status: 400 }
      );
    }

    const family = await prisma.$transaction(async (tx) => {
      // Create Person records for father, mother, head, spouse, and children if they don't have personId
      let createdFatherPersonId = fatherId;
      let createdMotherPersonId = motherId;
      let createdHeadPersonId = headPersonId;

      // Create head Person if needed
      if (firstName && lastName && !headPersonId) {
        const headPerson = await tx.person.create({
          data: {
            firstName,
            middleName: middleName || undefined,
            lastName,
            gender: "Male",
            dateOfBirth: dateOfBirth || undefined,
            isDeceased: false
          }
        });
        createdHeadPersonId = headPerson.id;
      }

      // Create father Person if needed
      if (fatherFirstName && fatherLastName && !fatherId) {
        const fatherPerson = await tx.person.create({
          data: {
            firstName: fatherFirstName,
            middleName: fatherMiddleName || undefined,
            lastName: fatherLastName,
            gender: "Male",
            dateOfBirth: fatherDateOfBirth || undefined,
            isDeceased: false
          }
        });
        createdFatherPersonId = fatherPerson.id;
      }

      // Create mother Person if needed
      if (motherFirstName && motherLastName && !motherId) {
        const motherPerson = await tx.person.create({
          data: {
            firstName: motherFirstName,
            middleName: motherMiddleName || undefined,
            lastName: motherLastName,
            gender: "Female",
            dateOfBirth: motherDateOfBirth || undefined,
            isDeceased: false
          }
        });
        createdMotherPersonId = motherPerson.id;
      }

      const newFamily = await tx.family.create({
        data: {
          userId: session.user.id,
          // Head
          firstName,
          middleName,
          lastName,
          headPersonId: createdHeadPersonId || undefined,
          // Father
          fatherFirstName: fatherFirstName || undefined,
          fatherMiddleName: fatherMiddleName || undefined,
          fatherLastName: fatherLastName || undefined,
          fatherId: createdFatherPersonId || undefined,
          // Mother
          motherFirstName: motherFirstName || undefined,
          motherMiddleName: motherMiddleName || undefined,
          motherLastName: motherLastName || undefined,
          motherId: createdMotherPersonId || undefined,
          // Other
          education,
          occupationType,
          occupationLocation,
          gender: "Male", // Force head to be male
          maritalStatus,
          status: "PENDING", // All new registrations are pending
        },
      });

      // Create spouse Person if needed and prepare spouse data
      let createdSpousePersonId = spouse?.personId;
      if (maritalStatus === "Married" && spouse && spouse.firstName && spouse.lastName && !spouse.personId) {
        const spousePerson = await tx.person.create({
          data: {
            firstName: spouse.firstName,
            middleName: spouse.middleName || undefined,
            lastName: spouse.lastName,
            gender: "Female",
            dateOfBirth: spouse.dateOfBirth || undefined,
            isDeceased: spouse.isDeceased || false
          }
        });
        createdSpousePersonId = spousePerson.id;
      }

      if (maritalStatus === "Married" && spouse) {
        await tx.spouse.create({
          data: {
            familyId: newFamily.id,
            firstName: spouse.firstName,
            middleName: spouse.middleName,
            lastName: spouse.lastName,
            personId: createdSpousePersonId || undefined,
            fatherFirstName: spouse.fatherFirstName || undefined,
            fatherMiddleName: spouse.fatherMiddleName || undefined,
            fatherLastName: spouse.fatherLastName || undefined,
            motherFirstName: spouse.motherFirstName || undefined,
            motherMiddleName: spouse.motherMiddleName || undefined,
            motherLastName: spouse.motherLastName || undefined,
            education: spouse.education,
            occupationType: spouse.occupationType,
            occupationLocation: spouse.occupationLocation,
            gender: "Female", // Force spouse to be female
            isDeceased: spouse.isDeceased || false,
          },
        });
      }

      let childrenWithPersonIds: { personId?: string; [key: string]: any }[] = [];
      if (children && children.length > 0) {
        // Create Person records for children who don't have personId
        childrenWithPersonIds = await Promise.all(
          (children as ChildInput[]).map(async (child) => {
            let childPersonId = child.personId;
            if (child.firstName && child.lastName && !child.personId) {
              const childPerson = await tx.person.create({
                data: {
                  firstName: child.firstName,
                  middleName: child.middleName || undefined,
                  lastName: child.lastName,
                  gender: child.gender,
                  dateOfBirth: child.dateOfBirth || undefined,
                  isDeceased: false
                }
              });
              childPersonId = childPerson.id;
            }
            return {
              ...child,
              personId: childPersonId
            };
          })
        );

        await tx.child.createMany({
          data: childrenWithPersonIds.map((child) => ({
            familyId: newFamily.id,
            firstName: child.firstName,
            middleName: child.middleName || undefined,
            lastName: child.lastName,
            personId: child.personId || undefined,
            gender: child.gender,
            education: child.education,
          })),
        });
      }

      // Build list of relationships to create
      const relationshipsToCreate: { parentId: string; childId: string; relationType: 'FATHER' | 'MOTHER' }[] = [];

      // Helper to add parent-child relationship if both exist
      const addParentChildRelation = (parentId: string | null | undefined, childId: string | null | undefined, relationType: 'FATHER' | 'MOTHER') => {
        if (parentId && childId) {
          relationshipsToCreate.push({ parentId, childId, relationType });
        }
      };

      // 1. Head's parents: Father -> Head, Mother -> Head
      addParentChildRelation(createdFatherPersonId, createdHeadPersonId, 'FATHER');
      addParentChildRelation(createdMotherPersonId, createdHeadPersonId, 'MOTHER');

      // 2. Head as parent to children (if head exists and children exist)
      // Determine head's relation type based on gender (head is typically male, but use stored gender)
      const headRelationType: 'FATHER' | 'MOTHER' = newFamily.gender === 'Female' ? 'MOTHER' : 'FATHER';
      for (const child of childrenWithPersonIds) {
        addParentChildRelation(createdHeadPersonId, child.personId, headRelationType);
      }

      // 3. Spouse as parent to children (if spouse exists and children exist)
      // Spouse gender: if provided use it, else default to 'Female' (since spouse is often female)
      const spouseGender = spouse?.gender || 'Female';
      const spouseRelationType: 'FATHER' | 'MOTHER' = spouseGender === 'Female' ? 'MOTHER' : 'FATHER';
      for (const child of childrenWithPersonIds) {
        addParentChildRelation(createdSpousePersonId, child.personId, spouseRelationType);
      }

      // Create all relationships, ignoring duplicate key errors
      if (relationshipsToCreate.length > 0) {
        for (const rel of relationshipsToCreate) {
          try {
            await tx.relationship.create({
              data: rel
            });
          } catch (e: any) {
            // Ignore duplicate key errors (P2002) - relationship already exists
            if (!e.code || e.code !== 'P2002') {
              throw e;
            }
          }
        }
      }

      return newFamily;
    });

    return NextResponse.json(
      { message: "Family created successfully", family },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update family record
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      // Head fields
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      headPersonId,
      // Father fields
      fatherFirstName,
      fatherMiddleName,
      fatherLastName,
      fatherDateOfBirth,
      fatherId,
      // Mother fields
      motherFirstName,
      motherMiddleName,
      motherLastName,
      motherDateOfBirth,
      motherId,
      // Other family fields
      education,
      occupationType,
      occupationLocation,
      gender,
      maritalStatus,
      spouse,
      children,
    } = body;

    // Normalize date strings to ISO-8601 format
    const normalizeDate = (dateStr: string | undefined) => {
      if (!dateStr) return null;
      try {
        // If already ISO string, this will be idempotent
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch {
        return null;
      }
    };

    const normalizedHeadDOB = normalizeDate(dateOfBirth);
    const normalizedFatherDOB = normalizeDate(fatherDateOfBirth);
    const normalizedMotherDOB = normalizeDate(motherDateOfBirth);
    const normalizedSpouseDOB = spouse?.dateOfBirth !== undefined ? normalizeDate(spouse.dateOfBirth) : undefined;

    if (!firstName?.trim() || !lastName?.trim() || !gender || !maritalStatus) {
      return NextResponse.json(
        { error: "Missing required fields (head first name and last name are required)" },
        { status: 400 }
      );
    }

    const existingFamily = await prisma.family.findUnique({
      where: { userId: session.user.id },
      include: {
        headPerson: true,
        fatherPerson: true,
        motherPerson: true,
        spouse: true,
        children: {
          include: { person: true }
        },
      },
    });

    if (!existingFamily) {
      return NextResponse.json(
        { error: "Family record not found" },
        { status: 404 }
      );
    }

    const updatedFamily = await prisma.$transaction(async (tx) => {
      // Capture old family data for relationship cleanup
      const oldHeadPersonId = existingFamily.headPersonId;
      const oldFatherId = existingFamily.fatherId;
      const oldMotherId = existingFamily.motherId;
      const oldSpousePersonId = existingFamily.spouse?.personId;
      const oldChildrenPersonIds = existingFamily.children
        .map(c => c.personId)
        .filter((id): id is string => id != null);

      // Create Person records for head, father, mother if needed
      let createdHeadPersonId = headPersonId || existingFamily.headPersonId;
      let createdFatherPersonId = fatherId || existingFamily.fatherId;
      let createdMotherPersonId = motherId || existingFamily.motherId;

      // Create head Person if needed and head name is provided
      if (firstName && lastName && !headPersonId && !existingFamily.headPersonId) {
        const headPerson = await tx.person.create({
          data: {
            firstName,
            middleName: middleName || undefined,
            lastName,
            gender: "Male",
            dateOfBirth: normalizedHeadDOB,
            isDeceased: false
          }
        });
        createdHeadPersonId = headPerson.id;
      }

      // Create father Person if needed and father name is provided
      if (fatherFirstName && fatherLastName && !fatherId && !existingFamily.fatherId) {
        const fatherPerson = await tx.person.create({
          data: {
            firstName: fatherFirstName,
            middleName: fatherMiddleName || undefined,
            lastName: fatherLastName,
            gender: "Male",
            dateOfBirth: normalizedFatherDOB,
            isDeceased: false
          }
        });
        createdFatherPersonId = fatherPerson.id;
      }

      // Create mother Person if needed and mother name is provided
      if (motherFirstName && motherLastName && !motherId && !existingFamily.motherId) {
        const motherPerson = await tx.person.create({
          data: {
            firstName: motherFirstName,
            middleName: motherMiddleName || undefined,
            lastName: motherLastName,
            gender: "Female",
            dateOfBirth: normalizedMotherDOB,
            isDeceased: false
          }
        });
        createdMotherPersonId = motherPerson.id;
      }

      // Update existing Person records with new dateOfBirth if provided
      // Head
      if (dateOfBirth !== undefined) {
        await tx.person.update({
          where: { id: createdHeadPersonId },
          data: { dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null }
        });
      }
      // Father
      if (fatherDateOfBirth !== undefined && createdFatherPersonId) {
        await tx.person.update({
          where: { id: createdFatherPersonId },
          data: { dateOfBirth: fatherDateOfBirth ? new Date(fatherDateOfBirth).toISOString() : null }
        });
      }
      // Mother
      if (motherDateOfBirth !== undefined && createdMotherPersonId) {
        await tx.person.update({
          where: { id: createdMotherPersonId },
          data: { dateOfBirth: motherDateOfBirth ? new Date(motherDateOfBirth).toISOString() : null }
        });
      }

      const family = await tx.family.update({
        where: { id: existingFamily.id },
        data: {
          // Head
          firstName,
          middleName,
          lastName,
          headPersonId: createdHeadPersonId || undefined,
          // Father
          fatherFirstName: fatherFirstName || undefined,
          fatherMiddleName: fatherMiddleName || undefined,
          fatherLastName: fatherLastName || undefined,
          fatherId: createdFatherPersonId || undefined,
          // Mother
          motherFirstName: motherFirstName || undefined,
          motherMiddleName: motherMiddleName || undefined,
          motherLastName: motherLastName || undefined,
          motherId: createdMotherPersonId || undefined,
          // Other
          education,
          occupationType,
          occupationLocation,
          maritalStatus,
          // Do NOT allow gender or status to be changed via user PUT
        },
      });

      // Handle spouse: create Person if needed, then create/update Spouse record
      let createdSpousePersonId = spouse?.personId || existingFamily.spouse?.personId;

      if (maritalStatus === "Married" && spouse && spouse.firstName && spouse.lastName && !spouse.personId && !existingFamily.spouse?.personId) {
        const spousePerson = await tx.person.create({
          data: {
            firstName: spouse.firstName,
            middleName: spouse.middleName || undefined,
            lastName: spouse.lastName,
            gender: "Female",
            dateOfBirth: normalizedSpouseDOB,
            isDeceased: spouse.isDeceased || false
          }
        });
        createdSpousePersonId = spousePerson.id;
      }

      if (maritalStatus === "Married" && spouse) {
        if (existingFamily.spouse) {
          await tx.spouse.update({
            where: { id: existingFamily.spouse.id },
            data: {
              firstName: spouse.firstName,
              middleName: spouse.middleName,
              lastName: spouse.lastName,
              personId: createdSpousePersonId || undefined,
              fatherFirstName: spouse.fatherFirstName || undefined,
              fatherMiddleName: spouse.fatherMiddleName || undefined,
              fatherLastName: spouse.fatherLastName || undefined,
              motherFirstName: spouse.motherFirstName || undefined,
              motherMiddleName: spouse.motherMiddleName || undefined,
              motherLastName: spouse.motherLastName || undefined,
              education: spouse.education,
              occupationType: spouse.occupationType,
              occupationLocation: spouse.occupationLocation,
              // gender: "Female", // Already set, don't change
            },
          });
        } else {
          await tx.spouse.create({
            data: {
              familyId: family.id,
              firstName: spouse.firstName,
              middleName: spouse.middleName,
              lastName: spouse.lastName,
              personId: createdSpousePersonId || undefined,
              fatherFirstName: spouse.fatherFirstName || undefined,
              fatherMiddleName: spouse.fatherMiddleName || undefined,
              fatherLastName: spouse.fatherLastName || undefined,
              motherFirstName: spouse.motherFirstName || undefined,
              motherMiddleName: spouse.motherMiddleName || undefined,
              motherLastName: spouse.motherLastName || undefined,
              education: spouse.education,
              occupationType: spouse.occupationType,
              occupationLocation: spouse.occupationLocation,
              gender: "Female", // Force female
              isDeceased: spouse.isDeceased || false,
            },
          });
        }

        // Update spouse Person's dateOfBirth if existing and provided (including clearing)
        if (spouse.personId && spouse.dateOfBirth !== undefined) {
          const normalizedDate = spouse.dateOfBirth ? new Date(spouse.dateOfBirth).toISOString() : null;
          await tx.person.update({
            where: { id: createdSpousePersonId },
            data: { dateOfBirth: normalizedDate }
          });
        }
      } else if (existingFamily.spouse) {
        await tx.spouse.delete({
          where: { id: existingFamily.spouse.id },
        });
      }

      let childrenWithPersonIds: { personId?: string; [key: string]: any }[] = [];
      if (children && children.length > 0) {
        await tx.child.deleteMany({
          where: { familyId: family.id },
        });

        // Create Person records for children who don't have personId
        childrenWithPersonIds = await Promise.all(
          children.map(async (child: { firstName: string; middleName?: string; lastName: string; dateOfBirth?: string; personId?: string; gender: string; education?: string }) => {
            let childPersonId = child.personId;
            if (child.firstName && child.lastName && !child.personId) {
              const childPerson = await tx.person.create({
                data: {
                  firstName: child.firstName,
                  middleName: child.middleName || undefined,
                  lastName: child.lastName,
                  gender: child.gender,
                  dateOfBirth: child.dateOfBirth || undefined,
                  isDeceased: false
                }
              });
              childPersonId = childPerson.id;
            }
            return {
              ...child,
              personId: childPersonId
            };
          })
        );

        await tx.child.createMany({
          data: childrenWithPersonIds.map((child) => ({
            familyId: family.id,
            firstName: child.firstName,
            middleName: child.middleName || undefined,
            lastName: child.lastName,
            personId: child.personId || undefined,
            gender: child.gender,
            education: child.education,
          })),
        });

        // Update existing child Person records with new dateOfBirth if provided (including clearing)
        for (const child of childrenWithPersonIds) {
          if (child.personId && child.dateOfBirth !== undefined) {
            const normalizedDate = child.dateOfBirth ? new Date(child.dateOfBirth).toISOString() : null;
            await tx.person.update({
              where: { id: child.personId },
              data: { dateOfBirth: normalizedDate }
            });
          }
        }
      }

      // Cleanup old relationships and create new ones
      // 1. Delete old parent-child relationships that are being replaced
      if (oldHeadPersonId) {
        if (oldFatherId) {
          await tx.relationship.deleteMany({
            where: { parentId: oldFatherId, childId: oldHeadPersonId }
          });
        }
        if (oldMotherId) {
          await tx.relationship.deleteMany({
            where: { parentId: oldMotherId, childId: oldHeadPersonId }
          });
        }
      }

      if (oldSpousePersonId && oldChildrenPersonIds.length > 0) {
        await tx.relationship.deleteMany({
          where: {
            parentId: oldSpousePersonId,
            childId: { in: oldChildrenPersonIds }
          }
        });
      }

      if (oldHeadPersonId && oldChildrenPersonIds.length > 0) {
        await tx.relationship.deleteMany({
          where: {
            parentId: oldHeadPersonId,
            childId: { in: oldChildrenPersonIds }
          }
        });
      }

      // 2. Create new relationships
      const relationshipsToCreate: { parentId: string; childId: string; relationType: 'FATHER' | 'MOTHER' }[] = [];

      const addParentChildRelation = (parentId: string | null | undefined, childId: string | null | undefined, relationType: 'FATHER' | 'MOTHER') => {
        if (parentId && childId) relationshipsToCreate.push({ parentId, childId, relationType });
      };

      // New head's parents
      if (createdHeadPersonId) {
        if (createdFatherPersonId) {
          addParentChildRelation(createdFatherPersonId, createdHeadPersonId, 'FATHER');
        }
        if (createdMotherPersonId) {
          addParentChildRelation(createdMotherPersonId, createdHeadPersonId, 'MOTHER');
        }
      }

      // Head's children
      if (createdHeadPersonId && childrenWithPersonIds.length > 0) {
        const headRelationType: 'FATHER' | 'MOTHER' = family.gender === 'Female' ? 'MOTHER' : 'FATHER';
        for (const child of childrenWithPersonIds) {
          if (child.personId) {
            addParentChildRelation(createdHeadPersonId, child.personId, headRelationType);
          }
        }
      }

      // Spouse's children
      if (createdSpousePersonId && childrenWithPersonIds.length > 0) {
        const spouseRelationType: 'FATHER' | 'MOTHER' = 'MOTHER';
        for (const child of childrenWithPersonIds) {
          if (child.personId) {
            addParentChildRelation(createdSpousePersonId, child.personId, spouseRelationType);
          }
        }
      }

      // Create relationships (ignore duplicates)
      for (const rel of relationshipsToCreate) {
        try {
          await tx.relationship.create({ data: rel });
        } catch (e: any) {
          if (!e.code || e.code !== 'P2002') throw e;
        }
      }

      return family;
    });

    // Fetch the updated family with all relations for response
    const fullFamily = await prisma.family.findUnique({
      where: { id: existingFamily.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        headPerson: true,
        fatherPerson: true,
        motherPerson: true,
        spouse: true,
        children: {
          include: {
            person: true
          }
        },
      },
    });

    return NextResponse.json({
      message: "Family updated successfully",
      family: fullFamily,
    });
  } catch (error) {
    console.error("Update family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
