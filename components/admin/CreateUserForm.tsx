"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useRouter } from "next/navigation";

interface CreateUserFormProps {
  onSuccess?: () => void;
}

export default function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER" as "USER" | "ADMIN",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      setSuccess(`User ${data.user.email} created successfully!`);
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        role: "USER",
      });

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      } else {
        setTimeout(() => {
          router.push("/admin/users");
        }, 1500);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";
  const inputClass = theme === "dark"
    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Create New User</h1>
        <p className={textSecondary}>
          Add a new user to the system
        </p>
      </div>

      {error && (
        <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-red-900/30 text-red-300 border-red-800" : "bg-red-50 text-red-700 border-red-200"}`}>
          {error}
        </div>
      )}

      {success && (
        <div className={`p-5 rounded-lg border ${theme === "dark" ? "bg-green-900/30 text-green-300 border-green-800" : "bg-green-50 text-green-700 border-green-200"} flex items-center gap-3 fade-in`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      <div className={cardClass + " rounded-xl p-6"}>
        <form onSubmit={handleCreateUser} className="space-y-5">
          <div>
            <label htmlFor="email" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass}`}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass}`}
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass}`}
              placeholder="Confirm password"
            />
          </div>

          <div>
            <label htmlFor="role" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-lg border ${inputClass}`}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
            <p className={`text-xs mt-2 ${textSecondary}`}>
              Admins have full access to manage families and users
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold border ${theme === "dark" ? "border-gray-600 text-gray-200 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"} transition-all`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
