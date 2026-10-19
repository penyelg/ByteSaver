import { supabase } from '../../../lib/supabase';

export async function getProfile(userId) {
  const [profile, verification, admin] = await Promise.all([
    supabase.from('users').select('id, full_name, address, phone, barangay_id').eq('id', userId).maybeSingle(),
    supabase.from('identity_submissions').select('id, status, submitted_at, reviewed_at, review_reason')
      .eq('user_id', userId).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc('is_identity_administrator'),
  ]);
  const error = profile.error || verification.error || admin.error || (!profile.data ? { message: 'Your profile is missing. Please contact support.' } : null);
  return { data: !error && profile.data ? { ...profile.data, verification: verification.data, is_admin: admin.data === true } : null, error };
}

export function getBarangays() {
  return supabase.from('barangays').select('id, name').eq('is_active', true).order('name');
}

