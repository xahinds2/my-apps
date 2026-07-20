// Shared scraper utilities for selector fallbacks, parsing, and drift detection.

(function attachWishMeScraperUtils() {
  function normalizeWhitespace(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  // Ordered-fallback text picker. Pass an array of selectors; first non-empty wins.
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

  // Robust image extractor: try each selector, then each attribute in order,
  // skipping lazy-load placeholders (gif / lazyLoad / data URIs).
  function pickImage(root, config) {
    const cfg = config || {};
    const selectors = cfg.selectors || ["img"];
    const attrs = cfg.attrs || ["src", "data-src", "data-lazy-src", "srcset"];
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (!el) continue;
      for (const attr of attrs) {
        let value = normalizeWhitespace(el.getAttribute(attr));
        if (!value) continue;
        if (attr === "srcset") value = value.split(",")[0].trim().split(" ")[0];
        if (!/^https?:\/\//.test(value)) continue;
        if (/lazyload|lazy-load|placeholder/i.test(value)) continue;
        if (value.endsWith(".gif")) continue;
        return value;
      }
    }
    return null;
  }

  // Mirror the server's toNumber (src/app/api/products/route.ts): drop
  // digit-group commas, then take the FIRST number token so a stray period in a
  // prefix ("Rs. 1,499.00") cannot leak into the value. Stripping every
  // non-digit destroys the decimal — "₹1,499.00" -> "149900" (100x too high).
  function parsePrice(value) {
    if (value == null) return null;
    const m = String(value).replace(/,/g, "").match(/\d+(\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  // Heuristic price finder: scans leaf nodes inside a card for the first rupee
  // amount. Used as a fallback when no price selector matches.
  function findPriceNear(card) {
    if (!card) return null;
    const nodes = card.querySelectorAll("*");
    for (const el of nodes) {
      if (el.children.length > 0) continue;
      const txt = normalizeWhitespace(el.textContent);
      if (/^[₹Rs.]/i.test(txt) || /₹/.test(txt)) {
        const n = parsePrice(txt);
        if (n && n > 0) return n;
      }
    }
    return null;
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
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }

  function toJsonLdArray() {
    const scripts = Array.from(document.querySelectorAll("script[type=\"application/ld+json\"]"));
    const data = [];
    for (const script of scripts) {
      const text = script.textContent || "";
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

  // Opportunistic structured-data extraction. Listing pages often omit per-product
  // JSON-LD (it lives on PDPs), so this is a fill-in — indexed by lowercased name.
  function extractJsonLdProducts() {
    const byName = {};
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      const type = node["@type"];
      const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (isProduct && node.name) {
        const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        const rating = node.aggregateRating || {};
        byName[normalizeWhitespace(node.name).toLowerCase()] = {
          price: offers ? parsePrice(offers.price || offers.lowPrice) : null,
          image: typeof node.image === "string" ? node.image : Array.isArray(node.image) ? node.image[0] : null,
          brand: node.brand ? (typeof node.brand === "string" ? node.brand : node.brand.name) : null,
          rating: rating.ratingValue ? parseRating(String(rating.ratingValue)) : null,
          reviews: rating.reviewCount ? parseReviews(String(rating.reviewCount)) : null,
        };
      }
      if (Array.isArray(node["@graph"])) node["@graph"].forEach(walk);
    };
    for (const entry of toJsonLdArray()) walk(entry);
    return byName;
  }

  // Merge a scraped product with JSON-LD data (by title), preferring existing
  // non-null CSS-scraped values and filling gaps from structured data.
  function enrichFromJsonLd(product, jsonLdByName) {
    if (!jsonLdByName) return product;
    const ld = jsonLdByName[normalizeWhitespace(product.title).toLowerCase()];
    if (!ld) return product;
    for (const key of ["price", "image", "brand", "rating", "reviews"]) {
      if ((product[key] === null || product[key] === undefined) && ld[key] != null) {
        product[key] = ld[key];
      }
    }
    return product;
  }

  function scoreProduct(product) {
    let score = 0;
    if (product.title && product.title.length >= 5) score += 2;
    if (product.storeProductId && product.storeProductId.length >= 3) score += 2;
    if (product.url && /^https?:\/\//.test(product.url)) score += 2;
    if (typeof product.price === "number" && product.price > 0) score += 1;
    if (product.image && /^https?:\/\//.test(product.image)) score += 1;
    if (typeof product.rating === "number" && product.rating > 0) score += 1;
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
    pickImage,
    parsePrice,
    findPriceNear,
    parseRating,
    parseReviews,
    toJsonLdArray,
    extractJsonLdProducts,
    enrichFromJsonLd,
    scoreProduct,
    buildDriftMeta,
  };
})();
