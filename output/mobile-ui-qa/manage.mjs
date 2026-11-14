import fs from 'node:fs/promises';
const fixture = await fs.readFile('output/mobile-ui-qa/smoke.mjs', 'utf8');
const setup = fixture.slice(0, fixture.indexOf('\ntry {'));
const suite = String.raw`
try {
  items[0].moderation_status = 'pending';
  items[1].moderation_status = 'rejected';
  items[1].moderation_reason = 'Please include the exact model number and clarify the condition of the hardware.';
  items[2].image_url = null;
  await page.goto(origin + '/listings/manage');
  await page.locator('.seller-listing').first().waitFor();
  assert.equal(await page.locator('.seller-listing').count(), 10);
  for (const width of [390, 320, 1280]) {
    await page.setViewportSize({width, height:844});
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:out + '/manage-' + width + '.png'});
  }
  await page.getByRole('button', {name:'Next', exact:true}).click();
  assert.equal(await page.locator('.seller-listing').count(), 4);
  assert.match(await page.locator('.seller-result-count').innerText(), /11–14 of 14/);
  const filters = page.getByRole('group', {name:'Filter your listings'});
  await filters.getByRole('button', {name:/Pending/}).click();
  assert.equal(await page.locator('.seller-listing').count(), 4);
  await filters.getByRole('button', {name:/Hidden/}).click();
  await page.getByRole('heading', {name:'No listings here yet'}).waitFor();
  await page.getByRole('button', {name:'View all listings'}).click();
  await page.setViewportSize({width:390,height:844});
  const edit = page.getByRole('button', {name:/Edit listing:/}).first();
  await edit.click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({path:out + '/manage-edit-mobile.png'});
  assert.ok(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
  await page.setViewportSize({width:320,height:844});
  assert.ok(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
  await page.screenshot({path:out + '/manage-edit-320.png'});
  await page.setViewportSize({width:1280,height:844});
  await page.screenshot({path:out + '/manage-edit-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(await edit.evaluate(el => el === document.activeElement), true);
  await edit.click();
  await page.getByLabel('Model', {exact:true}).fill('Updated RTX 3060');
  await page.getByRole('button', {name:'Save changes',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.match(await page.locator('.seller-listing').first().innerText(), /Updated RTX 3060/);
  assert.match(await page.locator('.sell-notice').innerText(), /saved and awaiting review/);
  await context.route('**/rest/v1/listings*', route => route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.reload();
  await page.getByRole('heading', {name:'Your next sale starts here'}).waitFor();
  await page.screenshot({path:out + '/manage-empty.png'});
  assert.deepEqual(errors, []);
  console.log('PASS: responsive layouts, 10-per-page pagination, filters, empty states, modal focus/Escape, and saving edits with fixture data.');
} finally { await browser.close(); }
`;
await import('data:text/javascript;base64,' + Buffer.from(setup + suite).toString('base64'));
