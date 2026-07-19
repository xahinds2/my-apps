// Amazon.in search results scraper
// Selectors may need updating if Amazon changes their HTML structure

(async () => {
  const cards = document.querySelectorAll('[data-asin]:not([data-asin=""])');
  const products = [];

  for (const card of cards) {
    const asin = card.getAttribute('data-asin');
    if (!asin || asin.length < 5) continue;

    // Title
    const titleEl =
      card.querySelector('h2 span.a-text-normal') ||
      card.querySelector('h2 span') ||
      card.querySelector('[data-cy="title-recipe"] span');
    const title = titleEl?.textContent?.trim();
    if (!title || title.length < 5) continue;

    // Image
    const imgEl = card.querySelector('img.s-image');
    const image = imgEl?.getAttribute('src') || null;

    // Price (whole part, e.g. "82,900")
    const priceEl = card.querySelector('.a-price-whole');
    const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '');
    const price = priceText ? parseInt(priceText, 10) : null;

    // Rating (e.g. "4.5 out of 5 stars")
    const ratingEl = card.querySelector('span.a-icon-alt');
    const ratingMatch = ratingEl?.textContent?.match(/^([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    // Reviews count
    const reviewsEl = card.querySelector('span.a-size-base.s-underline-text');
    const reviewsText = reviewsEl?.textContent?.replace(/[^0-9]/g, '');
    const reviews = reviewsText ? parseInt(reviewsText, 10) : null;

    products.push({
      title,
      price,
      currency: 'INR',
      image,
      url: `https://www.amazon.in/dp/${asin}`,
      store: 'amazon',
      rating,
      reviews,
      asin,
    });
  }

  if (products.length === 0) return;

  chrome.runtime.sendMessage({
    type: 'SAVE_PRODUCTS',
    products,
    source: window.location.href,
  });
})();
