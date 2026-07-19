// Usage:
//   node scripts/test-scrapper.js                  — all stores, default queries
//   node scripts/test-scrapper.js amazon            — single store
//   node scripts/test-scrapper.js amazon headphones — single store + custom query

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EXT = path.resolve(__dirname, '../extension');
const UTILS = fs.readFileSync(path.join(EXT, 'scraper-utils.js'), 'utf8');
const PROFILE_DIR = path.join(os.homedir(), '.quick-shop-test-profile');
const BLOCK = new Set(['image', 'media', 'font', 'websocket']);

const STORES = [
  {
    id: 'amazon',
    script: 'content-amazon.js',
    query: 'headphones',
    url: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
    waitFor: '[data-asin]:not([data-asin=""])',
  },
  {
    id: 'flipkart',
    script: 'content-flipkart.js',
    query: 'headphones',
    url: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
    waitFor: 'a[href*="/p/"]',
  },
  {
    id: 'myntra',
    script: 'content-myntra.js',
    query: 'headphones',
    url: (q) => `https://www.myntra.com/${encodeURIComponent(q)}`,
    waitFor: 'li.product-base',
  },
  {
    id: 'nykaa',
    script: 'content-nykaa.js',
    query: 'moisturizer',
    url: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}`,
    waitFor: 'a[href*="/p/"][href*="productId"]',
  },
  {
    id: 'croma',
    script: 'content-croma.js',
    query: 'headphones',
    url: (q) => `https://www.croma.com/searchB?q=${encodeURIComponent(q + ':relevance')}&text=${encodeURIComponent(q)}`,
    waitFor: '.product-item',
    beforeScrape: async (page) => {
      try {
        await page.waitForSelector('.sign-in-pincode-continue', { timeout: 4000 });
        await page.click('.sign-in-pincode-continue');
      } catch { /* popup already dismissed or cached */ }
    },
  },
];

async function runStore(store) {
  const scriptCode = fs.readFileSync(path.join(EXT, store.script), 'utf8');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    bypassCSP: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-IN',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  await context.addInitScript(UTILS);
  await context.addInitScript(() => {
    window.__scraped = null;
    window.chrome = { runtime: { sendMessage: (msg) => { window.__scraped = msg; } } };
  });

  const page = await context.newPage();
  await page.route('**/*', r => BLOCK.has(r.request().resourceType()) ? r.abort() : r.continue());
  page.on('download', d => d.cancel().catch(() => {}));

  try {
    console.log(`\n[${store.id.toUpperCase()}] ${store.resolvedUrl}`);
    const t0 = Date.now();

    await page.goto(store.resolvedUrl, { waitUntil: 'commit', timeout: 20000 });
    await page.waitForTimeout(2000);

    if (store.beforeScrape) await store.beforeScrape(page);

    try {
      await page.waitForSelector(store.waitFor, { timeout: 12000 });
    } catch {
      console.log(`  WARNING: "${store.waitFor}" never appeared`);
    }

    const result = await page.evaluate(([utils, scraper]) => {
      if (!window.WishMeScraperUtils) { try { eval(utils); } catch(e) {} }
      window.__scraped = null;
      try {
        Object.defineProperty(window, 'chrome', {
          value: { runtime: { sendMessage: (msg) => { window.__scraped = msg; } } },
          writable: true, configurable: true,
        });
      } catch(e) {
        window.chrome = { runtime: { sendMessage: (msg) => { window.__scraped = msg; } } };
      }
      try { eval(`(function(){var chrome={runtime:{sendMessage:(msg)=>{window.__scraped=msg;}}}; ${scraper} })()`); } catch(e) { return { error: 'eval: ' + e.message }; }
      const d = window.__scraped;
      if (!d) return { error: 'sendMessage not called (0 products above threshold)' };
      const s = (d.products || [])[0];
      return {
        count: d.products?.length ?? 0,
        diagnostics: d.diagnostics,
        sample: s ? {
          title: s.title, price: s.price,
          brand: s.brand ?? null, category: s.category ?? null,
          productType: s.productType ?? null,
          keywords: s.keywords?.slice(0, 8) ?? [],
          id: s.storeProductId,
        } : null,
      };
    }, [UTILS, scriptCode]);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const ok = !result.error && result.count > 0;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${store.id.padEnd(10)} ${result.count ?? 0} products  ${elapsed}s`);

    if (result.error) {
      console.log(`  error: ${result.error}`);
    } else if (result.sample) {
      const s = result.sample;
      const d = result.diagnostics;
      console.log([
        `  title:       ${s.title?.slice(0, 70)}`,
        `  price/brand: ${s.price ?? '—'} / ${s.brand ?? '—'}`,
        `  cat/type:    ${s.category ?? '—'} / ${s.productType ?? '—'}`,
        `  keywords:    [${s.keywords.join(', ')}]`,
        `  id:          ${s.id}`,
        d ? `  cards: ${d.cardsFound}  extracted: ${d.extracted}  (${Math.round(d.extractionRate * 100)}%)` : '',
      ].filter(Boolean).join('\n'));
    }

    return ok;
  } finally {
    await context.close();
  }
}

(async () => {
  const [storeArg, queryArg] = process.argv.slice(2);

  let stores = storeArg
    ? STORES.filter(s => s.id === storeArg.toLowerCase())
    : STORES;

  if (!stores.length) {
    console.error(`Unknown store "${storeArg}". Available: ${STORES.map(s => s.id).join(', ')}`);
    process.exit(1);
  }

  stores = stores.map(s => ({
    ...s,
    resolvedUrl: s.url(queryArg || s.query),
  }));

  let passed = 0;
  for (const store of stores) {
    const ok = await runStore(store);
    if (ok) passed++;
  }

  console.log(`\n${passed}/${stores.length} passed`);
  process.exit(passed === stores.length ? 0 : 1);
})();
