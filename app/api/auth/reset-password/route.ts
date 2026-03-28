import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find valid, non-expired token
    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetTokenRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const now = new Date();
    if (resetTokenRecord.expiresAt < now) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetTokenRecord.id }
      });
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new password reset." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { email: resetTokenRecord.email },
      data: { password: hashedPassword }
    });

    // Delete used token
    await prisma.passwordResetToken.delete({
      where: { id: resetTokenRecord.id }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully. You can now log in with your new password.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
