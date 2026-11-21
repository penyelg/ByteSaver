import { supabase } from "../../../lib/supabase";

// Combine profile details, the latest verification attempt, administrator permission, and access state.
export async function getProfile(userId) {

  // These reads are independent, so load them concurrently rather than one after another.
  const [profile, admin, access] = await Promise.all([
    supabase
      .from("users")
      .select(`id, full_name, address, phone, barangay_id,
        verification:identity_submissions!identity_submissions_user_id_fkey(
          id, status, submitted_at, reviewed_at, review_reason
        )`)
      .eq("id", userId)
      // Limit the embedded history, leaving profiles without a submission visible.
      .order("submitted_at", { referencedTable: "verification", ascending: false })
      .order("id", { referencedTable: "verification", ascending: false })
      .limit(1, { referencedTable: "verification" })
      .maybeSingle(),
    supabase.rpc("is_identity_administrator"),
    supabase.rpc("get_account_access"),
  ]);

  // Return no partial profile if any required check fails or the profile row is missing.
  const error = profile.error || admin.error || access.error ||
    (!profile.data
      ? { message: "Your profile is missing. Please contact support." }
      : null);
  return {
    data:
      !error && profile.data
        ? {
            ...profile.data,
            verification: profile.data.verification?.[0] || null,
            is_admin: admin.data === true,
            access: access.data,
          }
        : null,
    error,
  };
}

// Only active barangays are offered to applicants, ordered alphabetically.
export function getBarangays() {
  return supabase
    .from("barangays")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
}
