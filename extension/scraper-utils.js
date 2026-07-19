// Shared scraper utilities for selector fallbacks, parsing, and drift detection.

(function attachWishMeScraperUtils() {
  function normalizeWhitespace(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

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

  function pickAttr(root, selectors, attr) {
    for (const sel of selectors || []) {
      const el = root.querySelector(sel);
      if (!el) continue;
      const value = normalizeWhitespace(el.getAttribute(attr));
      if (value) return value;
    }
    return null;
  }

  function parsePrice(value) {
    if (!value) return null;
    const digits = String(value).replace(/[^0-9]/g, '');
    if (!digits) return null;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : null;
  }

  function parseRating(value) {
    if (!value) return null;
    const m = String(value).match(/([1-5](?:\.\d)?)/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  function parseReviews(value) {
    if (!value) return null;
    const m = String(value).match(/\(?\s*([0-9][0-9,]*)\s*\)?/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  }

  function toJsonLdArray() {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const data = [];

    for (const script of scripts) {
      const text = script.textContent || '';
      if (!text.trim()) continue;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) data.push.apply(data, parsed);
        else data.push(parsed);
      } catch {
        // Ignore malformed JSON-LD blocks.
      }
    }

    return data;
  }

  function scoreProduct(product) {
    let score = 0;
    if (product.title && product.title.length >= 5) score += 2;
    if (product.storeProductId && product.storeProductId.length >= 3) score += 2;
    if (product.url && /^https?:\/\//.test(product.url)) score += 2;
    if (typeof product.price === 'number' && product.price > 0) score += 1;
    if (product.image && /^https?:\/\//.test(product.image)) score += 1;
    if (typeof product.rating === 'number' && product.rating > 0) score += 1;
    return score;
  }

  function buildDriftMeta(store, sourceUrl, cardsFound, extracted, droppedLowConfidence) {
    const safeCards = Number.isFinite(cardsFound) ? cardsFound : 0;
    const safeExtracted = Number.isFinite(extracted) ? extracted : 0;
    const safeDropped = Number.isFinite(droppedLowConfidence) ? droppedLowConfidence : 0;
    const rate = safeCards > 0 ? safeExtracted / safeCards : 0;
    const warning = safeCards >= 8 && rate < 0.2;

    return {
      store,
      source: sourceUrl,
      cardsFound: safeCards,
      extracted: safeExtracted,
      droppedLowConfidence: safeDropped,
      extractionRate: Number(rate.toFixed(3)),
      driftWarning: warning,
      ts: Date.now(),
    };
  }

  window.WishMeScraperUtils = {
    normalizeWhitespace,
    pickText,
    pickAttr,
    parsePrice,
    parseRating,
    parseReviews,
    toJsonLdArray,
    scoreProduct,
    buildDriftMeta,
  };
})();
