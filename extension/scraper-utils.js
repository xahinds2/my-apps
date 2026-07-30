// Shared scraper utilities — price parsing, DOM picking, and drift detection.
// Mirrors the WishMe Scraper pattern so store scripts stay thin.

(function attachGroceryScraperUtils() {
  function normalizeWhitespace(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  // Try each selector in order; return the first non-empty text.
  function pickText(root, selectors, options) {
    const opts = options || {};
    for (const sel of selectors || []) {
      const el = root.querySelector(sel);
      if (!el) continue;
      const raw = opts.useInnerText ? el.innerText : el.textContent;
      const text = normalizeWhitespace(raw);
      if (text) return text;
    }
    return null;
  }

  // Mirror the server's parsePrice: drop digit-group commas, take first number token.
  function parsePrice(value) {
    if (value == null) return null;
    const m = String(value).replace(/,/g, '').match(/\d+(\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  // Heuristic: scan leaf nodes inside a card for the first ₹ amount.
  function findPriceNear(card) {
    if (!card) return null;
    const nodes = card.querySelectorAll('*');
    for (const el of nodes) {
      if (el.children.length > 0) continue;
      const txt = normalizeWhitespace(el.textContent);
      if (/₹/.test(txt) || /^Rs\.?\s*\d/.test(txt)) {
        const n = parsePrice(txt);
        if (n && n > 0) return n;
      }
    }
    return null;
  }

  // Extract weight/volume unit string near a node (e.g. "500 g", "1 L", "250ml").
  function findUnitNear(card) {
    if (!card) return '';
    const unitRe = /(\d+\.?\d*)\s*(kg|g|ml|l|ltr|litre|liters?|grams?|pack|pcs|pieces?)\b/i;
    const nodes = card.querySelectorAll('*');
    for (const el of nodes) {
      if (el.children.length > 0) continue;
      const txt = normalizeWhitespace(el.textContent);
      const m = txt.match(unitRe);
      if (m) return m[0].toLowerCase();
    }
    return '';
  }

  function scoreProduct(product) {
    let score = 0;
    if (product.name && product.name.length >= 3) score += 2;
    if (typeof product.price === 'number' && product.price > 0) score += 3;
    if (product.productUrl && /^https?:\/\//.test(product.productUrl)) score += 1;
    return score;
  }

  function buildDriftMeta(store, sourceUrl, cardsFound, extracted) {
    const rate = cardsFound > 0 ? extracted / cardsFound : 0;
    return {
      store,
      source: sourceUrl,
      cardsFound,
      extracted,
      extractionRate: Number(rate.toFixed(3)),
      driftWarning: cardsFound >= 6 && rate < 0.2,
      ts: Date.now(),
    };
  }

  window.GroceryScraperUtils = {
    normalizeWhitespace,
    pickText,
    parsePrice,
    findPriceNear,
    findUnitNear,
    scoreProduct,
    buildDriftMeta,
  };
})();
