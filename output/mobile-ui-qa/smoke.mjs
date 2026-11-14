// Isolated browser verification. All backend traffic is fulfilled with fixtures.
// Usage: node output/mobile-ui-qa/smoke.mjs (requires the local Vite server).
import { chromium } from 'file:///C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = 'output/mobile-ui-qa';
const origin = 'http://127.0.0.1:5174';
const env = await fs.readFile('.env', 'utf8');
const backend = new URL(env.match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]);
const userId = '11111111-1111-4111-8111-111111111111';
const rid = '22222222-2222-4222-8222-222222222222';
const image = '/src/assets/bytesaver-mark-transparent.png';
const items = Array.from({ length: 14 }, (_, i) => ({ id: `item-${i}`, brand: i % 2 ? 'AMD' : 'MSI', model: i % 2 ? 'Ryzen 5 5600' : 'RTX 3060 12GB', category: i % 2 ? 'CPU' : 'GPU', price: i % 2 ? 5800 : 12500, condition: 'Good', image_url: image, specs: { memory: '12 GB' }, description: 'Test fixture: used hardware with original box. Fully working.', moderation_status: i < 11 ? 'approved' : 'pending', created_at: '2026-11-14T00:00:00Z' }));
const profile = { id: userId, full_name: 'Ana Reyes', phone: '+639171234567', address: 'Isabel, Leyte', barangay_id: '1' };
let verification = 'approved';
let access = 'active';
let inserted;
const records = [{ id: rid, item_name: 'MSI RTX 3060 12GB', item_price: 12500, fee: 100, status: 'reserved', is_seller: false, expires_at: new Date(Date.now() + 86400000).toISOString(), seller_phone: '+639171234567' }, { id: 'seller-reservation', item_name: 'AMD Ryzen 5 5600', item_price: 5800, fee: 100, status: 'reserved', is_seller: true, expires_at: new Date(Date.now() + 86400000).toISOString() }];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
await context.route('**/*', async route => {
  const req = route.request(); const url = new URL(req.url());
  if (url.origin === origin || /fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) return route.continue();
  if (url.hostname !== backend.hostname) return route.abort();
  let body = [];
  const path = url.pathname;
  if (path.includes('/auth/')) body = { id: userId, email: 'ana@example.com', user_metadata: {} };
  else if (path.endsWith('/rpc/browse_marketplace_listings')) {
    const p = url.searchParams;
    let rows = items.filter(item => item.price <= Number(p.get('price')?.slice(4) || 150000));
    if (p.has('category')) rows = rows.filter(item => item.category === p.get('category').slice(3));
    for (const group of p.getAll('or')) {
      const filters = [...group.matchAll(/(brand|model|description|category|condition)\.ilike\."%([^%]*)%"/g)];
      rows = rows.filter(item => filters.some(([, field, term]) => String(item[field]).toLowerCase().includes(term.toLowerCase())));
    }
    const offset = Number(p.get('offset') || 0), limit = Number(p.get('limit') || 10);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows.slice(offset, offset + limit)), headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-range': `${offset}-${Math.min(offset + limit, rows.length) - 1}/${rows.length}` } });
  }
  else if (path.endsWith('/rpc/is_identity_administrator')) body = false;
  else if (path.endsWith('/rpc/get_account_access')) body = { status: access, reason: 'Test account restriction' };
  else if (path.endsWith('/users')) body = profile;
  else if (path.endsWith('/identity_submissions')) body = { id: rid, status: verification, submitted_at: '2026-11-14T00:00:00Z' };
  else if (path.endsWith('/categories')) body = [{ id: 'gpu', name: 'GPU' }, { id: 'cpu', name: 'CPU' }];
  else if (path.endsWith('/category_specifications')) body = [{ spec_key: 'memory', label: 'Memory', input_type: 'text', is_required: true }];
  else if (path.endsWith('/barangays')) body = [{ id: '1', name: 'Matlang' }];
  else if (path.endsWith('/cart_items')) body = [{ id: 'cart-1', listing_id: 'item-0' }];
  else if (path.endsWith('/listings')) {
    if (req.method() === 'POST') { inserted = req.postDataJSON(); body = []; }
    else if (req.method() === 'PATCH') body = { ...items[0], ...req.postDataJSON(), moderation_status: 'pending' };
    else body = url.searchParams.has('id') ? [items[0]] : items;
  }
  else if (path.includes('/storage/')) body = { Key: 'listing-images/test.png' };
  else if (path.endsWith('/functions/v1/reservations')) {
    const data = req.postDataJSON();
    if (data.action === 'quote') body = { status: 'available', enabled: true, seller: false, fee: 125, holdMinutes: 720, price: 12500 };
    else if (data.action === 'list') body = { reservations: records };
    else if (data.action === 'payment-status') body = { reservation: { ...records[0], paid_at: new Date().toISOString(), xendit_payment_id: 'fixture-payment-reference' } };
    else if (data.action === 'checkout') body = { checkoutUrl: origin + '/reservations/payment?reservation=' + rid };
    else body = {};
  } else throw new Error('Unmocked backend request: ' + path);
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
});
await context.addInitScript(({ key, userId }) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify({ sub: userId, exp, role: 'authenticated' })) + '.fixture';
  localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'fixture', token_type: 'bearer', expires_at: exp, expires_in: 3600, user: { id: userId, email: 'ana@example.com', user_metadata: { avatar_url: '/src/assets/bytesaver-mark-transparent.png' } } }));
}, { key: `sb-${backend.hostname.split('.')[0]}-auth-token`, userId });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
async function capture(name) {
  await page.evaluate(() => document.fonts.ready);
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(size.scroll <= size.width, `${name}: horizontal overflow ${JSON.stringify(size)}`);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
try {
  await page.goto(origin); await page.locator('.listing-card').first().waitFor();
  await capture('01-browse');
  await page.getByRole('searchbox', { name: 'Search hardware', exact: true }).fill('Ryzen');
  await page.waitForFunction(() => document.querySelector('.browse-result-summary')?.textContent === 'Showing 1–7 of 7 listings');
  assert.equal(await page.locator('.listing-card').count(), 7);
  await page.getByRole('searchbox', { name: 'Search hardware', exact: true }).fill('');
  await page.getByRole('button', { name: 'Shopping bag' }).click();
  await page.locator('dialog').waitFor(); await capture('02-cart');
  await page.getByRole('button', { name: 'View item', exact: true }).click();
  await page.getByRole('button', { name: 'Reserve item', exact: true }).waitFor();
  await capture('03-details');
  await page.getByRole('button', { name: 'Reserve item', exact: true }).click();
  await page.locator('dialog').waitFor();
  assert.match(await page.locator('dialog').innerText(), /125\.00/);
  assert.match(await page.locator('dialog').innerText(), /12 hours/);
  await capture('04-reserve');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').count(), 0);
  await page.goto(origin + '/listings/new'); await page.getByRole('heading', { name: 'Sell an item' }).waitFor();
  await capture('05-sell-photo');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Sell an item' }).count(), 1);
  await page.locator('input[type=file]').setInputFiles('src/assets/bytesaver-mark-transparent.png');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('heading', { name: 'Item details', exact: true }).waitFor();
  await page.getByLabel('Brand', { exact: true }).fill('MSI'); await page.getByLabel('Model', { exact: true }).fill('RTX 3060');
  await page.getByLabel('Price (₱)', { exact: true }).fill('12500'); await page.getByLabel('Memory', { exact: true }).fill('12 GB');
  await page.getByLabel('Description', { exact: true }).fill('Fixture product description'); await capture('06-sell-details');
  await page.getByRole('button', { name: 'Review listing', exact: true }).click(); await capture('07-sell-review');
  await page.getByRole('button', { name: 'Back', exact: true }).click(); assert.equal(await page.getByLabel('Brand', { exact: true }).inputValue(), 'MSI');
  await page.getByRole('button', { name: 'Review listing', exact: true }).click();
  await page.getByRole('button', { name: 'Submit for approval', exact: true }).click();
  await page.getByRole('heading', { name: 'My listings', exact: true }).waitFor();
  assert.equal(inserted.brand, 'MSI'); assert.equal(inserted.specs.memory, '12 GB');
  assert.equal(await page.locator('.manage-listings li').count(), 10); await capture('08-manage');
  await page.getByRole('button', { name: 'Next', exact: true }).click(); assert.equal(await page.locator('.manage-listings li').count(), 4);
  await page.getByRole('group', { name: 'Filter your listings' }).getByRole('button', { name: /Pending/ }).click(); assert.equal(await page.locator('.manage-listings li').count(), 3);
  await page.goto(origin + '/reservations'); await page.locator('.reservation-card').waitFor(); await capture('09-buying');
  await page.getByRole('button', { name: 'Selling', exact: true }).click(); await capture('10-selling');
  await page.goto(origin + '/account'); await page.getByRole('heading', { name: 'My account' }).waitFor(); await page.locator('.shop-personal-info summary').click(); await capture('11-account');
  await page.goto(origin + '/reservations/payment?reservation=' + rid); await page.getByRole('heading', { name: 'Payment Successful' }).waitFor(); await capture('12-payment');
  verification = 'pending_review'; await page.goto(origin); await page.getByRole('heading', { name: 'Verification in progress' }).waitFor(); await capture('13-pending');
  verification = 'rejected'; await page.reload(); await page.locator('.profile-setup-form').waitFor(); await capture('14-profile');
  access = 'suspended'; await page.reload(); await page.getByRole('heading', { name: 'Your account is suspended.' }).waitFor(); await capture('15-suspended');
  access = 'active'; verification = 'approved';
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(origin); await page.locator('.listing-card').first().waitFor(); await capture(`browse-${width}`);
    await page.goto(origin + '/listings/new'); await page.getByRole('heading', { name: 'Sell an item' }).waitFor(); await capture(`sell-${width}`);
  }
  const signedOut = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const authPage = await signedOut.newPage(); await authPage.goto(origin); await authPage.getByRole('button', { name: 'CONTINUE WITH GOOGLE' }).waitFor();
  await authPage.screenshot({ path: `${out}/16-auth.png`, fullPage: true });
  assert.deepEqual(errors, []); console.log('PASS: 18 viewport checks, shopping, quote values, dialog Escape, required fields, wizard persistence/submission, 10-row pagination, account states. All backend writes mocked.');
} finally { await browser.close(); }
