// Amazon.in search results scraper
// Selectors may need updating if Amazon changes their HTML structure

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const cards = document.querySelectorAll('[data-asin]:not([data-asin=""])');
  const products = [];
  let droppedLowConfidence = 0;

  for (const card of cards) {
    const asin = card.getAttribute('data-asin');
    if (!asin || asin.length < 5) continue;

    // Title — old layout: single `a-text-normal` span; new layout: brand + model
    // split across two sibling spans inside [data-cy="title-recipe"].
    // Use innerText on the title container so CSS-separated spans get a space.
    let title = U.pickText(card, ['h2 span.a-text-normal']);
    if (!title || title.length < 5) {
      const titleRecipe = card.querySelector('[data-cy="title-recipe"]') || card.querySelector('h2');
      title = U.normalizeWhitespace(titleRecipe?.innerText || titleRecipe?.textContent || '');
    }
    if (!title || title.length < 5) continue;
    // Clean up: strip "Sponsored" label and normalize whitespace/newlines
    title = U.normalizeWhitespace(title.replace(/^Sponsored\s*/i, '').replace(/\s*\n\s*/g, ' '));
    if (!title || title.length < 5) continue;

    // Image
    const imgEl = card.querySelector('img.s-image');
    const image = imgEl?.getAttribute('src') || null;

    // Price (whole part, e.g. "82,900")
    const priceEl = card.querySelector('.a-price-whole');
    const price = U.parsePrice(priceEl?.textContent);

    // Rating (e.g. "4.5 out of 5 stars")
    const ratingEl = card.querySelector('span.a-icon-alt');
    const rating = U.parseRating(ratingEl?.textContent);

    // Reviews count
    const reviewsEl = card.querySelector('span.a-size-base.s-underline-text');
    const reviews = U.parseReviews(reviewsEl?.textContent);

    const product = {
      title,
      price,
      currency: 'INR',
      image,
      url: `https://www.amazon.in/dp/${asin}`,
      store: 'amazon',
      storeProductId: asin,
      rating,
      reviews,
    };

    if (U.scoreProduct(product) < 5) {
      droppedLowConfidence += 1;
      continue;
    }

    products.push(product);
  }

  if (products.length === 0) return;

  const drift = U.buildDriftMeta('amazon', window.location.href, cards.length, products.length, droppedLowConfidence);

  chrome.runtime.sendMessage({
    type: 'SAVE_PRODUCTS',
    products,
    source: window.location.href,
    diagnostics: drift,
  });
})();
