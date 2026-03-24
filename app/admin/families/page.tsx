import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminFamiliesClient from "@/components/admin/AdminFamiliesClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default async function AdminFamiliesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  if (session.user.role !== "ADMIN") {
    return (
      <DashboardLayout activeItem="manage-families">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl max-w-md">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-300">
              You do not have administrator privileges to view this page.
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

  // Fetch all families with user, spouse, father, mother, and children with person details
  const families = await prisma.family.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      headPerson: true,
      fatherPerson: true,
      motherPerson: true,
      spouse: {
        include: {
          person: true
        }
      },
      children: {
        include: {
          person: true
        }
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Helper to serialize dates and clean Person objects
  const serializeDate = (date: any) => {
    if (date instanceof Date) return date.toISOString();
    return date || null;
  };

  const cleanPerson = (person: any) => {
    if (!person) return null;
    const { createdAt, ...rest } = person;
    return {
      ...rest,
      dateOfBirth: serializeDate(rest.dateOfBirth),
    };
  };

  const cleanChild = (child: any) => {
    const { createdAt, ...rest } = child;
    return {
      ...rest,
      person: cleanPerson(child.person),
    };
  };

  const cleanSpouse = (spouse: any) => {
    if (!spouse) return null;
    const { createdAt, ...rest } = spouse;
    return {
      ...rest,
      person: cleanPerson(spouse.person),
    };
  };

  const familiesWithStringDates = families.map((f) => {
    const { createdAt: fCreatedAt, updatedAt: fUpdatedAt, ...restFamily } = f;
    return {
      ...restFamily,
      createdAt: serializeDate(fCreatedAt),
      updatedAt: serializeDate(fUpdatedAt),
      headPerson: cleanPerson(f.headPerson),
      fatherPerson: cleanPerson(f.fatherPerson),
      motherPerson: cleanPerson(f.motherPerson),
      spouse: cleanSpouse(f.spouse),
      children: f.children.map(cleanChild),
    };
  });

  return (
    <DashboardLayout activeItem="manage-families">
      <div className="space-y-6 fade-in">
        <AdminFamiliesClient initialFamilies={familiesWithStringDates} />
      </div>
    </DashboardLayout>
  );
}
