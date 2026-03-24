import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { adminMiddleware } from "@/lib/admin/middleware";

// GET - List all users
export async function GET(request: NextRequest) {
  const authCheck = await adminMiddleware();
  if (authCheck) return authCheck;

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role"); // optional filter by role

    const where: any = role ? { role } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        family: true, // Include family data (one-to-one relation)
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin GET users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
  const authCheck = await adminMiddleware();
  if (authCheck) return authCheck;

  try {
    const { email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (role && !["USER", "VERIFIER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be USER, VERIFIER, or ADMIN" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || "USER",
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin CREATE user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user and all related data (admin only)
export async function DELETE(request: NextRequest) {
  const authCheck = await adminMiddleware();
  if (authCheck) return authCheck;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    const session = await getServerSession(authOptions);
    if (session?.user?.id === userId) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // Begin transaction to delete user and all related data
    await prisma.$transaction(async (tx) => {
      // 1. Find the family owned by this user
      const family = await tx.family.findFirst({
        where: { userId: userId },
        select: {
          id: true,
          headPersonId: true,
          fatherId: true,
          motherId: true,
          spouse: {
            select: {
              id: true,
              personId: true,
            },
          },
        },
      });

      // Collect all Person IDs that are part of this family
      // IMPORTANT: Only delete persons that belong exclusively to this family.
      // DO NOT delete father/mother persons as they may be shared with other children's families.
      const personIdsToDelete: string[] = [];

      if (family) {
        // Head person (the user themselves) - always delete
        if (family.headPersonId) {
          personIdsToDelete.push(family.headPersonId);
        }
        // Spouse person - this belongs only to this family
        if (family.spouse?.personId) {
          personIdsToDelete.push(family.spouse.personId);
        }

        // Get children's person IDs - these children belong to this family
        const children = await tx.child.findMany({
          where: { familyId: family.id },
          select: { personId: true },
        });
        for (const child of children) {
          if (child.personId) {
            personIdsToDelete.push(child.personId);
          }
        }

        // 2. Delete relationships that involve any of these Person IDs
        // This will remove parent-child links where either parent or child is being deleted
        for (const personId of personIdsToDelete) {
          await tx.relationship.deleteMany({
            where: { parentId: personId },
          });
          await tx.relationship.deleteMany({
            where: { childId: personId },
          });
        }

        // 3. Delete children and spouse, then family
        await tx.child.deleteMany({
          where: { familyId: family.id },
        });

        if (family.spouse) {
          await tx.spouse.delete({
            where: { id: family.spouse.id },
          });
        }

        await tx.family.delete({
          where: { id: family.id },
        });
      }

      // 4. Attempt to delete Person records (best-effort; ignore if referenced elsewhere)
      for (const personId of personIdsToDelete) {
        try {
          await tx.person.delete({
            where: { id: personId },
          });
        } catch (e) {
          // Person still referenced elsewhere, skip
          console.log(`Person ${personId} could not be deleted (still referenced)`);
        }
      }

      // 5. Finally delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({
      message: `User ${user.email} and all related data deleted successfully`,
    });
  } catch (error) {
    console.error("Admin DELETE user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
