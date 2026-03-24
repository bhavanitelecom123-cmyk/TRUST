import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch a specific family (by familyId) for verifier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "VERIFIER") {
      return NextResponse.json(
        { error: "Forbidden - Verifier access required" },
        { status: 403 }
      );
    }

    const { familyId } = await params;

    // Fetch family with all necessary relationships
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdBy: true,
          },
        },
        headPerson: true,
        fatherPerson: true,
        motherPerson: true,
        spouse: {
          include: {
            person: true,
          },
        },
        children: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!family) {
      return NextResponse.json(
        { error: "Family not found" },
        { status: 404 }
      );
    }

    // Verify that the family belongs to a user created by this verifier
    if (family.user.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only access families of users you created" },
        { status: 403 }
      );
    }

    // Convert dates to strings for serialization
    const serializeDate = (date: any) => {
      if (date instanceof Date) return date.toISOString();
      return date || null;
    };

    const familyWithStringDates = {
      ...family,
      createdAt: serializeDate(family.createdAt),
      updatedAt: serializeDate(family.updatedAt),
      headPerson: family.headPerson ? {
        ...family.headPerson,
        dateOfBirth: serializeDate(family.headPerson.dateOfBirth),
      } : null,
      fatherPerson: family.fatherPerson ? {
        ...family.fatherPerson,
        dateOfBirth: serializeDate(family.fatherPerson.dateOfBirth),
      } : null,
      motherPerson: family.motherPerson ? {
        ...family.motherPerson,
        dateOfBirth: serializeDate(family.motherPerson.dateOfBirth),
      } : null,
      spouse: family.spouse ? {
        ...family.spouse,
        person: family.spouse.person ? {
          ...family.spouse.person,
          dateOfBirth: serializeDate(family.spouse.person.dateOfBirth),
        } : null,
      } : null,
      children: family.children.map((child: any) => ({
        ...child,
        person: child.person ? {
          ...child.person,
          dateOfBirth: serializeDate(child.person.dateOfBirth),
        } : null,
      })),
    };

    return NextResponse.json({ family: familyWithStringDates });
  } catch (error) {
    console.error("Verifier GET family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update family (only if PENDING and belongs to verifier's user)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "VERIFIER") {
      return NextResponse.json(
        { error: "Forbidden - Verifier access required" },
        { status: 403 }
      );
    }

    const { familyId } = await params;
    const { data } = await request.json();

    // Fetch existing family with user relationship
    const existingFamily = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        user: true,
        spouse: true,
        children: true,
      },
    });

    if (!existingFamily) {
      return NextResponse.json(
        { error: "Family not found" },
        { status: 404 }
      );
    }

    // Verify family belongs to a user created by this verifier
    if (existingFamily.user.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only update families of users you created" },
        { status: 403 }
      );
    }

    // Verify family status is PENDING (verifier can only edit pending families)
    if (existingFamily.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot edit family - status is not PENDING. Only pending families can be edited by verifiers." },
        { status: 403 }
      );
    }

    // Perform update in transaction
    const updatedFamily = await prisma.$transaction(async (tx) => {
      // Update family fields
      const family = await tx.family.update({
        where: { id: familyId },
        data: {
          // Head fields
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.middleName !== undefined && { middleName: data.middleName }),
          ...(data.lastName && { lastName: data.lastName }),
          // Father fields
          ...(data.fatherFirstName && { fatherFirstName: data.fatherFirstName }),
          ...(data.fatherMiddleName !== undefined && { fatherMiddleName: data.fatherMiddleName }),
          ...(data.fatherLastName && { fatherLastName: data.fatherLastName }),
          ...(data.fatherId && { fatherId: data.fatherId }),
          // Mother fields
          ...(data.motherFirstName && { motherFirstName: data.motherFirstName }),
          ...(data.motherMiddleName !== undefined && { motherMiddleName: data.motherMiddleName }),
          ...(data.motherLastName && { motherLastName: data.motherLastName }),
          ...(data.motherId && { motherId: data.motherId }),
          // Other fields
          ...(data.education && { education: data.education }),
          ...(data.occupationType && { occupationType: data.occupationType }),
          ...(data.occupationLocation && { occupationLocation: data.occupationLocation }),
          ...(data.maritalStatus && { maritalStatus: data.maritalStatus }),
          // Note: status stays PENDING until admin reviews
        },
      });

      // Handle spouse updates if provided
      if (data.spouse !== undefined) {
        if (existingFamily.spouse) {
          if (data.spouse) {
            // Update existing spouse
            await tx.spouse.update({
              where: { id: existingFamily.spouse.id },
              data: {
                firstName: data.spouse.firstName,
                middleName: data.spouse.middleName,
                lastName: data.spouse.lastName,
                fatherFirstName: data.spouse.fatherFirstName,
                fatherMiddleName: data.spouse.fatherMiddleName,
                fatherLastName: data.spouse.fatherLastName,
                motherFirstName: data.spouse.motherFirstName,
                motherMiddleName: data.spouse.motherMiddleName,
                motherLastName: data.spouse.motherLastName,
                education: data.spouse.education,
                occupationType: data.spouse.occupationType,
                occupationLocation: data.spouse.occupationLocation,
              },
            });
          } else {
            // Delete spouse
            await tx.spouse.delete({
              where: { id: existingFamily.spouse.id },
            });
          }
        } else if (data.spouse) {
          // Create new spouse
          await tx.spouse.create({
            data: {
              familyId: family.id,
              firstName: data.spouse.firstName,
              middleName: data.spouse.middleName,
              lastName: data.spouse.lastName,
              fatherFirstName: data.spouse.fatherFirstName,
              fatherMiddleName: data.spouse.fatherMiddleName,
              fatherLastName: data.spouse.fatherLastName,
              motherFirstName: data.spouse.motherFirstName,
              motherMiddleName: data.spouse.motherMiddleName,
              motherLastName: data.spouse.motherLastName,
              education: data.spouse.education,
              occupationType: data.spouse.occupationType,
              occupationLocation: data.spouse.occupationLocation,
              gender: "Female",
            },
          });
        }
      }

      // Handle children updates if provided
      if (data.children !== undefined) {
        // Delete existing children
        await tx.child.deleteMany({
          where: { familyId: family.id },
        });

        // Create new children if provided
        if (data.children.length > 0) {
          await tx.child.createMany({
            data: data.children.map((child: { firstName: string; middleName?: string; lastName: string; gender: string; education?: string }) => ({
              familyId: family.id,
              firstName: child.firstName,
              middleName: child.middleName,
              lastName: child.lastName,
              gender: child.gender,
              education: child.education,
            })),
          });
        }
      }

      return family;
    });

    return NextResponse.json({
      message: "Family updated successfully",
      family: updatedFamily,
    });
  } catch (error) {
    console.error("Verifier UPDATE family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
