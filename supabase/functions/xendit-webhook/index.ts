import { admin, uuid } from '../_shared/reservations.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const expected = Deno.env.get('XENDIT_WEBHOOK_TOKEN');
  const actual = request.headers.get('x-callback-token');
  if (!expected || !actual) return new Response(null, { status: 401 });
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([expected, actual].map(async (value) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
  ));
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference !== 0) return new Response(null, { status: 401 });

  const body = await request.json().catch(() => null);
  const data = body?.data;
  if (body?.event !== 'payment_session.completed' || !uuid.test(data?.reference_id ?? '')) {
    return new Response(null, { status: 204 });
  }
  if (data.session_type !== 'PAY' || data.status !== 'COMPLETED' || !Number.isFinite(data.amount)
    || typeof data.payment_session_id !== 'string' || typeof data.payment_id !== 'string') {
    return new Response(null, { status: 400 });
  }
  const reservation = await admin.from('listing_reservations').select('id').eq('id', data.reference_id).maybeSingle();
  if (reservation.error) return new Response(null, { status: 503 });
  if (!reservation.data) return new Response(null, { status: 204 });
  const result = await admin.rpc('confirm_listing_reservation', {
    p_id: data.reference_id, p_session: data.payment_session_id, p_payment: data.payment_id,
    p_fee: data.amount, p_currency: data.currency,
  });
  if (result.error) {
    console.error('Could not confirm reservation', result.error.code);
    return new Response(null, { status: 503 });
  }
  return new Response(null, { status: 204 });
});
