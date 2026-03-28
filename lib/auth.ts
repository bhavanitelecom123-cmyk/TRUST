import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Type for OTP detection
const OTP_REGEX = /^\d{6}$/;

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Credentials Provider (email/password and email/OTP)
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password or OTP", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const isOTP = OTP_REGEX.test(credentials.password);

        if (isOTP) {
          // OTP Login Flow
          const otp = parseInt(credentials.password, 10);

          // Find valid, non-expired OTP
          const now = new Date();
          const verification = await prisma.emailVerification.findFirst({
            where: {
              email: credentials.email,
              otp: credentials.password,
              expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!verification) {
            return null; // Invalid or expired OTP
          }

          // Check if user exists, if not create one (auto-registration)
          let user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            // Create new user without password (passwordless via OTP)
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                role: 'USER',
                // password remains null
              }
            });
          }

          // Delete used OTP (single use)
          await prisma.emailVerification.delete({
            where: { id: verification.id }
          });

          // Return user object
          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        } else {
          // Password Login Flow
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user) {
            return null;
          }

          // Users without password (OAuth-only or OTP-only) cannot use password login
          if (!user.password) {
            return null;
          }

          // Check if email is verified (skip for Google OAuth users)
          // For password-based accounts, require email verification
          if (!user.emailVerified && !user.googleId) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // For OAuth logins, user object is provided
      if (user) {
        token.id = user.id;
        token.role = user.role;

        // For OAuth users, ensure googleId is stored
        if (account?.provider === 'google' && account?.id) {
          // We'll handle this in the signIn callback instead
        }
      }

      // For OAuth sign-in, we need to get the provider ID
      if (account?.provider === 'google' && token.sub) {
        token.id = token.sub;
        // We'll sync googleId via signIn callback
      }

      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "VERIFIER" | "ADMIN";
      }
      return session;
    },
  },

  // Handle OAuth user creation/first-time sign-in
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        // Check if user already exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        });

        if (!existingUser) {
          // Create new user for Google OAuth
          await prisma.user.create({
            data: {
              email: user.email!,
              googleId: account.profileId as string, // Google's unique ID
              image: (profile as any)?.picture,
              role: 'USER', // Default role
              // No password set for OAuth users
            }
          });
        } else if (existingUser && !existingUser.googleId) {
          // Existing user (credentials) signed in with Google - link accounts?
          // Optionally update the existing user with googleId
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              googleId: account.profileId as string,
            }
          });
        }
        // If user exists with googleId, nothing to do - just sign in
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
