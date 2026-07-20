// Myntra search results scraper.

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const SELECTORS = {
    card: "li.product-base",
    link: "a[href*=\"/buy\"]",
    brand: ["h3.product-brand"],
    name: ["h4.product-product"],
    image: { selectors: ["img.img-responsive", "img"], attrs: ["src", "data-src", "srcset"] },
    price: [".product-price"],
  };

  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("rawQuery") || "";
  const jsonLd = U.extractJsonLdProducts();

  const cards = document.querySelectorAll(SELECTORS.card);
  const products = [];
  let droppedLowConfidence = 0;

  for (const card of cards) {
    const linkEl = card.querySelector(SELECTORS.link);
    if (!linkEl) continue;
    const pidMatch = linkEl.href.match(/(\d+)\/buy/);
    if (!pidMatch) continue;
    const storeProductId = pidMatch[1];

    const brand = U.pickText(card, SELECTORS.brand) || null;
    const name = U.pickText(card, SELECTORS.name) || "";
    const title = U.normalizeWhitespace([brand, name].filter(Boolean).join(" "));
    if (!title || title.length < 4) continue;

    const priceText = card.querySelector(SELECTORS.price[0])?.textContent || "";
    const firstNumber = (priceText.match(/[\d,]+/) || [null])[0];

    let product = {
      title,
      price: U.parsePrice(firstNumber) ?? U.findPriceNear(card),
      currency: "INR",
      image: U.pickImage(card, SELECTORS.image),
      url: linkEl.href.split("?")[0],
      store: "myntra",
      storeProductId,
      brand,
      rating: null,
      reviews: null,
    };

    product = U.enrichFromJsonLd(product, jsonLd);

    if (U.scoreProduct(product) < 5) { droppedLowConfidence += 1; continue; }
    products.push(product);
  }

  if (products.length === 0) return;

  const drift = U.buildDriftMeta("myntra", window.location.href, cards.length, products.length, droppedLowConfidence);
  chrome.runtime.sendMessage({
    type: "SAVE_PRODUCTS",
    products,
    source: { query: searchQuery, pageUrl: window.location.href },
    schemaVersion: 2,
    diagnostics: drift,
  });
})();
