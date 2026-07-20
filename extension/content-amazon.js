// Amazon.in search results scraper.
// All CSS selectors live in SELECTORS so a drift fix is a one-line edit.

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const SELECTORS = {
    card: "[data-asin]:not([data-asin=\"\"])",
    title: ["h2 span.a-text-normal", "[data-cy=\"title-recipe\"]", "h2"],
    image: { selectors: ["img.s-image", "img"], attrs: ["src", "data-src", "srcset"] },
    price: [".a-price-whole", ".a-price .a-offscreen"],
    rating: ["span.a-icon-alt"],
    reviews: ["span.a-size-base.s-underline-text"],
  };

  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("k") || "";
  const jsonLd = U.extractJsonLdProducts();

  const cards = document.querySelectorAll(SELECTORS.card);
  const products = [];
  let droppedLowConfidence = 0;

  for (const card of cards) {
    const asin = card.getAttribute("data-asin");
    if (!asin || asin.length < 5) continue;

    let title = U.pickText(card, [SELECTORS.title[0]]);
    if (!title || title.length < 5) {
      const recipe = card.querySelector(SELECTORS.title[1]) || card.querySelector(SELECTORS.title[2]);
      title = U.normalizeWhitespace(recipe?.innerText || recipe?.textContent || "");
    }
    if (!title || title.length < 5) continue;
    title = U.normalizeWhitespace(title.replace(/^Sponsored\s*/i, "").replace(/\s*\n\s*/g, " "));
    if (!title || title.length < 5) continue;

    let product = {
      title,
      price: U.parsePrice(U.pickText(card, SELECTORS.price)) ?? U.findPriceNear(card),
      currency: "INR",
      image: U.pickImage(card, SELECTORS.image),
      url: `https://www.amazon.in/dp/${asin}`,
      store: "amazon",
      storeProductId: asin,
      brand: null,
      rating: U.parseRating(U.pickText(card, SELECTORS.rating)),
      reviews: U.parseReviews(U.pickText(card, SELECTORS.reviews)),
    };

    product = U.enrichFromJsonLd(product, jsonLd);

    if (U.scoreProduct(product) < 5) { droppedLowConfidence += 1; continue; }
    products.push(product);
  }

  if (products.length === 0) return;

  const drift = U.buildDriftMeta("amazon", window.location.href, cards.length, products.length, droppedLowConfidence);
  chrome.runtime.sendMessage({
    type: "SAVE_PRODUCTS",
    products,
    source: { query: searchQuery, pageUrl: window.location.href },
    schemaVersion: 2,
    diagnostics: drift,
  });
})();
