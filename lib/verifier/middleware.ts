import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function verifierMiddleware() {
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

  return null; // Allow request to proceed
}
