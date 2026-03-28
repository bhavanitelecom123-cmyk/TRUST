import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmailVerification } from "@/lib/email";
import { generateVerificationToken } from "@/lib/email";

// Rate limiting
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

    // Rate limiting: max 3 per hour
    const rateKey = `resend-verify:${normalizedEmail}`;
    const now = Date.now();
    const rateEntry = rateLimitMap.get(rateKey);
    const HOUR = 60 * 60 * 1000;

    if (rateEntry && now < rateEntry.resetTime) {
      if (rateEntry.count >= 3) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
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

    // Check if user exists and isn't already verified
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Don't reveal that user doesn't exist
      return NextResponse.json(
        { success: true, message: "If an account exists and email is not verified, a verification email has been sent." },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, message: "Email is already verified. You can sign in." },
        { status: 200 }
      );
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any old tokens
    await prisma.emailVerification.deleteMany({
      where: { email: normalizedEmail }
    });

    // Create new token
    await prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        token: verificationToken,
        type: "EMAIL_VERIFICATION",
        expiresAt,
      }
    });

    // Send email
    const emailResult = await sendEmailVerification(normalizedEmail, verificationToken);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification email sent. Please check your inbox (and spam folder).",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
