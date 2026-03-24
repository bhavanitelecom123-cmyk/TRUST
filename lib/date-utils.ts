/**
 * Utility function to calculate age from date of birth
 * @param dateOfBirth - The date of birth as a string or Date
 * @returns The age in years, or null if dateOfBirth is invalid
 */
export function calculateAge(dateOfBirth: string | Date | null | undefined): number | null {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Format age display with years
 * @param dateOfBirth - The date of birth as a string or Date
 * @returns Formatted age string like "age: 25" or empty string if invalid
 */
export function formatAge(dateOfBirth: string | Date | null | undefined): string {
  const age = calculateAge(dateOfBirth);
  return age !== null ? `age: ${age}` : "";
}
