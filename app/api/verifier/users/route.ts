import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET - List users created by this verifier (only those with no family or PENDING family)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "VERIFIER") {
      return NextResponse.json(
        { error: "Forbidden - Verifier access required" },
        { status: 403 }
      );
    }

    // Fetch users created by this verifier
    // Include only those with no family OR family status is PENDING
    const users = await prisma.user.findMany({
      where: {
        createdBy: session.user.id,
        // We'll filter at JS level for family status because Prisma doesn't support
        // OR condition with relation easily without a complex query
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        family: true, // Include family data
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter users: only those with no family OR family.status === "PENDING"
    const filteredUsers = users.filter(user => {
      if (!user.family) return true;
      return user.family.status === "PENDING";
    });

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error("Verifier GET users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new user (verifier can only create USER role)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "VERIFIER") {
      return NextResponse.json(
        { error: "Forbidden - Verifier access required" },
        { status: 403 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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
        role: "USER", // Verifier can only create regular users
        createdBy: session.user.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        createdBy: true,
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
    console.error("Verifier CREATE user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
