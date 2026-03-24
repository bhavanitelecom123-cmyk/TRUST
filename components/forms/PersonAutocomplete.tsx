"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface PersonAutocompleteProps {
  label: string;
  value: string;
  onChange: (name: string, personId?: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function PersonAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Search by name...",
  required = false
}: PersonAutocompleteProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700"
    : "bg-white border border-gray-200";

  const inputClass = theme === "dark"
    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500";

  // Fetch suggestions whenever query changes (debounced)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/persons/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.persons || []);
          setShowDropdown(data.persons?.length > 0);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (person: any) => {
    const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
    onChange(fullName, person.id);
    setQuery(fullName);
    setSelectedPerson(person);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedPerson(null);
    onChange(newValue); // Pass name only (no personId)
  };

  const handleClear = () => {
    setQuery("");
    setSelectedPerson(null);
    setSuggestions([]);
    onChange("");
  };

  return (
    <div className="relative">
      <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-3 rounded-lg border ${inputClass} transition-all min-h-[44px]`}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-9 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 ${cardClass} rounded-lg shadow-lg border max-h-60 overflow-y-auto`}
        >
          {suggestions.map((person) => {
            const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
            return (
              <div
                key={person.id}
                onClick={() => handleSelect(person)}
                className={`px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors`}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {fullName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {person.gender} • {person.isDeceased ? "Deceased" : "Alive"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
