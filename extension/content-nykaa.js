// Nykaa search/brand results scraper.

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const SELECTORS = {
    link: "a[href*="/p/"]",
    title: ["h2"],
    image: { selectors: ["img"], attrs: ["src", "data-src", "srcset"] },
  };

  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("q") || "";
  const jsonLd = U.extractJsonLdProducts();

  const productLinks = Array.from(document.querySelectorAll(SELECTORS.link))
    .filter((a) => !a.href.includes("root=footer"));

  const products = [];
  const seen = new Set();
  let droppedLowConfidence = 0;

  for (const link of productLinks) {
    const pidMatch = link.href.match(/productId=(\d+)/);
    if (!pidMatch) continue;
    const storeProductId = pidMatch[1];
    if (seen.has(storeProductId)) continue;
    seen.add(storeProductId);

    let card = link.parentElement;
    while (card && card.tagName !== "BODY") {
      if (card.querySelector("h2") && card.querySelector("img")) break;
      card = card.parentElement;
    }
    if (!card || card.tagName === "BODY") continue;

    const title = U.pickText(card, SELECTORS.title);
    if (!title || title.length < 4) continue;

    const priceSpans = Array.from(card.querySelectorAll("span"))
      .map((s) => s.textContent?.trim())
      .filter((t) => t?.startsWith("₹"));
    const prices = priceSpans.map((t) => U.parsePrice(t)).filter((n) => n && n > 0);
    const price = prices.length ? Math.min(...prices) : U.findPriceNear(card);

    let product = {
      title,
      price,
      currency: "INR",
      image: U.pickImage(card, SELECTORS.image),
      url: link.href.split("#")[0],
      store: "nykaa",
      storeProductId,
      brand: null,
      rating: null,
      reviews: U.parseReviews(card.textContent),
    };

    product = U.enrichFromJsonLd(product, jsonLd);

    if (U.scoreProduct(product) < 5) { droppedLowConfidence += 1; continue; }
    products.push(product);
  }

  if (products.length === 0) return;

  const drift = U.buildDriftMeta("nykaa", window.location.href, productLinks.length, products.length, droppedLowConfidence);
  chrome.runtime.sendMessage({
    type: "SAVE_PRODUCTS",
    products,
    source: { query: searchQuery, pageUrl: window.location.href },
    schemaVersion: 2,
    diagnostics: drift,
  });
})();
