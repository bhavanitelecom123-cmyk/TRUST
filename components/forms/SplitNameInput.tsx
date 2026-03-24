"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import PersonSearchDropdown from "./PersonSearchDropdown";

interface SplitNameValue {
  firstName: string;
  middleName: string;
  lastName: string;
  personId?: string;
}

interface SplitNameInputProps {
  label: string;
  value: SplitNameValue;
  onChange: (value: SplitNameValue) => void;
  required?: boolean;
  placeholderPrefix?: string;
}

export default function SplitNameInput({
  label,
  value,
  onChange,
  required = false,
  placeholderPrefix = ""
}: SplitNameInputProps) {
  const { theme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700"
    : "bg-white border border-gray-200";

  const handleFieldChange = (field: keyof SplitNameValue, fieldValue: string) => {
    // When user manually types, clear personId to indicate manual entry
    if (field !== "personId" && value.personId) {
      onChange({ ...value, [field]: fieldValue, personId: undefined });
    } else {
      onChange({ ...value, [field]: fieldValue });
    }
  };

  const handlePersonSelect = (person: any) => {
    const newValue: SplitNameValue = {
      firstName: person.firstName || "",
      middleName: person.middleName || "",
      lastName: person.lastName || "",
      personId: person.id
    };
    onChange(newValue);
    setShowSearch(false);
  };

  // Build input class based on theme, without borders (container provides border)
  const getInputClasses = (hasLeftBorder: boolean) => {
    const borderClass = hasLeftBorder
      ? theme === "dark"
        ? "border-l border-gray-600"
        : "border-l border-gray-300"
      : "";
    return `${theme === "dark" ? "bg-gray-700 text-white placeholder-gray-400" : "bg-gray-50 text-gray-900 placeholder-gray-500"} flex-1 border-none focus:ring-0 px-3 py-2 min-h-[44px] ${borderClass}`;
  };

  const containerBorderClass = theme === "dark" ? "border-gray-600" : "border-gray-300";

  return (
    <div className="space-y-2">
      <label className={`block text-sm font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div
          className={`flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${containerBorderClass}`}
        >
          {/* First Name */}
          <input
            type="text"
            value={value.firstName}
            onChange={(e) => handleFieldChange("firstName", e.target.value)}
            placeholder={`${placeholderPrefix}First`}
            className={getInputClasses(false)}
          />

          {/* Middle Name */}
          <input
            type="text"
            value={value.middleName}
            onChange={(e) => handleFieldChange("middleName", e.target.value)}
            placeholder={`${placeholderPrefix}Middle`}
            className={getInputClasses(true)}
          />

          {/* Last Name */}
          <input
            type="text"
            value={value.lastName}
            onChange={(e) => handleFieldChange("lastName", e.target.value)}
            placeholder={`${placeholderPrefix}Last`}
            className={getInputClasses(true)}
          />

          {/* Search Button */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-0 transition-colors flex items-center justify-center"
            title="Search existing person"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Search Dropdown */}
        {showSearch && (
          <div className="absolute z-50 mt-1 w-full">
            <PersonSearchDropdown
              onSelect={handlePersonSelect}
              onClose={() => setShowSearch(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
