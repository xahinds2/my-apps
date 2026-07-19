// Flipkart.com search results scraper

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const products = [];
  let droppedLowConfidence = 0;

  // Product links on Flipkart search pages all point to /p/ paths
  const links = document.querySelectorAll('a[href*="/p/"]');

  for (const link of links) {
    const href = link.href;
    if (!href.includes('flipkart.com') || !href.includes('/p/')) continue;

    // The <a> tag IS the product card — use it directly as container
    const container = link;

    // Title: img alt is set to the product name by Flipkart
    const imgEl = container.querySelector('img[alt]');
    const title = U.normalizeWhitespace(imgEl?.alt || link.getAttribute('title') || '');
    if (!title || title.length < 5) continue;

    // Image URL
    const image = imgEl?.src || null;

    // storeProductId: use the stable pid query param, fallback to path slug
    let storeProductId = '';
    try {
      storeProductId = new URL(href).searchParams.get('pid') || '';
    } catch { /* ignore */ }
    if (!storeProductId) {
      const m = href.match(/\/p\/([a-zA-Z0-9]+)/);
      if (!m) continue;
      storeProductId = m[1];
    }

    // Canonical URL: strip tracking query params, keep only the path
    const cleanUrl = href.split('?')[0];

    // Price: find first ₹ leaf text node inside this card
    let price = null;
    for (const el of container.querySelectorAll('*')) {
      const txt = el.childNodes[0]?.textContent?.trim() || '';
      if (txt.startsWith('₹') && el.children.length === 0) {
        const n = U.parsePrice(txt);
        if (n) { price = n; break; }
      }
    }

    // Rating: leaf element with a single number 1–5
    let rating = null;
    for (const el of container.querySelectorAll('*')) {
      if (el.children.length > 0) continue;
      const m = el.textContent?.trim().match(/^([1-5](\.\d)?)$/);
      if (m) { rating = parseFloat(m[1]); break; }
    }

    const product = {
      title,
      price,
      currency: 'INR',
      image,
      url: cleanUrl,
      store: 'flipkart',
      storeProductId,
      rating,
      reviews: null,
    };

    if (U.scoreProduct(product) < 5) {
      droppedLowConfidence += 1;
      continue;
    }

    products.push(product);
  }

  // Deduplicate by storeProductId
  const seen = new Set();
  const unique = products.filter(p => {
    if (seen.has(p.storeProductId)) return false;
    seen.add(p.storeProductId);
    return true;
  });

  if (unique.length === 0) return;

  const cardsFound = links.length;
  const drift = U.buildDriftMeta('flipkart', window.location.href, cardsFound, unique.length, droppedLowConfidence);

  chrome.runtime.sendMessage({
    type: 'SAVE_PRODUCTS',
    products: unique,
    source: window.location.href,
    diagnostics: drift,
  });
})();
