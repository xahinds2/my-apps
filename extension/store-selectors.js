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
  instamart: {
    hosts: ['instamart.in', 'swiggy.com'],
    // Swiggy uses hashed CSS-module classes — structural rules based on stable DOM semantics are used instead.
    card: 'div:has(> [data-testid="item-collection-card-full"])',
    name:  { type: 'structural', rule: 'img-alt' },
    // Swiggy renders ₹ via CSS ::before; textContent is a plain number.
    price: { type: 'structural', rule: 'first-visible-number' },
    unit:  { type: 'structural', rule: 'first-unit-text' },
  },
};

