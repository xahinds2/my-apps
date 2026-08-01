// Centralised store selector config — mirrors selectors.json.
// Edit selectors.json (source of truth) then update this file to match.
// To add a new store: add an entry here + URL patterns in manifest.json.

window.STORE_SELECTORS = {
  zepto: {
    hosts: ['zepto.com'],
    // Zepto hashes class names on every build — structural span-order extraction is used instead.
    card: 'a[href*="/pn/"]',
    name:  { type: 'structural', rule: 'first-alpha-span' },
    price: { type: 'structural', rule: 'first-rupee-span' },
    unit:  { type: 'structural', rule: 'first-digit-span' },
  },
  flipkart_minutes: {
    hosts: ['flipkart.com'],
    // HYPERLOCAL product URLs always contain marketplace=HYPERLOCAL — regular Flipkart products do not.
    card: 'div:has(> a[href*="marketplace=HYPERLOCAL"][href*="/p/"])',  // parent div; price/unit are siblings of the <a>
    name:  { type: 'structural', rule: 'longest-alpha-leaf' },
    // First ₹ element is the strikethrough MRP; last ₹ element is the discounted sale price.
    price: { type: 'structural', rule: 'last-rupee-text' },
    unit:  { type: 'structural', rule: 'first-unit-text' },
  },
  instamart: {
    hosts: ['instamart.in', 'swiggy.com'],
    // Swiggy uses hashed CSS-module classes — structural rules based on stable DOM semantics are used instead.
    card: 'div:has(> [data-testid="item-collection-card-full"])',
    name:  { type: 'structural', rule: 'img-alt' },
    // Swiggy renders ₹ via CSS ::before; textContent is a plain number.
    price: { type: 'structural', rule: 'first-visible-number' },
    unit:  { type: 'structural', rule: 'first-unit-text' },
  },
  amazon_fresh: {
    hosts: ['amazon.in'],
    // Amazon Fresh / Now store — URL pattern: amazon.in/s?...i=nowstore...
    card: '[data-component-type="s-search-result"]',
    name:  { type: 'selector', selectors: ['h2 span'] },
    // First .a-price-whole is the sale price as a plain integer (no ₹); parsePrice handles it.
    price: { type: 'selector', selectors: ['.a-price-whole'] },
    // Unit is often embedded in the title (e.g. '1L', '500 g'); findUnitNear fallback extracts it.
    unit:  { type: 'structural', rule: 'first-unit-text' },
  },
};
