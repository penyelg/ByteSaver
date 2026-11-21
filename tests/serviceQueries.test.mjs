import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

// Exercise the real PostgREST builder while replacing only its HTTP transport.
let requests = [];
let responses = {};
globalThis.serviceQueryTestClient = createClient('https://example.supabase.co', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (input, init) => {
    const url = new URL(input);
    requests.push({ url, init });
    const response = responses[url.pathname];
    assert.ok(response, `Unexpected request: ${url.pathname}`);
    return new Response(JSON.stringify(response.body), {
      status: response.status || 200,
      headers: { 'Content-Type': 'application/json', ...response.headers },
    });
  } },
});

registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.includes('/src/') && specifier.endsWith('/lib/supabase')) {
    return { url: 'data:text/javascript,export const supabase = globalThis.serviceQueryTestClient;', shortCircuit: true };
  }
  if (context.parentURL?.includes('/src/') && specifier.endsWith('/listings/listingFields')) {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
} });

const { getCart } = await import('../src/features/cart/services/cartService.js');
const { getProfile } = await import('../src/features/account/services/profileService.js');
const { fetchMarketplacePage } = await import('../src/features/marketplace/services/marketplaceService.js');

function reset(nextResponses) { requests = []; responses = nextResponses; }

function profileResponses(rows, access = { body: { status: 'active' } }) {
  return {
    '/rest/v1/users': { body: rows },
    '/rest/v1/rpc/is_identity_administrator': { body: true },
    '/rest/v1/rpc/get_account_access': access,
  };
}

test('cart loads detail-ready listings in one user-scoped request', async () => {
  const items = [{ id: 'cart-1', listing_id: 'listing-1', quantity: 1,
    listing: { id: 'listing-1', description: 'Working GPU', specs: { memory: '8 GB' } } }];
  reset({ '/rest/v1/cart_items': { body: items } });
  assert.deepEqual(await getCart('buyer-1'), items);
  assert.equal(requests.length, 1);
  const params = requests[0].url.searchParams;
  assert.equal(params.get('user_id'), 'eq.buyer-1');
  assert.equal(params.get('listing.moderation_status'), 'eq.approved');
  assert.match(params.get('select'), /listing:listings!cart_items_listing_id_fkey!inner\(/);
  assert.match(params.get('select'), /description,specs/);
  assert.ok(!params.get('select').includes('*'));
  assert.equal(params.get('order'), 'created_at.asc,id.asc');
});

test('empty cart clears saved items; a failed read preserves them; signed-out reads are skipped', async () => {
  reset({ '/rest/v1/cart_items': { body: [] } });
  assert.deepEqual(await getCart('buyer-1'), []);
  assert.equal(requests.length, 1);
  reset({ '/rest/v1/cart_items': { status: 403, body: { message: 'Forbidden', code: '42501' } } });
  assert.equal(await getCart('buyer-1'), undefined);
  reset({});
  assert.equal(await getCart(null), undefined);
  assert.equal(requests.length, 0);
});

test('profile embeds only the latest submission while retaining the public result shape', async () => {
  const verification = { id: 'submission-1', status: 'approved' };
  reset(profileResponses([{ id: 'user-1', full_name: 'Test User', verification: [verification] }]));
  assert.deepEqual(await getProfile('user-1'), {
    data: { id: 'user-1', full_name: 'Test User', verification, is_admin: true, access: { status: 'active' } }, error: null,
  });
  assert.equal(requests.length, 3);
  const params = requests.find(({ url }) => url.pathname === '/rest/v1/users').url.searchParams;
  assert.equal(params.get('id'), 'eq.user-1');
  assert.match(params.get('select'), /verification:identity_submissions!identity_submissions_user_id_fkey\(/);
  assert.ok(!params.get('select').includes('!inner'));
  assert.equal(params.get('verification.limit'), '1');
  assert.equal(params.get('verification.order'), 'submitted_at.desc,id.desc');
});

test('new applicants remain visible; missing profiles and access-check failures never return partial profiles', async () => {
  reset(profileResponses([{ id: 'user-1', verification: [] }]));
  assert.equal((await getProfile('user-1')).data.verification, null);
  reset(profileResponses([]));
  const missing = await getProfile('user-1');
  assert.equal(missing.data, null);
  assert.match(missing.error.message, /profile is missing/);
  reset(profileResponses([{ id: 'user-1', verification: [] }], {
    status: 403, body: { message: 'Access check denied', code: '42501' },
  }));
  const denied = await getProfile('user-1');
  assert.equal(denied.data, null);
  assert.equal(denied.error.code, '42501');
});

test('marketplace keeps protected RPC, exact pagination, filters, and detail fields', async () => {
  reset({ '/rest/v1/rpc/browse_marketplace_listings': { body: [], headers: { 'Content-Range': '10-19/23' } } });
  const { count, error } = await fetchMarketplacePage(globalThis.serviceQueryTestClient, {
    page: 2, query: 'MSI B550', activeCategory: 'Motherboard', sortBy: 'price-low',
    selectedConditions: ['Like new'], maxPrice: 20000,
  }, new AbortController().signal);
  assert.equal(error, null);
  assert.equal(count, 23);
  assert.equal(requests.length, 1);
  const params = requests[0].url.searchParams;
  assert.equal(params.get('offset'), '10');
  assert.equal(params.get('limit'), '10');
  assert.equal(params.get('category'), 'eq.Motherboard');
  assert.equal(params.get('price'), 'lte.20000');
  assert.equal(params.getAll('or').length, 3);
  assert.equal(params.get('order'), 'price.asc,created_at.desc.nullslast,id.desc');
  assert.match(params.get('select'), /description,specs/);
  assert.ok(!params.get('select').includes('moderation_reason'));
  assert.match(new Headers(requests[0].init.headers).get('Prefer'), /count=exact/);
});
