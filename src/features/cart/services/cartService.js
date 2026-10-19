import { supabase } from '../../../lib/supabase';

// undefined preserves the previous cart on a failed read; [] represents an empty cart.
export async function getCart(userId) {
  if (!supabase || !userId) return;
  const { data, error } = await supabase.from('cart_items').select('id, listing_id, quantity').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) {
    console.warn('Unable to load cart:', error.message);
    return;
  }
  const listingIds = (data || []).map((item) => item.listing_id);
  if (!listingIds.length) return [];
  const { data: listings, error: listingError } = await supabase.from('listings').select('*').in('id', listingIds);
  if (listingError) {
    console.warn('Unable to load cart listings:', listingError.message);
    return;
  }
  const listingMap = new Map((listings || []).map((listing) => [listing.id, listing]));
  return (data || []).filter((item) => listingMap.has(item.listing_id)).map((item) => ({ ...item, listing: listingMap.get(item.listing_id) }));
}

export function insertCartItem(userId, listingId) {
  return supabase.from('cart_items').insert({ user_id: userId, listing_id: listingId, quantity: 1 }).select('id, listing_id, quantity').single();
}

export async function deleteCartItem(userId, itemId) {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId).eq('user_id', userId);
  return error;
}
