import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SinglePostAdminView from "@/components/admin/SinglePostAdminView";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SinglePostPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
    return null;
  }

  const { id } = await params;

  // Fetch the post with full details
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      likes: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
    return null;
  }

  // Fetch all post IDs to determine navigation
  const allPosts = await prisma.post.findMany({
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  const postIds = allPosts.map(p => p.id);
  const currentIndex = postIds.indexOf(id);
  const prevPostId = currentIndex > 0 ? postIds[currentIndex - 1] : null;
  const nextPostId = currentIndex < postIds.length - 1 ? postIds[currentIndex + 1] : null;

  return (
    <DashboardLayout activeItem="manage-posts">
      <div className="space-y-6 fade-in">
        <SinglePostAdminView post={post as any} prevPostId={prevPostId} nextPostId={nextPostId} />
      </div>
    </DashboardLayout>
  );
}
