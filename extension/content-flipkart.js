// Flipkart.com search results scraper
// Flipkart's class names are generated and change often — uses data attributes where possible

(async () => {
  const products = [];

  // Product links on Flipkart search pages all point to /p/ paths
  const links = document.querySelectorAll('a[href*="/p/"]');

  for (const link of links) {
    const href = link.href;
    if (!href.includes('flipkart.com') || !href.includes('/p/')) continue;

    const container = link.closest('[data-id]') || link.parentElement?.parentElement;

    // Title: first meaningful div/span inside the link
    const titleEl = link.querySelector('div') || link.querySelector('span');
    const title =
      titleEl?.textContent?.trim() ||
      link.getAttribute('title')?.trim();
    if (!title || title.length < 5) continue;

    // Image: first img in the card container
    const imgEl = container?.querySelector('img');
    const image = imgEl?.src || null;

    // Price: look for ₹ symbol in the container
    let price = null;
    const allText = container ? Array.from(container.querySelectorAll('*')) : [];
    for (const el of allText) {
      const txt = el.childNodes[0]?.textContent?.trim() || '';
      if (txt.startsWith('₹') && el.children.length === 0) {
        const num = txt.replace(/[^0-9]/g, '');
        if (num) { price = parseInt(num, 10); break; }
      }
    }

    // Rating: look for a single number between 1-5 in a small element
    let rating = null;
    for (const el of allText) {
      if (el.children.length > 0) continue;
      const txt = el.textContent?.trim() || '';
      const m = txt.match(/^([1-5](\.\d)?)$/);
      if (m) { rating = parseFloat(m[1]); break; }
    }

    // Clean URL (remove query params)
    const cleanUrl = href.split('?')[0];

    products.push({
      title,
      price,
      currency: 'INR',
      image,
      url: cleanUrl,
      store: 'flipkart',
      rating,
      reviews: null,
    });
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = products.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  if (unique.length === 0) return;

  chrome.runtime.sendMessage({
    type: 'SAVE_PRODUCTS',
    products: unique,
    source: window.location.href,
  });
})();
