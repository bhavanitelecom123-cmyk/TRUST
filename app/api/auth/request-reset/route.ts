import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

// Rate limiting map (use Redis/Upstash in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: 3 attempts per hour per email/IP
    const rateKey = `reset:${normalizedEmail}`;
    const now = Date.now();
    const rateEntry = rateLimitMap.get(rateKey);
    const HOUR = 60 * 60 * 1000;

    if (rateEntry && now < rateEntry.resetTime) {
      if (rateEntry.count >= 3) {
        const waitMinutes = Math.ceil((rateEntry.resetTime - now) / (60 * 1000));
        return NextResponse.json(
          { error: `Too many attempts. Please try again in ${waitMinutes} minutes.` },
          { status: 429 }
        );
      }
      rateEntry.count++;
    } else {
      rateLimitMap.set(rateKey, { count: 1, resetTime: now + HOUR });
    }

    // Clean old entries
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Security: Don't reveal that user doesn't exist
      // Return success anyway to prevent email enumeration
      return NextResponse.json(
        { success: true, message: "If an account exists, a password reset email has been sent." },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Remove any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail }
    });

    // Store reset token
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token: resetToken,
        expiresAt,
      }
    });

    // Send email
    const emailResult = await sendPasswordResetEmail(normalizedEmail, resetToken);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "If an account exists, a password reset email has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
