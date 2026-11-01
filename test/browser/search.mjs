// Search works only on a built site, because the dev server has no index, so
// this runs in a browser against dist/. A status region inside the dialog once
// re-triggered its own observer and froze the tab on the first keystroke, which
// no unit test or dev run could see. Run with `bun run test:browser` after a
// build.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const port = 4399;
const base = `http://localhost:${port}`;
const pages = ['/docs/', '/docs/guides/backfill/', '/docs/v2/'];
const responsive = (page) =>
  Promise.race([
    page.evaluate(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);

const server = spawn('node_modules/.bin/astro', ['preview', '--port', String(port)], { stdio: 'ignore' });
const failures = [];
try {
  for (let i = 0; ; i++) {
    const up = await fetch(base).then((res) => res.ok, () => false);
    if (up) break;
    if (i === 60) throw new Error('the preview server did not start');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));

  for (const path of pages) {
    await page.goto(base + path);
    await page.click('site-search button');
    await page.waitForSelector('.pagefind-ui__search-input');
    await page.fill('.pagefind-ui__search-input', 'lexicon');
    await page.waitForSelector('.pagefind-ui__result-link', { timeout: 10_000 });
    if (!(await responsive(page))) {
      failures.push(`${path}: the page stopped responding after typing in search`);
      break;
    }
    const status = await page.textContent('.search-status');
    if (!/\d+ results? for lexicon/.test(status ?? '')) failures.push(`${path}: status region says "${status}"`);
  }
  await browser.close();
} finally {
  server.kill();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`search answered on ${pages.length} pages`);
