// Nykaa search/brand results scraper
// Works on: nykaa.com/search/result/?q=... and nykaa.com/*/*/c/* brand pages

(async () => {
  const products = [];
  const seen = new Set();

  // Product links that are in the main grid (have productId param, not footer "root=footer")
  const productLinks = Array.from(
    document.querySelectorAll('a[href*="/p/"][href*="productId"]')
  ).filter(a => !a.href.includes('root=footer'));

  for (const link of productLinks) {
    const pidMatch = link.href.match(/productId=(\d+)/);
    if (!pidMatch) continue;
    const storeProductId = pidMatch[1];
    const url = `https://www.nykaa.com/product/${storeProductId}`;
    if (seen.has(storeProductId)) continue;
    seen.add(storeProductId);

    // Walk up to find card container (has img + h2 + price span)
    let card = link.parentElement;
    while (card && card.tagName !== 'BODY') {
      if (card.querySelector('h2') && card.querySelector('img')) break;
      card = card.parentElement;
    }
    if (!card || card.tagName === 'BODY') continue;

    // Title: h2 inside the card
    const title = card.querySelector('h2')?.textContent?.trim();
    if (!title || title.length < 4) continue;

    // Image
    const image = card.querySelector('img')?.src || null;

    // Price: find all spans with ₹ — discounted price is the smallest number
    const priceSpans = Array.from(card.querySelectorAll('span'))
      .map(s => s.textContent?.trim())
      .filter(t => t?.startsWith('₹'));
    const prices = priceSpans
      .map(t => parseInt(t.replace(/[^0-9]/g, ''), 10))
      .filter(n => !isNaN(n) && n > 0);
    const price = prices.length ? Math.min(...prices) : null; // discounted = lowest

    // Rating count: span with pattern "( N )"
    const reviewMatch = card.textContent?.match(/\(\s*(\d+)\s*\)/);
    const reviews = reviewMatch ? parseInt(reviewMatch[1], 10) : null;

    products.push({
      title,
      price,
      currency: 'INR',
      image,
      url,
      store: 'nykaa',
      storeProductId,
      rating: null,
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
