import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT - Edit comment
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

    const { id: commentId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Check if comment exists and user is author
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (existingComment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only edit your own comments" },
        { status: 403 }
      );
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
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
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Update comment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete comment (cascade delete replies)
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

    const { id: commentId } = await params;

    // Check if comment exists and user is author
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (existingComment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - You can only delete your own comments" },
        { status: 403 }
      );
    }

    const postId = existingComment.postId;

    // Count total replies (including nested) to decrement comments count correctly
    const countReplies = async (commentId: string): Promise<number> => {
      const directReplies = await prisma.comment.count({
        where: { parentId: commentId },
      });
      const replies = await prisma.comment.findMany({
        where: { parentId: commentId },
      });
      let total = directReplies;
      for (const reply of replies) {
        total += await countReplies(reply.id);
      }
      return total;
    };

    const totalReplies = await countReplies(commentId);
    const decrementAmount = 1 + totalReplies;

    await prisma.$transaction(async (tx) => {
      // Decrement post comments count
      await tx.post.update({
        where: { id: postId },
        data: {
          commentsCount: {
            decrement: decrementAmount,
          },
        },
      });

      // Delete comment (cascade will handle replies due to FK constraints)
      await tx.comment.delete({
        where: { id: commentId },
      });
    });

    return NextResponse.json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
