import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST - Create family for a user (verifier only)
export async function POST(request: NextRequest) {
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

    const { userId, familyData } = await request.json();

    if (!userId || !familyData) {
      return NextResponse.json(
        { error: "userId and familyData are required" },
        { status: 400 }
      );
    }

    // Check if user exists and is created by this verifier
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only create families for users you created" },
        { status: 403 }
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

    // Create family with status PENDING (requires admin approval)
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
          status: "PENDING", // Require admin approval
          createdBy: session.user.id, // Track verifier who created this family
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
      { message: "Family created successfully (pending approval)", family },
      { status: 201 }
    );
  } catch (error) {
    console.error("Verifier CREATE family error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
