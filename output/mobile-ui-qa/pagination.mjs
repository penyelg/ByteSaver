import fs from 'node:fs/promises';
// Reuse the isolated account/API fixtures, without running the earlier smoke suite.
const fixture = await fs.readFile('output/mobile-ui-qa/smoke.mjs', 'utf8');
const setup = fixture.slice(0, fixture.indexOf('\ntry {'));
const suite = String.raw`
let failNext = false;
const requests = [];
await context.route('**/rest/v1/rpc/browse_marketplace_listings*', async route => {
  const req = route.request(), p = new URL(req.url()).searchParams;
  const offset = Number(p.get('offset') || 0), limit = Number(p.get('limit'));
  assert.equal(limit, 10);
  assert.match(req.headers().prefer, /count=exact/);
  requests.push({ offset, filters: p.getAll('or'), order: p.get('order') });
  if (failNext) { failNext = false; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({message:'Temporary fixture error'}) }); }
  let rows = items.filter(x => x.price <= Number(p.get('price')?.slice(4) || 150000));
  if (p.has('category')) rows = rows.filter(x => x.category === p.get('category').slice(3));
  for (const group of p.getAll('or')) {
    const terms = [...group.matchAll(/(brand|model|description|category|condition)\.ilike\."%([^%]*)%"/g)];
    rows = rows.filter(row => terms.some(([,field,term]) => String(row[field]).toLowerCase().includes(term.toLowerCase())));
  }
  const asc = p.get('order')?.startsWith('price.asc');
  rows.sort((a,b) => p.get('order')?.startsWith('price.') ? (asc ? a.price-b.price : b.price-a.price) || b.id.localeCompare(a.id) : b.id.localeCompare(a.id));
  const total = rows.length;
  await route.fulfill({status:200, contentType:'application/json', body:JSON.stringify(rows.slice(offset,offset+limit)), headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-range':offset+'-'+(Math.min(offset+limit,total)-1)+'/'+total}});
});
async function summary(text) { await page.waitForFunction(value => document.querySelector('.browse-result-summary')?.textContent === value, text); }
try {
  await page.goto(origin); await summary('Showing 1–10 of 14 listings');
  assert.equal(await page.locator('.listing-card').count(),10);
  const nav = page.getByRole('navigation',{name:'Browse pages'});
  assert.ok(await nav.getByRole('button',{name:'Previous'}).isDisabled());
  await nav.getByRole('button',{name:'Next',exact:true}).click(); await summary('Showing 11–14 of 14 listings');
  assert.equal(await page.locator('.listing-card').count(),4);
  assert.equal(requests.at(-1).offset,10);
  assert.ok(await nav.getByRole('button',{name:'Next',exact:true}).isDisabled());
  await page.locator('.browse-pagination').scrollIntoViewIfNeeded(); await page.screenshot({path:out+'/pagination-mobile.png'});
  await nav.getByRole('button',{name:'Previous'}).click(); await summary('Showing 1–10 of 14 listings');
  await nav.getByRole('button',{name:'Next',exact:true}).click(); await summary('Showing 11–14 of 14 listings');
  await page.getByRole('button',{name:'GPU',exact:true}).click(); await summary('Showing 1–7 of 7 listings');
  assert.equal(requests.at(-1).offset,0);
  await page.getByRole('button',{name:'All hardware',exact:true}).click(); await summary('Showing 1–10 of 14 listings');
  const search=page.getByRole('searchbox',{name:'Search hardware',exact:true});
  await search.fill('MSI RTX'); await summary('Showing 1–7 of 7 listings'); assert.equal(requests.at(-1).filters.length,2);
  await search.fill('No such hardware'); await summary('0 listings'); assert.equal(await page.locator('.browse-pagination').count(),0);
  await search.fill(''); await summary('Showing 1–10 of 14 listings');
  await nav.getByRole('button',{name:'Next',exact:true}).click(); await summary('Showing 11–14 of 14 listings');
  await page.locator('.sort-control select').selectOption('price-low'); await summary('Showing 1–10 of 14 listings');
  assert.match(requests.at(-1).order,/^price.asc,created_at.desc.nullslast,id.desc$/);
  assert.match(await page.locator('.listing-meta strong').first().innerText(),/Ryzen/);
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await page.getByLabel('Excellent',{exact:true}).check(); await summary('0 listings');
  await page.getByRole('button',{name:'RESET ALL',exact:true}).click(); await summary('Showing 1–10 of 14 listings');
  failNext=true; await nav.getByRole('button',{name:'Next',exact:true}).click(); await page.getByRole('button',{name:'Try again'}).waitFor();
  await page.getByRole('button',{name:'Try again'}).click(); await summary('Showing 11–14 of 14 listings');
  for (const width of [320,1280]) {
    await page.setViewportSize({width,height:844}); await page.locator('.browse-pagination').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:out+'/pagination-'+width+'.png'});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: ten-row backend ranges, next/previous, last page, global search, category/condition filters, sort/reset, empty results, error/retry, mobile/desktop layouts.');
} finally { await browser.close(); }
`;
await import('data:text/javascript;base64,' + Buffer.from(setup + suite).toString('base64'));
