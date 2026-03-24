import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFamilyTree } from "@/lib/family-tree-service";

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
    const { searchParams } = new URL(request.url);
    const ancestorDepth = parseInt(searchParams.get("ancestorDepth") || "3", 10);
    const descendantDepth = parseInt(searchParams.get("descendantDepth") || "3", 10);

    const tree = await getFamilyTree(personId, ancestorDepth, descendantDepth);

    if (!tree) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    return NextResponse.json({ tree });
  } catch (error) {
    console.error("Get family tree error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
