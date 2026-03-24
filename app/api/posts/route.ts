import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// Helper function to handle image upload
async function saveImage(file: File): Promise<string | null> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${uuidv4()}-${file.name}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "posts");

    // Ensure directory exists
    await writeFile(join(uploadDir, filename), buffer);
    return `/uploads/posts/${filename}`;
  } catch (error) {
    console.error("Error saving image:", error);
    return null;
  }
}

// GET - Fetch posts with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build include clause
    const include: any = {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    };

    // If user is logged in, include their like status
    if (session?.user?.id) {
      include.likes = {
        where: {
          userId: session.user.id,
        },
      };
    }

    const posts = await prisma.post.findMany({
      take: limit + 1,
      skip,
      include,
      orderBy: {
        createdAt: "desc",
      },
    });

    const hasMore = posts.length > limit;
    const postsData = hasMore ? posts.slice(0, limit) : posts;

    return NextResponse.json({
      posts: postsData,
      hasMore,
      total: await prisma.post.count(),
    });
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const imageFile = formData.get("image") as File;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    let imageUrl = null;
    if (imageFile && imageFile.size > 0) {
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

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        description: description?.trim(),
        imageUrl,
        location: location?.trim(),
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
