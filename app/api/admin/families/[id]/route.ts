import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT - Update any family (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { id: familyId } = await params;
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

    // Check if family exists
    const existingFamily = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        headPerson: true,
        fatherPerson: true,
        motherPerson: true,
        spouse: true,
        children: { include: { person: true } },
      },
    });

    if (!existingFamily) {
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }

    // Perform update in transaction
    const updatedFamily = await prisma.$transaction(async (tx) => {
      let createdHeadPersonId = headPersonId || existingFamily.headPersonId;
      let createdFatherPersonId = fatherId || existingFamily.fatherId;
      let createdMotherPersonId = motherId || existingFamily.motherId;
      let createdSpousePersonId = spouse?.personId || existingFamily.spouse?.personId;

      // Create/update head Person if needed
      if (firstName && lastName) {
        if (headPersonId) {
          // Update existing head person
          await tx.person.update({
            where: { id: headPersonId },
            data: {
              firstName,
              middleName: middleName || undefined,
              lastName,
              gender: "Male",
              dateOfBirth: normalizedHeadDOB,
            },
          });
        } else if (!existingFamily.headPersonId) {
          // Create new head person
          const headPerson = await tx.person.create({
            data: {
              firstName,
              middleName: middleName || undefined,
              lastName,
              gender: "Male",
              dateOfBirth: normalizedHeadDOB,
              isDeceased: false,
            },
          });
          createdHeadPersonId = headPerson.id;
        }
      }

      // Create/update father Person if needed
      if (fatherFirstName && fatherLastName) {
        if (fatherId) {
          await tx.person.update({
            where: { id: fatherId },
            data: {
              firstName: fatherFirstName,
              middleName: fatherMiddleName || undefined,
              lastName: fatherLastName,
              gender: "Male",
              dateOfBirth: normalizedFatherDOB,
            },
          });
        } else if (!existingFamily.fatherId) {
          const fatherPerson = await tx.person.create({
            data: {
              firstName: fatherFirstName,
              middleName: fatherMiddleName || undefined,
              lastName: fatherLastName,
              gender: "Male",
              dateOfBirth: normalizedFatherDOB,
              isDeceased: false,
            },
          });
          createdFatherPersonId = fatherPerson.id;
        }
      }

      // Create/update mother Person if needed
      if (motherFirstName && motherLastName) {
        if (motherId) {
          await tx.person.update({
            where: { id: motherId },
            data: {
              firstName: motherFirstName,
              middleName: motherMiddleName || undefined,
              lastName: motherLastName,
              gender: "Female",
              dateOfBirth: normalizedMotherDOB,
            },
          });
        } else if (!existingFamily.motherId) {
          const motherPerson = await tx.person.create({
            data: {
              firstName: motherFirstName,
              middleName: motherMiddleName || undefined,
              lastName: motherLastName,
              gender: "Female",
              dateOfBirth: normalizedMotherDOB,
              isDeceased: false,
            },
          });
          createdMotherPersonId = motherPerson.id;
        }
      }

      // Update family record
      const family = await tx.family.update({
        where: { id: familyId },
        data: {
          firstName: firstName || existingFamily.firstName,
          middleName: middleName || undefined,
          lastName: lastName || existingFamily.lastName,
          headPersonId: createdHeadPersonId || undefined,
          fatherFirstName: fatherFirstName || undefined,
          fatherMiddleName: fatherMiddleName || undefined,
          fatherLastName: fatherLastName || undefined,
          fatherId: createdFatherPersonId || undefined,
          motherFirstName: motherFirstName || undefined,
          motherMiddleName: motherMiddleName || undefined,
          motherLastName: motherLastName || undefined,
          motherId: createdMotherPersonId || undefined,
          education,
          occupationType,
          occupationLocation,
          maritalStatus,
        },
      });

      // Handle spouse
      if (maritalStatus === "Married" && spouse) {
        if (spouse.personId) {
          // Update spouse person
          await tx.person.update({
            where: { id: spouse.personId },
            data: {
              firstName: spouse.firstName,
              middleName: spouse.middleName || undefined,
              lastName: spouse.lastName,
              gender: "Female",
              dateOfBirth: normalizedSpouseDOB,
            },
          });
          createdSpousePersonId = spouse.personId;
        } else {
          // Create new spouse person
          const spousePerson = await tx.person.create({
            data: {
              firstName: spouse.firstName,
              middleName: spouse.middleName || undefined,
              lastName: spouse.lastName,
              gender: "Female",
              dateOfBirth: normalizedSpouseDOB,
              isDeceased: false,
            },
          });
          createdSpousePersonId = spousePerson.id;
        }

        // Create/update spouse record
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
              isDeceased: spouse.isDeceased || false,
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
              gender: "Female",
              isDeceased: spouse.isDeceased || false,
            },
          });
        }
      } else if (existingFamily.spouse) {
        // Remove spouse if not married anymore
        await tx.spouse.delete({ where: { id: existingFamily.spouse.id } });
        // Also optionally mark spouse person as not linked? We'll keep person record.
      }

      // Handle children
      if (children && children.length > 0) {
        // Delete existing children records
        await tx.child.deleteMany({ where: { familyId: family.id } });

        // Process each child
        for (const child of children) {
          let childPersonId = child.personId;

          if (child.firstName && child.lastName && !child.personId) {
            const childPerson = await tx.person.create({
              data: {
                firstName: child.firstName,
                middleName: child.middleName || undefined,
                lastName: child.lastName,
                gender: child.gender,
                dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString() : null,
                isDeceased: false,
              },
            });
            childPersonId = childPerson.id;
          } else if (child.personId && child.dateOfBirth) {
            // Update existing child person's DOB
            await tx.person.update({
              where: { id: child.personId },
              data: { dateOfBirth: new Date(child.dateOfBirth).toISOString() },
            });
          }

          // Create child record
          if (childPersonId) {
            await tx.child.create({
              data: {
                familyId: family.id,
                firstName: child.firstName,
                middleName: child.middleName || undefined,
                lastName: child.lastName,
                personId: childPersonId,
                gender: child.gender,
                education: child.education,
              },
            });
          }
        }
      }

      return family;
    });

    // Fetch the updated family with all relations for response
    const fullFamily = await prisma.family.findUnique({
      where: { id: familyId },
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
    console.error("Admin update family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
