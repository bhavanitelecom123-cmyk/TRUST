import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch single folder with its posts and children
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const folder = await prisma.learnFolder.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          orderBy: {
            order: "asc",
          },
          include: {
            _count: {
              select: {
                posts: true,
                children: true,
              },
            },
          },
        },
        posts: {
          orderBy: {
            order: "asc",
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

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      folder,
    });
  } catch (error) {
    console.error("Get folder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update folder (ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, description, parentId, order } = body;

    // Check if folder exists
    const existingFolder = await prisma.learnFolder.findUnique({
      where: { id },
    });

    if (!existingFolder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    // If changing parent, validate no circular reference
    if (parentId && parentId !== existingFolder.parentId) {
      if (parentId === id) {
        return NextResponse.json(
          { error: "Cannot set folder as its own parent" },
          { status: 400 }
        );
      }

      // Check if new parent exists
      const newParent = await prisma.learnFolder.findUnique({
        where: { id: parentId },
      });
      if (!newParent) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }

      // Check for circular reference (parent being a descendant)
      let current: typeof newParent = newParent;
      while (current) {
        if (current.parentId === id) {
          return NextResponse.json(
            { error: "Circular reference detected" },
            { status: 400 }
          );
        }
        if (current.parentId) {
          const next = await prisma.learnFolder.findUnique({
            where: { id: current.parentId },
          });
          if (!next) break;
          current = next;
        } else {
          break;
        }
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (order !== undefined) updateData.order = order;

    const folder = await prisma.learnFolder.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
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

    return NextResponse.json({
      message: "Folder updated successfully",
      folder,
    });
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete folder and all its contents (cascade) (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if folder exists and count descendants for confirmation
    const folder = await prisma.learnFolder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            posts: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    // Delete folder (cascade will handle children and posts due to foreign key constraints)
    await prisma.learnFolder.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Folder deleted successfully",
    });
  } catch (error) {
    console.error("Delete folder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
