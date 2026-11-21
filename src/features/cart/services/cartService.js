import { supabase } from '../../../lib/supabase';
import { LISTING_DISPLAY_FIELDS } from '../../listings/listingFields';

// undefined preserves the previous cart on a failed read; [] represents an empty cart.
export async function getCart(userId) {
  if (!supabase || !userId) return;
  // The inner join omits missing, RLS-hidden, and unapproved listings in one request.
  const { data, error } = await supabase.from('cart_items')
    .select(`id, listing_id, quantity, listing:listings!cart_items_listing_id_fkey!inner(${LISTING_DISPLAY_FIELDS})`)
    .eq('user_id', userId).eq('listing.moderation_status', 'approved')
    .order('created_at', { ascending: true }).order('id', { ascending: true });
  if (error) {
    console.warn('Unable to load cart:', error.message);
    return;
  }
  return data || [];
}

export function insertCartItem(userId, listingId) {
  return supabase.from('cart_items').insert({ user_id: userId, listing_id: listingId, quantity: 1 }).select('id, listing_id, quantity').single();
}

export async function deleteCartItem(userId, itemId) {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId).eq('user_id', userId);
  return error;
}
