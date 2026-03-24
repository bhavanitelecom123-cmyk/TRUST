import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import VerifierUsersClient from "@/components/verifier/VerifierUsersClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default async function VerifierUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  if (session.user.role !== "VERIFIER") {
    return (
      <DashboardLayout activeItem="manage-users">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl max-w-md">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-300">
              This page is only accessible to verifiers.
            </p>
            <a
              href="/dashboard"
              className="inline-block mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch users created by this verifier
  const users = await prisma.user.findMany({
    where: {
      createdBy: session.user.id,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      family: {
        include: {
          spouse: true,
          children: true,
        }
      }, // Include family data with spouse and children
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Filter: only show users with no family OR family.status === "PENDING"
  const filteredUsers = users.filter(user => {
    if (!user.family) return true;
    return user.family.status === "PENDING";
  });

  return (
    <DashboardLayout activeItem="manage-users">
      <div className="space-y-6 fade-in">
        <VerifierUsersClient initialUsers={filteredUsers} />
      </div>
    </DashboardLayout>
  );
}
