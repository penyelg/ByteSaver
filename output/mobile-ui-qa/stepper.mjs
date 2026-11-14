import fs from 'node:fs/promises';
const fixture = await fs.readFile('output/mobile-ui-qa/smoke.mjs', 'utf8');
const setup = fixture.slice(0, fixture.indexOf('\ntry {'));
const suite = String.raw`
try {
  await page.goto(origin + '/listings/new');
  await page.getByRole('heading', { name: 'Sell an item' }).waitFor();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    const sizes = await page.locator('.shop-form-steps li > span').evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    for (const size of sizes) assert.deepEqual(size, { width: 40, height: 40 });
    await page.locator('.shop-form-steps').screenshot({ path: out + '/stepper-' + width + '.png' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('input[type=file]').setInputFiles('src/assets/bytesaver-mark-transparent.png');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await page.locator('.shop-form-steps li[data-complete="true"]').count(), 1);
  await page.locator('.shop-form-steps').screenshot({ path: out + '/stepper-completed.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: step sizes and layout at 320, 390, 1280px; completed state; no browser errors.');
} finally { await browser.close(); }
`;
await import('data:text/javascript;base64,' + Buffer.from(setup + suite).toString('base64'));
