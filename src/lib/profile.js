import { supabase } from './supabase'

export async function ensureUserProfile(user) {
  if (!supabase || !user?.id || !user.email) return { error: null }

  const fullName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email.split('@')[0]

  const { error } = await supabase.from('users').upsert({
    user_id: user.id,
    full_name: fullName,
    email: user.email,
  }, {
    onConflict: 'user_id',
    ignoreDuplicates: true,
  })

  return { error }
}
