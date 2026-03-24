"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { FamilyFormData } from "@/types";
import SplitNameInput from "./SplitNameInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

type SplitNameValue = {
  firstName: string;
  middleName: string;
  lastName: string;
  personId?: string;
};

interface FamilyFormProps {
  initialData?: any;
  onSubmit: (data: FamilyFormData) => Promise<void>;
}

export default function FamilyForm({ initialData, onSubmit }: FamilyFormProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [formData, setFormData] = useState<FamilyFormData>({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    headPersonId: undefined,
    fatherFirstName: "",
    fatherMiddleName: "",
    fatherLastName: "",
    fatherDateOfBirth: "",
    fatherId: undefined,
    motherFirstName: "",
    motherMiddleName: "",
    motherLastName: "",
    motherDateOfBirth: "",
    motherId: undefined,
    education: "",
    occupationType: "Job",
    occupationLocation: "",
    gender: "Male",
    maritalStatus: "Single",
    spouse: undefined,
    children: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper to fetch spouse data
  const fetchSpouse = async (personId: string): Promise<SplitNameValue | null> => {
    try {
      const res = await fetch(`/api/persons/${personId}/spouse`);
      if (res.ok) {
        const data = await res.json();
        if (data.person) {
          return {
            firstName: data.person.firstName || "",
            middleName: data.person.middleName || "",
            lastName: data.person.lastName || "",
            personId: data.person.id
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch spouse:", error);
      return null;
    }
  };

  // Helper to fetch child education for a person (when they were a child)
  const fetchChildEducation = async (personId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/persons/${personId}/child-education`);
      if (res.ok) {
        const data = await res.json();
        return data.education || null;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch child education:", error);
      return null;
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName || "",
        middleName: initialData.middleName || "",
        lastName: initialData.lastName || "",
        dateOfBirth: initialData.headPerson?.dateOfBirth || initialData.headPerson?.dateOfBirth || "",
        headPersonId: initialData.headPersonId,
        fatherFirstName: initialData.fatherFirstName || "",
        fatherMiddleName: initialData.fatherMiddleName || "",
        fatherLastName: initialData.fatherLastName || "",
        fatherDateOfBirth: initialData.fatherPerson?.dateOfBirth || "",
        fatherId: initialData.fatherId,
        motherFirstName: initialData.motherFirstName || "",
        motherMiddleName: initialData.motherMiddleName || "",
        motherLastName: initialData.motherLastName || "",
        motherDateOfBirth: initialData.motherPerson?.dateOfBirth || "",
        motherId: initialData.motherId,
        education: initialData.education || "",
        occupationType: (initialData.occupationType as "Job" | "Business" | "Unoccupied") || "Job",
        occupationLocation: initialData.occupationLocation || "",
        gender: "Male",
        maritalStatus: (initialData.maritalStatus as "Single" | "Married" | "Widowed" | "Divorced") || "Single",
        spouse: initialData.spouse
          ? {
              firstName: initialData.spouse.firstName || "",
              middleName: initialData.spouse.middleName || "",
              lastName: initialData.spouse.lastName || "",
              dateOfBirth: initialData.spouse.person?.dateOfBirth || "",
              personId: initialData.spouse.personId,
              fatherFirstName: initialData.spouse.fatherFirstName || "",
              fatherMiddleName: initialData.spouse.fatherMiddleName || "",
              fatherLastName: initialData.spouse.fatherLastName || "",
              motherFirstName: initialData.spouse.motherFirstName || "",
              motherMiddleName: initialData.spouse.motherMiddleName || "",
              motherLastName: initialData.spouse.motherLastName || "",
              isDeceased: initialData.spouse.isDeceased || false,
              education: initialData.spouse.education || "",
              occupationType: (initialData.spouse.occupationType as "Job" | "Business" | "Unoccupied" | "House Wife") || "Job",
              occupationLocation: initialData.spouse.occupationLocation || "",
              gender: "Female",
            }
          : undefined,
        children: initialData.children?.map((child: any) => ({
          firstName: child.firstName || "",
          middleName: child.middleName || "",
          lastName: child.lastName || "",
          dateOfBirth: child.person?.dateOfBirth || "",
          personId: child.personId,
          gender: child.gender as "Male" | "Female" | "Other",
          education: child.education || "",
        })) || [],
      });
    }
  }, [initialData]);

  // Initialize spouse object when maritalStatus changes to Married
  useLayoutEffect(() => {
    if (formData.maritalStatus === "Married" && !formData.spouse) {
      setFormData((prev) => ({
        ...prev,
        spouse: {
          firstName: "",
          middleName: "",
          lastName: "",
          dateOfBirth: "",
          personId: undefined,
          fatherFirstName: "",
          fatherMiddleName: "",
          fatherLastName: "",
          motherFirstName: "",
          motherMiddleName: "",
          motherLastName: "",
          isDeceased: false,
          education: "",
          occupationType: "Job",
          occupationLocation: "",
          gender: "Female"
        }
      }));
    }
  }, [formData.maritalStatus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSpouseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      spouse: {
        ...prev.spouse!,
        [name]: value,
      },
    }));
  };

  const handleChildChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [name]: value } : child
      ),
    }));
  };

  // Handlers for SplitNameInput components
  const handleHeadChange = async (newVal: SplitNameValue) => {
    setFormData((prev) => ({
      ...prev,
      firstName: newVal.firstName,
      middleName: newVal.middleName,
      lastName: newVal.lastName,
      headPersonId: newVal.personId
    }));

    // Prefill education from child record if available
    if (newVal.personId) {
      const childEducation = await fetchChildEducation(newVal.personId);
      if (childEducation) {
        setFormData((prev) => {
          if (!prev.education) {
            return { ...prev, education: childEducation };
          }
          return prev;
        });
      }
    }
  };

  const handleFatherChange = async (newVal: SplitNameValue) => {
    setFormData((prev) => ({
      ...prev,
      fatherFirstName: newVal.firstName,
      fatherMiddleName: newVal.middleName,
      fatherLastName: newVal.lastName,
      fatherId: newVal.personId
    }));

    // Auto-fill mother if father linked to a spouse and mother fields are empty
    if (newVal.personId) {
      const spouse = await fetchSpouse(newVal.personId);
      if (spouse) {
        setFormData((prev) => {
          // Only fill if motherId is not already set
          if (!prev.motherId) {
            return {
              ...prev,
              motherFirstName: spouse.firstName,
              motherMiddleName: spouse.middleName,
              motherLastName: spouse.lastName,
              motherId: spouse.personId
            };
          }
          return prev;
        });
      }
    }
  };

  const handleMotherChange = async (newVal: SplitNameValue) => {
    setFormData((prev) => ({
      ...prev,
      motherFirstName: newVal.firstName,
      motherMiddleName: newVal.middleName,
      motherLastName: newVal.lastName,
      motherId: newVal.personId
    }));

    // Auto-fill father if mother linked to a spouse and father fields are empty
    if (newVal.personId) {
      const spouse = await fetchSpouse(newVal.personId);
      if (spouse) {
        setFormData((prev) => {
          // Only fill if fatherId is not already set
          if (!prev.fatherId) {
            return {
              ...prev,
              fatherFirstName: spouse.firstName,
              fatherMiddleName: spouse.middleName,
              fatherLastName: spouse.lastName,
              fatherId: spouse.personId
            };
          }
          return prev;
        });
      }
    }
  };

  const handleSpouseNameChange = (newVal: { firstName: string; middleName: string; lastName: string; personId?: string }) => {
    setFormData((prev) => ({
      ...prev,
      spouse: prev.spouse
        ? {
            ...prev.spouse,
            firstName: newVal.firstName,
            middleName: newVal.middleName,
            lastName: newVal.lastName,
            personId: newVal.personId
          }
        : undefined
    }));
  };

  const handleChildChangeByName = (index: number, newVal: { firstName: string; middleName: string; lastName: string; personId?: string }) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? {
          ...child,
          firstName: newVal.firstName,
          middleName: newVal.middleName,
          lastName: newVal.lastName,
          personId: newVal.personId
        } : child
      )
    }));
  };

  const addChild = () => {
    setFormData((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        { firstName: "", middleName: "", lastName: "", dateOfBirth: "", gender: "Male", education: "" },
      ],
    }));
  };

  const removeChild = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate head name
    const headFullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Head of family first and last name are required");
      return;
    }

    // Force head gender to Male
    formData.gender = "Male";

    if (formData.maritalStatus === "Married") {
      if (!formData.spouse?.firstName.trim() || !formData.spouse?.lastName.trim()) {
        setError("Spouse first and last name are required when married");
        return;
      }
      // Force spouse gender to Female
      formData.spouse.gender = "Female";
    }

    // Children only validated if not Single
    if (formData.maritalStatus !== "Single") {
      for (let i = 0; i < formData.children.length; i++) {
        if (!formData.children[i].firstName.trim() || !formData.children[i].lastName.trim()) {
          setError(`Child ${i + 1} first and last name are required`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError("Failed to save family data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const inputClass = theme === "dark"
    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500";

  const labelClass = theme === "dark"
    ? "block text-sm font-semibold mb-2 text-gray-200"
    : "block text-sm font-semibold mb-2 text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className={`p-4 rounded-lg text-sm border ${theme === "dark" ? "bg-red-900/30 text-red-300 border-red-800" : "bg-red-50 text-red-700 border-red-200"}`}>
          {error}
        </div>
      )}

      {/* Head of Family Section */}
      <div className={`${cardClass} rounded-xl p-6 space-y-4 transition-all duration-300`}>
        <div className="flex items-center gap-3 border-b pb-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Head of Family (Male)
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Head Name Fields with SplitNameInput */}
          <div className="md:col-span-3">
            <SplitNameInput
              label="Full Name"
              value={{
                firstName: formData.firstName,
                middleName: formData.middleName,
                lastName: formData.lastName,
                personId: formData.headPersonId
              }}
              onChange={handleHeadChange}
              required
            />
          </div>

          {/* Head Date of Birth */}
          <div>
            <label className={labelClass}>
              Date of Birth
            </label>
            <DatePicker
              selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : null}
              onChange={(date: Date | null) => {
                setFormData((prev) => ({
                  ...prev,
                  dateOfBirth: date ? date.toISOString() : ""
                }));
              }}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
              placeholderText="Select date"
              dateFormat="dd/MM/yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
          </div>

          {/* Father's Name */}
          <div className="md:col-span-3">
            <SplitNameInput
              label="Father's Name"
              value={{
                firstName: formData.fatherFirstName,
                middleName: formData.fatherMiddleName,
                lastName: formData.fatherLastName,
                personId: formData.fatherId
              }}
              onChange={handleFatherChange}
            />
          </div>

          {/* Father's Date of Birth */}
          <div>
            <label className={labelClass}>
              Father's DOB
            </label>
            <DatePicker
              selected={formData.fatherDateOfBirth ? new Date(formData.fatherDateOfBirth) : null}
              onChange={(date: Date | null) => {
                setFormData((prev) => ({
                  ...prev,
                  fatherDateOfBirth: date ? date.toISOString() : ""
                }));
              }}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
              placeholderText="Select date"
              dateFormat="dd/MM/yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
          </div>

          {/* Mother's Name */}
          <div className="md:col-span-3">
            <SplitNameInput
              label="Mother's Name"
              value={{
                firstName: formData.motherFirstName,
                middleName: formData.motherMiddleName,
                lastName: formData.motherLastName,
                personId: formData.motherId
              }}
              onChange={handleMotherChange}
            />
          </div>

          {/* Mother's Date of Birth */}
          <div>
            <label className={labelClass}>
              Mother's DOB
            </label>
            <DatePicker
              selected={formData.motherDateOfBirth ? new Date(formData.motherDateOfBirth) : null}
              onChange={(date: Date | null) => {
                setFormData((prev) => ({
                  ...prev,
                  motherDateOfBirth: date ? date.toISOString() : ""
                }));
              }}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
              placeholderText="Select date"
              dateFormat="dd/MM/yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
          </div>

          <div>
            <label className={labelClass}>
              Education
            </label>
            <input
              type="text"
              name="education"
              value={formData.education}
              onChange={handleChange}
              placeholder="e.g., B.Tech, MBA, etc."
              className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
            />
          </div>

          <div>
            <label className={labelClass}>
              Occupation Type
            </label>
            <select
              name="occupationType"
              value={formData.occupationType}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
            >
              <option value="Job">Job</option>
              <option value="Business">Business</option>
              <option value="Unoccupied">Unoccupied</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Occupation Location
            </label>
            <input
              type="text"
              name="occupationLocation"
              value={formData.occupationLocation}
              onChange={handleChange}
              placeholder="City/Country"
              className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
            />
          </div>

          <div>
            <label className={labelClass}>
              Marital Status
            </label>
            <select
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Divorced">Divorced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spouse Section - Only show if Married */}
      {formData.maritalStatus === "Married" && (
        <div className={`${cardClass} rounded-xl p-6 space-y-4 transition-all duration-300 fade-in`}>
          <div className="flex items-center gap-3 border-b pb-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Spouse Details (Female)
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Spouse Name Fields with SplitNameInput */}
            <div className="md:col-span-3">
              <SplitNameInput
                label="Full Name"
                value={{
                  firstName: formData.spouse?.firstName || "",
                  middleName: formData.spouse?.middleName || "",
                  lastName: formData.spouse?.lastName || "",
                  personId: formData.spouse?.personId
                }}
                onChange={handleSpouseNameChange}
                required
              />
            </div>

            {/* Spouse Date of Birth */}
            <div>
              <label className={labelClass}>
                Date of Birth
              </label>
              <DatePicker
                selected={formData.spouse?.dateOfBirth ? new Date(formData.spouse.dateOfBirth) : null}
                onChange={(date: Date | null) => {
                  setFormData((prev) => ({
                    ...prev,
                    spouse: prev.spouse
                      ? {
                          ...prev.spouse,
                          dateOfBirth: date ? date.toISOString() : ""
                        }
                      : undefined
                  }));
                }}
                className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
                placeholderText="Select date"
                dateFormat="dd/MM/yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>

            {/* Spouse Father's Name */}
            <div className="md:col-span-3">
              <SplitNameInput
                label="Father's Name"
                value={{
                  firstName: formData.spouse?.fatherFirstName || "",
                  middleName: formData.spouse?.fatherMiddleName || "",
                  lastName: formData.spouse?.fatherLastName || ""
                }}
                onChange={(newVal) => {
                  setFormData(prev => ({
                    ...prev,
                    spouse: prev.spouse
                      ? {
                          ...prev.spouse,
                          fatherFirstName: newVal.firstName,
                          fatherMiddleName: newVal.middleName,
                          fatherLastName: newVal.lastName
                        }
                      : undefined
                  }));
                }}
              />
            </div>

            {/* Spouse Mother's Name */}
            <div className="md:col-span-3">
              <SplitNameInput
                label="Mother's Name"
                value={{
                  firstName: formData.spouse?.motherFirstName || "",
                  middleName: formData.spouse?.motherMiddleName || "",
                  lastName: formData.spouse?.motherLastName || ""
                }}
                onChange={(newVal) => {
                  setFormData(prev => ({
                    ...prev,
                    spouse: prev.spouse
                      ? {
                          ...prev.spouse,
                          motherFirstName: newVal.firstName,
                          motherMiddleName: newVal.middleName,
                          motherLastName: newVal.lastName
                        }
                      : undefined
                  }));
                }}
              />
            </div>

            <div>
              <label className={labelClass}>
                Education
              </label>
              <input
                type="text"
                name="education"
                value={formData.spouse?.education || ""}
                onChange={handleSpouseChange}
                className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Occupation Type
              </label>
              <select
                name="occupationType"
                value={formData.spouse?.occupationType || "Job"}
                onChange={handleSpouseChange}
                className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
              >
                <option value="Job">Job</option>
                <option value="Business">Business</option>
                <option value="Unoccupied">Unoccupied</option>
                <option value="House Wife">House Wife</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Occupation Location
              </label>
              <input
                type="text"
                name="occupationLocation"
                value={formData.spouse?.occupationLocation || ""}
                onChange={handleSpouseChange}
                className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Children Section - Only show if NOT Single */}
      {formData.maritalStatus !== "Single" && (
        <div className={`${cardClass} rounded-xl p-6 space-y-4 transition-all duration-300`}>
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Children
              </h3>
            </div>
            <button
              type="button"
              onClick={addChild}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Child
            </button>
          </div>

          {formData.children.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"} text-center`}>
                No children added yet. Click &quot;Add Child&quot; to add.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.children.map((child, index) => (
                <div
                  key={index}
                  className={`p-5 rounded-lg border relative ${theme === "dark" ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-200"} transition-all duration-300 hover:shadow-md fade-in`}
                >
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="absolute top-3 right-3 p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900 transition-all"
                    aria-label="Remove child"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <SplitNameInput
                        label="Full Name"
                        value={{
                          firstName: child.firstName,
                          middleName: child.middleName,
                          lastName: child.lastName,
                          personId: child.personId
                        }}
                        onChange={(newVal) => handleChildChangeByName(index, newVal)}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Date of Birth
                      </label>
                      <DatePicker
                        selected={child.dateOfBirth ? new Date(child.dateOfBirth) : null}
                        onChange={(date: Date | null) => {
                          setFormData((prev) => ({
                            ...prev,
                            children: prev.children.map((c, i) =>
                              i === index ? {
                                ...c,
                                dateOfBirth: date ? date.toISOString() : ""
                              } : c
                            )
                          }));
                        }}
                        className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
                        placeholderText="Select date"
                        dateFormat="dd/MM/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={child.gender}
                        onChange={(e) => handleChildChange(index, e)}
                        className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Education
                      </label>
                      <input
                        type="text"
                        name="education"
                        value={child.education}
                        onChange={(e) => handleChildChange(index, e)}
                        className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className={`flex flex-col sm:flex-row justify-end gap-4 pt-4 ${theme === "dark" ? "border-t border-gray-700" : "border-t border-gray-200"}`}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"}`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {initialData ? "Update Family" : "Save Family"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
