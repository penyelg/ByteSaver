import { supabase } from '../../../lib/supabase';

export function getReviewQueue(status) {
  return supabase.from('identity_submissions').select('*').eq('status', status)
    .order('submitted_at', { ascending: status === 'pending_review' }).limit(100);
}

export function getIdentityPhoto(path) {
  return supabase.storage.from('identity-documents').createSignedUrl(path, 120);
}

export function getPendingRequests() {
  return supabase.from('identity_submissions').select('id, full_name, id_type, submitted_at')
    .eq('status', 'pending_review').order('submitted_at', { ascending: true }).limit(5);
}

export function reviewIdentity(id, decision, reason) {
  return supabase.rpc('review_identity', { p_submission_id: id, p_decision: decision, p_reason: reason });
}

export async function getDashboardSummary() {
  const statuses = ['pending_review', 'approved', 'rejected'];
  const results = await Promise.all(statuses.map((status) => supabase.from('identity_submissions')
    .select('id', { count: 'exact', head: true }).eq('status', status)));
  const failure = results.find((result) => result.error);
  if (failure) throw failure.error;
  return Object.fromEntries(statuses.map((status, index) => [status, results[index].count]));
}
