// Myntra search results scraper
// Covers: https://www.myntra.com/<search-term>

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const products = [];
  let droppedLowConfidence = 0;

  // Each product card: li.product-base containing an anchor to /buy
  const cards = document.querySelectorAll('li.product-base');

  for (const card of cards) {
    const linkEl = card.querySelector('a[href*="/buy"]');
    if (!linkEl) continue;

    // Stable URL: extract numeric product ID from .../43555584/buy
    const pidMatch = linkEl.href.match(/(\d+)\/buy/);
    if (!pidMatch) continue;
    const storeProductId = pidMatch[1];
    const url = `https://www.myntra.com/product/${storeProductId}`;

    // Brand (h3.product-brand) + product name (h4.product-product)
    const brand = U.pickText(card, ['h3.product-brand']) || '';
    const name  = U.pickText(card, ['h4.product-product']) || '';
    const title = U.normalizeWhitespace([brand, name].filter(Boolean).join(' '));
    if (!title || title.length < 4) continue;

    // Image
    const imgEl = card.querySelector('img.img-responsive') || card.querySelector('img');
    const image = imgEl?.src || null;

    // Price — class is "product-price"; text may be "Rs. 29900Rs. 45900(Rs. 16000 OFF)"
    // Extract the first number (discounted / selling price)
    const priceText = card.querySelector('.product-price')?.textContent || '';
    const firstNumber = (priceText.match(/[\d,]+/) || [null])[0];
    const price = U.parsePrice(firstNumber);

    const product = {
      title,
      price,
      currency: 'INR',
      image,
      url,
      store: 'myntra',
      storeProductId,
      rating: null,
      reviews: null,
    };

    if (U.scoreProduct(product) < 5) {
      droppedLowConfidence += 1;
      continue;
    }

    products.push(product);
  }

  if (products.length === 0) return;

  const cardsFound = cards.length;
  const drift = U.buildDriftMeta('myntra', window.location.href, cardsFound, products.length, droppedLowConfidence);

  chrome.runtime.sendMessage({
    type: 'SAVE_PRODUCTS',
    products,
    source: window.location.href,
    diagnostics: drift,
  });
})();
