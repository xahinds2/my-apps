// Unified scraper for all stores — config lives in store-selectors.js.
// Adding a new store requires only: a new entry in store-selectors.js + URL patterns in manifest.json.

(function scrapeStore() {
  const U = window.GroceryScraperUtils;
  const ALL = window.STORE_SELECTORS;
  if (!U || !ALL) return;

  // Detect store by matching hostname against each entry's hosts array
  const host = window.location.hostname;
  const storeKey = Object.keys(ALL).find(k => ALL[k].hosts?.some(h => host.includes(h)));
  if (!storeKey) return;

  const S = ALL[storeKey];
  const query = new URLSearchParams(window.location.search).get('query') || '';

  function structuralExtract(link, rule) {
    const spans = [...link.querySelectorAll('span')];
    if (rule === 'first-rupee-span') {
      for (const s of spans) {
        const t = s.textContent.trim();
        if (/^₹[\d.]+$/.test(t)) return t;
      }
    }
    if (rule === 'first-alpha-span') {
      for (const s of spans) {
        const t = s.textContent.trim();
        if (/^[A-Za-z]/.test(t) && !/^off$/i.test(t)) return t;
      }
    }
    if (rule === 'last-span') {
      return spans.length ? spans[spans.length - 1].textContent.trim() : '';
    }
    if (rule === 'first-digit-span') {
      for (const s of spans) {
        const t = s.textContent.trim();
        if (/^\d/.test(t)) return t;
      }
    }
    if (rule === 'img-alt') {
      const img = link.querySelector('img[alt]');
      return img ? img.alt.trim() : '';
    }
    if (rule === 'first-visible-number') {
      for (const el of link.querySelectorAll('*')) {
        if (el.children.length > 0) continue;
        if (el.getAttribute('aria-hidden') === 'true') continue;
        const t = el.textContent.trim();
        if (/^\d+(\.\d+)?$/.test(t)) return t;
      }
    }
    if (rule === 'first-unit-text') {
      const unitRe = /\d+\.?\d*\s*(kg|g|gm|ml|l|ltr|pack|pcs|piece)\b/i;
      for (const el of link.querySelectorAll('*')) {
        const t = el.textContent.trim();
        if (unitRe.test(t) && t.length < 30) return (t.match(unitRe) || [''])[0];
      }
    }
    return '';
  }

  function extractField(card, fieldConfig) {
    if (!fieldConfig) return '';
    if (fieldConfig.type === 'structural') return structuralExtract(card, fieldConfig.rule);
    if (fieldConfig.type === 'selector') return U.pickText(card, fieldConfig.selectors) || '';
    return '';
  }

  // Grab the first non-placeholder product image; handles lazy-loaded (data-src) imgs too
  function extractImage(card) {
    const imgs = card.querySelectorAll('img[src], img[data-src]');
    for (const img of imgs) {
      const src = (img.dataset.src || img.src || '').trim();
      if (src && src.startsWith('http') && !src.includes('data:image') && src.length > 20) return src;
    }
    return '';
  }

  function tryExtract() {
    const links = document.querySelectorAll(S.card);
    const seen = new Set();
    const products = [];
    let dropped = 0;

    for (const link of links) {
      const href = link.href || '';
      const rawName = extractField(link, S.name);
      const name = rawName.replace(/^Sponsored\s*/i, '').trim();
      if (!name || name.length < 3) continue;

      const dedupKey = href || name;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const rawPrice = extractField(link, S.price);
      const price = U.parsePrice(rawPrice) ?? U.findPriceNear(link);
      const rawUnit = extractField(link, S.unit);
      const unit = rawUnit || U.findUnitNear(link);

      const product = { name, price, unit, productName: name, productUrl: href ? href.split('?')[0] : window.location.href, imageUrl: extractImage(link), store: storeKey };
      if (U.scoreProduct(product) < 4) { dropped++; continue; }
      products.push(product);
    }

    return { products, cardsFound: links.length, dropped };
  }

  function run(retries) {
    const { products, cardsFound, dropped } = tryExtract();
    if (products.length === 0 && retries > 0) { setTimeout(() => run(retries - 1), 1500); return; }
    if (products.length === 0) return;

    const diagnostics = U.buildDriftMeta(storeKey, window.location.href, cardsFound, products.length);
    chrome.runtime.sendMessage({
      type: 'SAVE_GROCERY_PRICES',
      store: storeKey,
      products,
      source: { query, pageUrl: window.location.href },
      diagnostics,
    });
  }

  run(3);
})();
