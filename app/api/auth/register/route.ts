import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendEmailVerification, generateVerificationToken } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
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

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with emailVerified = null (not verified)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: "USER",
        emailVerified: null,
      },
    });

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate any previous verification tokens for this email
    await prisma.emailVerification.deleteMany({
      where: { email: normalizedEmail }
    });

    // Store verification token
    await prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        token: verificationToken,
        otp: null,
        type: "EMAIL_VERIFICATION",
        expiresAt,
      }
    });

    // Send verification email
    const emailResult = await sendEmailVerification(normalizedEmail, verificationToken);

    // Even if email fails, we still create the user but might want to log the error
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      // We could also delete the user here if email is critical, but let's allow them to retry verification later
    }

    return NextResponse.json(
      {
        message: "User registered successfully. Please verify your email to activate your account.",
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
