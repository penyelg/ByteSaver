import { supabase } from '../../../lib/supabase';

export function getManagedUsers({ search, access, verification, page }) {
  return supabase.rpc('admin_list_users', {
    p_search: search, p_access: access, p_verification: verification, p_page: page,
  });
}

export function getManagedUser(id) {
  return supabase.rpc('admin_get_user', { p_user_id: id });
}

export function changeUserAccess(user, reason) {
  return supabase.rpc('admin_set_user_access', {
    p_user_id: user.id, p_status: user.access_status === 'active' ? 'suspended' : 'active',
    p_expected_status: user.access_status, p_reason: reason.trim(),
  });
}
