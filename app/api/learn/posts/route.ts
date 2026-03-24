import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch posts with optional folderId filter
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const view = searchParams.get("view") || "list"; // list or grid

    const where: any = { isPublished: true };
    if (folderId) {
      where.folderId = folderId;
    }

    const posts = await prisma.learnPost.findMany({
      where,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    // Also get folder info if no folderId specified
    let folders = null;
    if (!folderId) {
      folders = await prisma.learnFolder.findMany({
        select: {
          id: true,
          name: true,
          parentId: true,
        },
        orderBy: {
          order: "asc",
        },
      });
    }

    return NextResponse.json({
      posts,
      folders,
      view,
    });
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new post (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const folderId = formData.get("folderId") as string;
    const order = formData.get("order") as string;
    const isPublished = formData.get("isPublished") === "true";

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!folderId || folderId.trim().length === 0) {
      return NextResponse.json(
        { error: "Folder is required" },
        { status: 400 }
      );
    }

    // Verify folder exists
    const folder = await prisma.learnFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    const post = await prisma.learnPost.create({
      data: {
        title: title.trim(),
        content: content || "",
        folderId,
        order: order ? parseInt(order) : 0,
        isPublished,
        createdBy: session.user.id,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Post created successfully", post },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
