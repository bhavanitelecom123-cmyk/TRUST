"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  activeItem: string;
}

export default function DashboardLayout({ children, activeItem }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-x-10">
      {/* Sidebar */}
      <Sidebar activeItem={activeItem} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto py-2 px-2 pb-20 md:pb-2">
        <div className="max-w-9xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Right Sidebar Blank - for layout balance (hidden for admin) */}
      {!isAdmin && (
        <div className="w-64 shrink-0 bg-gray-700 md:block hidden" />
      )}
    </div>
  );
}
