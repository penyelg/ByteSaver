// Shared choices and upload formats used by the verification form.
export const ID_TYPES = [
  "Philippine National ID",
  "Passport",
  "Driver’s license",
  "UMID",
  "Other government-issued ID",
];
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Normalize local and international Philippine mobile formats; return null for invalid input.
export function normalizeMobile(value) {
  const phone = value.replace(/[\s()-]/g, "");
  if (/^09\d{9}$/.test(phone)) return `+63${phone.slice(1)}`;
  return /^\+639\d{9}$/.test(phone) ? phone : null;
}

// Check presence, image format, and the 5 MB limit before creating a preview or uploading.
export function validateIdentityPhoto(file) {
  if (!file) return "Take or upload a clear photo of your valid ID.";
  
  if (!PHOTO_TYPES.includes(file.type))
    return "Choose a JPG, PNG, or WebP photo.";

  if (file.size <= 0 || file.size > 5 * 1024 * 1024)
    return "Choose a photo between 1 byte and 5 MB.";

  return "";
}
// Buying and selling eligibility depends on both ID approval and account access.
export function isIdentityApproved(profile) {
  return (
    profile?.verification?.status === "approved" &&
    profile?.access?.status !== "suspended"
  );
}
