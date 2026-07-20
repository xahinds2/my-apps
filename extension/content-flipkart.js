// Flipkart.com search results scraper.

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const SELECTORS = {
    link: "a[href*=\"/p/\"]",
    image: { selectors: ["img[alt]", "img"], attrs: ["src", "data-src", "srcset"] },
  };

  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("q") || "";
  const jsonLd = U.extractJsonLdProducts();

  const links = document.querySelectorAll(SELECTORS.link);
  const products = [];
  let droppedLowConfidence = 0;

  for (const link of links) {
    const href = link.href;
    if (!href.includes("flipkart.com") || !href.includes("/p/")) continue;
    const container = link;

    const imgEl = container.querySelector("img[alt]");
    const title = U.normalizeWhitespace(imgEl?.alt || link.getAttribute("title") || "");
    if (!title || title.length < 5) continue;

    let storeProductId = "";
    try { storeProductId = new URL(href).searchParams.get("pid") || ""; } catch { /* ignore */ }
    if (!storeProductId) {
      const m = href.match(/\/p\/([a-zA-Z0-9]+)/);
      if (!m) continue;
      storeProductId = m[1];
    }

    let rating = null;
    for (const el of container.querySelectorAll("*")) {
      if (el.children.length > 0) continue;
      const m = el.textContent?.trim().match(/^([1-5](\.\d)?)$/);
      if (m) { rating = parseFloat(m[1]); break; }
    }

    let product = {
      title,
      price: U.findPriceNear(container),
      currency: "INR",
      image: U.pickImage(container, SELECTORS.image),
      url: href.split("?")[0],
      store: "flipkart",
      storeProductId,
      brand: null,
      rating,
      reviews: null,
    };

    product = U.enrichFromJsonLd(product, jsonLd);

    if (U.scoreProduct(product) < 5) { droppedLowConfidence += 1; continue; }
    products.push(product);
  }

  const seen = new Set();
  const unique = products.filter((p) => {
    if (seen.has(p.storeProductId)) return false;
    seen.add(p.storeProductId);
    return true;
  });

  if (unique.length === 0) return;

  const drift = U.buildDriftMeta("flipkart", window.location.href, links.length, unique.length, droppedLowConfidence);
  chrome.runtime.sendMessage({
    type: "SAVE_PRODUCTS",
    products: unique,
    source: { query: searchQuery, pageUrl: window.location.href },
    schemaVersion: 2,
    diagnostics: drift,
  });
})();
