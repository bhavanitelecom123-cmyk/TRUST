"use client";

import { useState, Fragment, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import FamilyTree from "@/components/family/FamilyTree";
import FamilyForm from "@/components/forms/FamilyForm";
import { FamilyFormData } from "@/types";
import { formatAge } from "@/lib/date-utils";

interface Child {
  id: string;
  personId?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  education?: string | null;
  person?: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender: string;
    dateOfBirth?: string | null;
    isDeceased?: boolean;
  } | null;
}

interface Spouse {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  personId?: string | null;
  person?: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender: string;
    dateOfBirth?: string | null;
    isDeceased?: boolean;
  } | null;
  fatherFirstName?: string | null;
  fatherMiddleName?: string | null;
  fatherLastName?: string | null;
  motherFirstName?: string | null;
  motherMiddleName?: string | null;
  motherLastName?: string | null;
  education?: string | null;
  occupationType?: string | null;
  occupationLocation?: string | null;
  gender: string;
}

interface Family {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  headPersonId?: string | null;
  headPerson?: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender: string;
    dateOfBirth?: string | null;
    isDeceased?: boolean;
  } | null;
  fatherFirstName?: string | null;
  fatherMiddleName?: string | null;
  fatherLastName?: string | null;
  fatherId?: string | null;
  fatherPerson?: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender: string;
    dateOfBirth?: string | null;
    isDeceased?: boolean;
  } | null;
  motherFirstName?: string | null;
  motherMiddleName?: string | null;
  motherLastName?: string | null;
  motherId?: string | null;
  motherPerson?: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender: string;
    dateOfBirth?: string | null;
    isDeceased?: boolean;
  } | null;
  education?: string | null;
  occupationType?: string | null;
  occupationLocation?: string | null;
  gender: string;
  maritalStatus: string;
  status: string;
  createdAt: string;
  user: {
    email: string;
  };
  spouse?: Spouse | null;
  children: Child[];
}

interface AdminFamiliesClientProps {
  initialFamilies: Family[];
}

