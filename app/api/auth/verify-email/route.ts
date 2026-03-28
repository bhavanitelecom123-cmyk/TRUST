import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find valid, non-expired verification token
    const verificationRecord = await prisma.emailVerification.findUnique({
      where: { token }
    });

    if (!verificationRecord || verificationRecord.type !== "EMAIL_VERIFICATION") {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    const now = new Date();
    if (verificationRecord.expiresAt < now) {
      // Delete expired token
      await prisma.emailVerification.delete({
        where: { id: verificationRecord.id }
      });
      return NextResponse.json(
        { error: "Verification token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark user as verified
    await prisma.user.update({
      where: { email: verificationRecord.email },
      data: { emailVerified: now }
    });

    // Delete used token
    await prisma.emailVerification.delete({
      where: { id: verificationRecord.id }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully! You can now sign in.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
