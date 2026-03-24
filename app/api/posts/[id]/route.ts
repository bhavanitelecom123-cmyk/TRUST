import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import fs from "fs";

// Helper function to handle image upload
async function saveImage(file: File): Promise<string | null> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.name}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "posts");

    // Ensure directory exists
    await writeFile(join(uploadDir, filename), buffer);
    return `/uploads/posts/${filename}`;
  } catch (error) {
    console.error("Error saving image:", error);
    return null;
  }
}

// GET - Get specific post with comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: postId } = await params;

    const include: any = {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      comments: {
        where: {
          parentId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    };

    // Include current user's like if authenticated
    if (session?.user?.id) {
      include.likes = {
        where: {
          userId: session.user.id,
        },
      };
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include,
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update post
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

    const { id: postId } = await params;
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const imageFile = formData.get("image") as File;
    const deleteImage = formData.get("deleteImage") === "true";

    // Check if post exists and user is author
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (existingPost.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only edit your own posts" },
        { status: 403 }
      );
    }

    let imageUrl = existingPost.imageUrl;

    // Handle image deletion
    if (deleteImage && existingPost.imageUrl) {
      try {
        const filePath = join(process.cwd(), "public", existingPost.imageUrl);
        if (fs.existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
      imageUrl = null;
    }

    // Handle new image upload
    if (imageFile && imageFile.size > 0) {
      // Delete old image if exists
      if (existingPost.imageUrl) {
        try {
          const oldFilePath = join(process.cwd(), "public", existingPost.imageUrl);
          if (fs.existsSync(oldFilePath)) {
            await unlink(oldFilePath);
          }
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }

      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image size must be less than 5MB" },
          { status: 400 }
        );
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json(
          { error: "Only JPEG, PNG, WEBP, and GIF images are allowed" },
          { status: 400 }
        );
      }
      imageUrl = await saveImage(imageFile);
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: title.trim(),
        description: description?.trim(),
        location: location?.trim(),
        imageUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete post
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

    const { id: postId } = await params;

    // Check if post exists and user is author
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (existingPost.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - You can only delete your own posts" },
        { status: 403 }
      );
    }

    // Delete associated image if exists
    if (existingPost.imageUrl) {
      try {
        const filePath = join(process.cwd(), "public", existingPost.imageUrl);
        if (fs.existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }

    // Note: comments and likes will be cascade deleted due to foreign key constraints
    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
