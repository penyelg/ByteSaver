import { supabase } from '../../lib/supabase';

export const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export const reservationDate = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
});

export async function reservationRequest(action, values = {}) {
  const { data, error } = await supabase.functions.invoke('reservations', {
    body: { action, ...values },
  });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || error.message);
  }
  return data;
}
