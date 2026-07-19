// Nykaa search/brand results scraper
// Works on: nykaa.com/search/result/?q=... and nykaa.com/*/*/c/* brand pages

(async () => {
  const U = window.WishMeScraperUtils;
  if (!U) return;

  const products = [];
  const seen = new Set();
  let droppedLowConfidence = 0;

  // Page-level metadata
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q') || '';
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  // Handle brand pages: /brands/<name>/c/<id> and search pages: /search/result/
  const isBrandPage = pathParts[0] === 'brands';
  const brandName = isBrandPage ? (pathParts[1] || '') : '';
  const pageBrand = brandName.replace(/-/g, ' ') || null;
  const pageCategory = (searchQuery || brandName || pathParts[0] || '').toLowerCase().replace(/-/g, ' ') || null;
  // productType = the product type searched; null on brand pages (brand != product type)
  const productType = !isBrandPage ? (searchQuery || '').toLowerCase().replace(/-/g, ' ') || null : null;
  const pageKeywords = U.buildPageKeywords([searchQuery || brandName, pageCategory, ...U.extractMetaKeywords().slice(0, 10)]);

  // Product links in the main grid (have productId param, not footer "root=footer")
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
    const title = U.pickText(card, ['h2']);
    if (!title || title.length < 4) continue;

    // Image
    const image = card.querySelector('img')?.src || null;

    // Price: find all spans with ₹ — discounted price is the smallest number
    const priceSpans = Array.from(card.querySelectorAll('span'))
      .map(s => s.textContent?.trim())
      .filter(t => t?.startsWith('₹'));
    const prices = priceSpans
      .map(t => U.parsePrice(t))
      .filter(n => !isNaN(n) && n > 0);
    const price = prices.length ? Math.min(...prices) : null; // discounted = lowest

    // Rating count: span with pattern "( N )"
    const reviews = U.parseReviews(card.textContent);

    const product = {
      title,
      price,
      currency: 'INR',
      image,
      url,
      store: 'nykaa',
      storeProductId,
      brand: pageBrand,
      category: pageCategory,
      productType,
      keywords: pageKeywords.length ? pageKeywords : null,
      rating: null,
      reviews,
    };

    if (U.scoreProduct(product) < 5) {
      droppedLowConfidence += 1;
      continue;
    }

    products.push(product);
  }

  if (products.length === 0) return;

  const cardsFound = productLinks.length;
  const drift = U.buildDriftMeta('nykaa', window.location.href, cardsFound, products.length, droppedLowConfidence);

  chrome.runtime.sendMessage({
    type: 'SAVE_PRODUCTS',
    products,
    source: window.location.href,
    diagnostics: drift,
  });
})();
