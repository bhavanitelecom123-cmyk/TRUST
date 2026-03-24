"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Person {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  isDeceased: boolean;
}

interface PersonSearchDropdownProps {
  onSelect: (person: Person) => void;
  onClose: () => void;
  initialQuery?: string;
}

export default function PersonSearchDropdown({
  onSelect,
  onClose,
  initialQuery = ""
}: PersonSearchDropdownProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700"
    : "bg-white border border-gray-200";

  const inputClass = theme === "dark"
    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500";

  // Focus input when mounted
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSelect = (person: Person) => {
    onSelect(person);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    if (newValue.trim().length >= 2) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search by name..."
        className={`w-full px-4 py-3 rounded-t-lg border ${inputClass} transition-all min-h-[44px]`}
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          className={`absolute z-50 w-full mt-1 ${cardClass} rounded-b-lg shadow-lg border max-h-60 overflow-y-auto`}
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
