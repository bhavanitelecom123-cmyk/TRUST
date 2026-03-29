import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Simple auth - in production, protect this with special token or IP restriction
const ADMIN_SECRET = process.env.ADMIN_CREATION_SECRET || "change-this-secret-in-production";

export async function POST(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      // Update to admin
      const updated = await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          role: 'ADMIN',
          emailVerified: new Date(),
          ...(existing.password ? {} : { password: hashedPassword })
        }
      });
      return NextResponse.json({
        success: true,
        message: "User updated to admin",
        user: { email: updated.email, role: updated.role }
      });
    }

    // Create new admin
    const admin = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      message: "Admin created",
      user: { email: admin.email, role: admin.role }
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
