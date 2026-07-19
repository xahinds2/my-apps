// Croma search results scraper
// Covers: https://www.croma.com/searchB?q=...

(async () => {
  const products = [];

  const cards = document.querySelectorAll('.product-item');

  for (const card of cards) {
    // URL + title — there are multiple <a> tags; find the one with actual title text
    const allLinks = Array.from(card.querySelectorAll('a'));
    const linkEl = allLinks.find(a => a.textContent?.trim().length > 4 && a.href.includes('croma.com'));
    if (!linkEl) continue;
    const m = linkEl.href.match(/\/p\/(\d+)/);
    if (!m) continue;
    const storeProductId = m[1];
    const url = `https://www.croma.com/product/p/${storeProductId}`;
    const title = linkEl.textContent?.trim();
    if (!title || title.length < 4) continue;

    // Image — Croma lazy-loads images; real URL is in data-src, not src
    const imgEl = card.querySelector('img');
    const image = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-lazy-src') || imgEl?.getAttribute('src') || null;
    // Discard the lazy-load placeholder GIF
    const cleanImage = (image && !image.includes('lazyLoad') && !image.includes('lazy-load') && !image.endsWith('.gif')) ? image : null;

    // Price — "₹29,900"
    const priceText = card.querySelector('.amount.plp-srp-new-amount')?.textContent || '';
    const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) || null : null;

    // Rating — ".rating-text" contains e.g. "4.5"
    const ratingText = card.querySelector('.rating-text')?.textContent?.trim();
    const rating = ratingText ? parseFloat(ratingText) || null : null;

    // Reviews — ".rating-text-icon" contains e.g. "4.5(120)"
    const ratingIconText = card.querySelector('.rating-text-icon')?.textContent?.trim() || '';
    const reviewMatch = ratingIconText.match(/\((\d+)\)/);
    const reviews = reviewMatch ? parseInt(reviewMatch[1], 10) : null;

    products.push({
      title,
      price,
      currency: 'INR',
      image: cleanImage,
      url,
      store: 'croma',
      storeProductId,
      rating,
      reviews,
    });
  }

  if (products.length === 0) return;

  chrome.runtime.sendMessage({
    type: 'SAVE_PRODUCTS',
    products,
    source: window.location.href,
  });
})();
