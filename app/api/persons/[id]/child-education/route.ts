import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Retrieve education from child record for a person
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: personId } = await params;

    // Find the most recent child record for this person
    const child = await prisma.child.findFirst({
      where: {
        personId: personId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        education: true
      }
    });

    if (!child) {
      return NextResponse.json({ education: null });
    }

    return NextResponse.json({ education: child.education || null });
  } catch (error) {
    console.error("Get child education error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
