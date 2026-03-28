import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOTPEmail, generateOTP } from "@/lib/email";

// Simple in-memory rate limiting (consider using Redis/Upstash for production)
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

    // Rate limiting: 3 attempts per hour per email
    const rateKey = `otp:${email.toLowerCase()}`;
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

    // Clean old entries (basic garbage collection)
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists but has googleId (Google OAuth user)
    // They might still want to use OTP? We'll allow it for flexibility.
    // If they don't have a password, OTP will work.

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any previous OTPs for this email
    await prisma.emailVerification.deleteMany({
      where: { email: normalizedEmail }
    });

    // Store new OTP
    await prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        otp: otp.toString(),
        expiresAt,
      }
    });

    // Send email
    const emailResult = await sendOTPEmail(normalizedEmail, otp);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent to your email. Please check your inbox (and spam folder).",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