export default function AdminFamiliesClient({ initialFamilies }: AdminFamiliesClientProps) {
  const { theme } = useTheme();
  const [families, setFamilies] = useState<Family[]>(initialFamilies);
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [showFamilyTreeModal, setShowFamilyTreeModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  const handleToggleExpand = (familyId: string) => {
    setExpandedFamilyId(expandedFamilyId === familyId ? null : familyId);
  };

  const handleShowFamilyTree = (family: Family) => {
    setSelectedFamily(family);
    setShowFamilyTreeModal(true);
  };

  const handleEditFamily = (family: Family) => {
    setEditingFamily(family);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingFamily(null);
  };

  const handleFormSubmit = async (data: FamilyFormData) => {
    if (!editingFamily) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/families/${editingFamily.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update family");
      }

      const { family: updatedFamily } = await response.json();

      // Replace the edited family in the list
      setFamilies(prev => prev.map(f => f.id === updatedFamily.id ? updatedFamily : f));

      handleCloseEditModal();
    } catch (error: any) {
      console.error("Update error:", error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Family Management</h1>
        <p className={textSecondary}>
          View all family records in the system
        </p>
      </div>

      <div className={`${cardClass} rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-xl font-bold ${textPrimary}`}>
            All Families ({families.length})
          </h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            Complete overview of registered families
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Head of Family
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Marital Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Children
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {families.map((family) => (
                <Fragment key={family.id}>
                  <tr
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                    onClick={() => handleToggleExpand(family.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {family.firstName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${textPrimary}`}>
                            {[family.firstName, family.middleName, family.lastName].filter(Boolean).join(" ")}
                            {family.headPerson?.dateOfBirth && (
                              <span className={`ml-2 text-xs ${textSecondary}`}>
                                {formatAge(family.headPerson.dateOfBirth)}
                              </span>
                            )}
                          </div>
                          {family.spouse && (
                            <div className={`text-sm ${textSecondary}`}>
                              Spouse: {[family.spouse.firstName, family.spouse.middleName, family.spouse.lastName].filter(Boolean).join(" ")}
                              {family.spouse.person?.dateOfBirth && (
                                <span className={`ml-2 text-xs ${textSecondary}`}>
                                  {formatAge(family.spouse.person.dateOfBirth)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${textPrimary}`}>
                        {family.user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {family.maritalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${family.children.length > 0 ? "text-green-600 dark:text-green-400" : textSecondary}`}>
                        {family.children.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        family.status === "ACCEPTED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : family.status === "REJECTED"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}>
                        {family.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(family.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedFamilyId === family.id && (
                    <tr key={`${family.id}-details`} className={`${theme === "dark" ? "bg-gray-900/50" : "bg-gray-50"}`}>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-4 animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className={`font-semibold mb-2 ${textPrimary}`}>Head of Family</h4>
                              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                <p className={`font-medium ${textPrimary}`}>
                                  {[family.firstName, family.middleName, family.lastName].filter(Boolean).join(" ")}
                                  {family.headPerson?.dateOfBirth && (
                                    <span className={`ml-2 text-sm ${textSecondary}`}>
                                      {formatAge(family.headPerson.dateOfBirth)}
                                    </span>
                                  )}
                                </p>
                                {family.fatherFirstName && (
                                  <p className={`text-sm ${textSecondary} mt-1`}>
                                    Father: {[family.fatherFirstName, family.fatherMiddleName, family.fatherLastName].filter(Boolean).join(" ")}
                                    {family.fatherPerson?.dateOfBirth && (
                                      <span className={`ml-2 text-sm ${textSecondary}`}>
                                        {formatAge(family.fatherPerson.dateOfBirth)}
                                      </span>
                                    )}
                                  </p>
                                )}
                                {family.motherFirstName && (
                                  <p className={`text-sm ${textSecondary} mt-1`}>
                                    Mother: {[family.motherFirstName, family.motherMiddleName, family.motherLastName].filter(Boolean).join(" ")}
                                    {family.motherPerson?.dateOfBirth && (
                                      <span className={`ml-2 text-sm ${textSecondary}`}>
                                        {formatAge(family.motherPerson.dateOfBirth)}
                                      </span>
                                    )}
                                  </p>
                                )}
                                <p className={`text-sm mt-1 ${textSecondary}`}>
                                  <span className="font-medium">Gender:</span> {family.gender}
                                </p>
                                {family.education && (
                                  <p className={`text-sm mt-1 ${textSecondary}`}>
                                    <span className="font-medium">Education:</span> {family.education}
                                  </p>
                                )}
                                {family.occupationType && (
                                  <p className={`text-sm mt-1 ${textSecondary}`}>
                                    <span className="font-medium">Occupation:</span> {family.occupationType} {family.occupationLocation && `(${family.occupationLocation})`}
                                  </p>
                                )}
                              </div>
                            </div>
                            {family.spouse && (
                              <div>
                                <h4 className={`font-semibold mb-2 ${textPrimary}`}>Spouse</h4>
                                <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                  <p className={`font-medium ${textPrimary}`}>
                                    {[family.spouse.firstName, family.spouse.middleName, family.spouse.lastName].filter(Boolean).join(" ")}
                                    {family.spouse.person?.dateOfBirth && (
                                      <span className={`ml-2 text-sm ${textSecondary}`}>
                                        {formatAge(family.spouse.person.dateOfBirth)}
                                      </span>
                                    )}
                                  </p>
                                  {family.spouse.fatherFirstName && (
                                    <p className={`text-sm ${textSecondary} mt-1`}>
                                      Father: {[family.spouse.fatherFirstName, family.spouse.fatherMiddleName, family.spouse.fatherLastName].filter(Boolean).join(" ")}
                                    </p>
                                  )}
                                  {family.spouse.motherFirstName && (
                                    <p className={`text-sm ${textSecondary} mt-1`}>
                                      Mother: {[family.spouse.motherFirstName, family.spouse.motherMiddleName, family.spouse.motherLastName].filter(Boolean).join(" ")}
                                    </p>
                                  )}
                                  {family.spouse.education && (
                                    <p className={`text-sm mt-1 ${textSecondary}`}>
                                      <span className="font-medium">Education:</span> {family.spouse.education}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {family.children.length > 0 && (
                            <div>
                              <h4 className={`font-semibold mb-2 ${textPrimary}`}>Children</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {family.children.map((child) => (
                                  <div key={child.id} className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                    <p className={`font-medium ${textPrimary}`}>
                                      {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(" ")}
                                      {child.person?.dateOfBirth && (
                                        <span className={`ml-2 text-sm ${textSecondary}`}>
                                          {formatAge(child.person.dateOfBirth)}
                                        </span>
                                      )}
                                    </p>
                                    <p className={`text-sm ${textSecondary} mt-1`}>
                                      Gender: {child.gender}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditFamily(family);
                              }}
                              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm min-h-[36px] flex items-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Family
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowFamilyTree(family);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm min-h-[36px] flex items-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              View Family Tree
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {families.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No family registrations yet.</p>
          </div>
        )}
      </div>

      {/* Family Tree Modal */}
      {showFamilyTreeModal && selectedFamily && selectedFamily.headPersonId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Family Tree - {selectedFamily.user.email}</h2>
              <button
                onClick={() => setShowFamilyTreeModal(false)}
                className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition`}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <FamilyTree defaultPersonId={selectedFamily.headPersonId} compact />
            </div>
          </div>
        </div>
      )}

      {/* Edit Family Modal */}
      {showEditModal && editingFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Edit Family</h2>
              <button
                onClick={handleCloseEditModal}
                className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition`}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              <FamilyForm
                initialData={{
                  firstName: editingFamily.firstName,
                  middleName: editingFamily.middleName || undefined,
                  lastName: editingFamily.lastName,
                  dateOfBirth: editingFamily.headPerson?.dateOfBirth || undefined,
                  headPersonId: editingFamily.headPersonId || undefined,
                  fatherFirstName: editingFamily.fatherFirstName || "",
                  fatherMiddleName: editingFamily.fatherMiddleName || "",
                  fatherLastName: editingFamily.fatherLastName || "",
                  fatherDateOfBirth: editingFamily.fatherPerson?.dateOfBirth || "",
                  fatherId: editingFamily.fatherId || undefined,
                  motherFirstName: editingFamily.motherFirstName || "",
                  motherMiddleName: editingFamily.motherMiddleName || "",
                  motherLastName: editingFamily.motherLastName || "",
                  motherDateOfBirth: editingFamily.motherPerson?.dateOfBirth || "",
                  motherId: editingFamily.motherId || undefined,
                  education: editingFamily.education || "",
                  occupationType: (editingFamily.occupationType as "Job" | "Business" | "Unoccupied") || "Job",
                  occupationLocation: editingFamily.occupationLocation || "",
                  gender: editingFamily.gender as "Male",
                  maritalStatus: editingFamily.maritalStatus as "Single" | "Married" | "Widowed" | "Divorced",
                  spouse: editingFamily.spouse
                    ? {
                        firstName: editingFamily.spouse.firstName,
                        middleName: editingFamily.spouse.middleName || "",
                        lastName: editingFamily.spouse.lastName,
                        dateOfBirth: editingFamily.spouse.person?.dateOfBirth || undefined,
                        personId: editingFamily.spouse.personId || undefined,
                        fatherFirstName: editingFamily.spouse.fatherFirstName || "",
                        fatherMiddleName: editingFamily.spouse.fatherMiddleName || "",
                        fatherLastName: editingFamily.spouse.fatherLastName || "",
                        motherFirstName: editingFamily.spouse.motherFirstName || "",
                        motherMiddleName: editingFamily.spouse.motherMiddleName || "",
                        motherLastName: editingFamily.spouse.motherLastName || "",
                        isDeceased: false,
                        education: editingFamily.spouse.education || "",
                        occupationType: (editingFamily.spouse.occupationType as "Job" | "Business" | "Unoccupied" | "House Wife") || "Job",
                        occupationLocation: editingFamily.spouse.occupationLocation || "",
                        gender: "Female",
                      }
                    : undefined,
                  children: editingFamily.children.map((child) => ({
                    firstName: child.firstName,
                    middleName: child.middleName || "",
                    lastName: child.lastName,
                    dateOfBirth: child.person?.dateOfBirth || "",
                    personId: child.personId || undefined,
                    gender: child.gender as "Male" | "Female" | "Other",
                    education: child.education || "",
                  })),
                }}
                onSubmit={handleFormSubmit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
