import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminMiddleware } from "@/lib/admin/middleware";

export async function GET(request: NextRequest) {
  const authCheck = await adminMiddleware();
  if (authCheck) return authCheck;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter

    const where: any = status ? { status } : {};

    const families = await prisma.family.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
          },
        },
        spouse: true,
        children: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const stats = await prisma.family.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      families,
      stats: {
        total: families.length,
        pending: stats.find(s => s.status === 'PENDING')?._count.id || 0,
        accepted: stats.find(s => s.status === 'ACCEPTED')?._count.id || 0,
      },
    });
  } catch (error) {
    console.error("Admin GET families error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authCheck = await adminMiddleware();
  if (authCheck) return authCheck;

  try {
    const { familyId, status, data } = await request.json();

    if (!familyId) {
      return NextResponse.json(
        { error: "familyId is required" },
        { status: 400 }
      );
    }

    // If status is provided, validate it
    if (status && !["PENDING", "ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // If only status is provided, do a simple status update
    if (status && !data) {
      const family = await prisma.family.update({
        where: { id: familyId },
        data: { status },
      });

      return NextResponse.json({
        message: `Family ${status.toLowerCase()} successfully`,
        family,
      });
    }

    // If full data is provided, do a complete family update
    if (data) {
      const existingFamily = await prisma.family.findUnique({
        where: { id: familyId },
        include: { spouse: true, children: true },
      });

      if (!existingFamily) {
        return NextResponse.json(
          { error: "Family not found" },
          { status: 404 }
        );
      }

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
            ...(status && { status }),
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
    }

    return NextResponse.json(
      { error: "Either status or data is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin UPDATE family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await adminMiddleware();
  if (authCheck) return authCheck;

  try {
    const { userId, familyData } = await request.json();

    if (!userId || !familyData) {
      return NextResponse.json(
        { error: "userId and familyData are required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user already has a family
    const existingFamily = await prisma.family.findUnique({
      where: { userId },
    });

    if (existingFamily) {
      return NextResponse.json(
        { error: "User already has a family record. Use update to modify." },
        { status: 400 }
      );
    }

    const family = await prisma.$transaction(async (tx) => {
      const newFamily = await tx.family.create({
        data: {
          userId,
          // Head fields
          firstName: familyData.firstName,
          middleName: familyData.middleName,
          lastName: familyData.lastName,
          // Father fields
          fatherFirstName: familyData.fatherFirstName,
          fatherMiddleName: familyData.fatherMiddleName,
          fatherLastName: familyData.fatherLastName,
          fatherId: familyData.fatherId,
          // Mother fields
          motherFirstName: familyData.motherFirstName,
          motherMiddleName: familyData.motherMiddleName,
          motherLastName: familyData.motherLastName,
          motherId: familyData.motherId,
          education: familyData.education,
          occupationType: familyData.occupationType,
          occupationLocation: familyData.occupationLocation,
          gender: "Male",
          maritalStatus: familyData.maritalStatus,
          status: "ACCEPTED", // Admin created families are auto-accepted
        },
      });

      if (familyData.maritalStatus === "Married" && familyData.spouse) {
        await tx.spouse.create({
          data: {
            familyId: newFamily.id,
            firstName: familyData.spouse.firstName,
            middleName: familyData.spouse.middleName,
            lastName: familyData.spouse.lastName,
            fatherFirstName: familyData.spouse.fatherFirstName,
            fatherMiddleName: familyData.spouse.fatherMiddleName,
            fatherLastName: familyData.spouse.fatherLastName,
            motherFirstName: familyData.spouse.motherFirstName,
            motherMiddleName: familyData.spouse.motherMiddleName,
            motherLastName: familyData.spouse.motherLastName,
            education: familyData.spouse.education,
            occupationType: familyData.spouse.occupationType,
            occupationLocation: familyData.spouse.occupationLocation,
            gender: "Female",
          },
        });
      }

      if (familyData.children && familyData.children.length > 0) {
        await tx.child.createMany({
          data: familyData.children.map((child: { firstName: string; middleName?: string; lastName: string; gender: string; education?: string }) => ({
            familyId: newFamily.id,
            firstName: child.firstName,
            middleName: child.middleName,
            lastName: child.lastName,
            gender: child.gender,
            education: child.education,
          })),
        });
      }

      return newFamily;
    });

    return NextResponse.json(
      { message: "Family created successfully for user", family },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin CREATE family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
