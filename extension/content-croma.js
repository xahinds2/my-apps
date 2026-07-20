// Croma search results scraper.

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const SELECTORS = {
    card: ".product-item",
    image: { selectors: ["img"], attrs: ["data-src", "data-lazy-src", "src", "srcset"] },
    price: [".amount.plp-srp-new-amount", ".amount"],
    rating: [".rating-text"],
    reviews: [".rating-text-icon"],
  };

  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = (urlParams.get("text") || urlParams.get("q") || "").replace(/:.*$/, "").trim();
  const jsonLd = U.extractJsonLdProducts();

  const cards = document.querySelectorAll(SELECTORS.card);
  if (!cards.length) return;

  const products = [];
  let droppedLowConfidence = 0;

  for (const card of cards) {
    const allLinks = Array.from(card.querySelectorAll("a"));
    const linkEl = allLinks.find((a) => a.textContent?.trim().length > 4 && a.href.includes("croma.com"));
    if (!linkEl) continue;
    const m = linkEl.href.match(/\/p\/(\d+)/);
    if (!m) continue;
    const storeProductId = m[1];
    const title = U.normalizeWhitespace(linkEl.textContent);
    if (!title || title.length < 4) continue;

    let product = {
      title,
      price: U.parsePrice(U.pickText(card, SELECTORS.price)) ?? U.findPriceNear(card),
      currency: "INR",
      image: U.pickImage(card, SELECTORS.image),
      url: linkEl.href.split("?")[0],
      store: "croma",
      storeProductId,
      brand: null,
      rating: U.parseRating(U.pickText(card, SELECTORS.rating)),
      reviews: U.parseReviews(U.pickText(card, SELECTORS.reviews)),
    };

    product = U.enrichFromJsonLd(product, jsonLd);

    if (U.scoreProduct(product) < 5) { droppedLowConfidence += 1; continue; }
    products.push(product);
  }

  if (products.length === 0) return;

  const drift = U.buildDriftMeta("croma", window.location.href, cards.length, products.length, droppedLowConfidence);
  chrome.runtime.sendMessage({
    type: "SAVE_PRODUCTS",
    products,
    source: { query: searchQuery, pageUrl: window.location.href },
    schemaVersion: 2,
    diagnostics: drift,
  });
})();
