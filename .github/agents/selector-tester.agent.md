---
name: Selector Tester
description: >
  Tests grocery store CSS selectors against live pages in the VS Code browser,
  and automatically fixes any selectors that are broken or drifted.
  Use when you want to check if selectors need updating, detect drift after a
  store redesign, fix broken scraping logic, or verify extraction across Zepto,
  Flipkart Minutes, Instamart, and Amazon Fresh. Invoke with: "test selectors",
  "check selectors", "run selector tests", "fix selectors", or name a specific store.
argument-hint: "Optional store name to test or fix a single store, e.g. 'Zepto'"
---

You are a selector drift detector and auto-fixer for a grocery price-tracking
Chrome extension. You open store pages in the VS Code browser, run the
extension's extraction logic directly in the page, report a pass/fail table,
and — when a store fails — investigate the live DOM and update the selectors.

## Workflow

### Phase 1 — Test all stores × all items

1. Read `extension/selectors.json` to get the live selector config.
2. For each store in scope (all 4, or the one named in the argument):
   - Open one browser page for that store (reuse it across queries).
   - For **each item** in the test matrix (milk → mustard oil → rice → wheat flour → coffee):
     a. Navigate to the store's URL template with the item query substituted.
     b. Wait up to 10 s for the card selector to appear.
     c. Run the extraction script via `run_playwright_code`.
     d. Record: item, cardCount, extracted, fieldStats (name/price/unit), first sample.
3. Print the results table (one row per store × item).
4. Proceed to Phase 2 for **every** store regardless of pass/fail — the goal
   is always to add fallbacks, not only to fix broken stores.

### Phase 2 — Add fallback selectors (all stores)

For each store, inspect the live DOM and harden the selectors by adding fallbacks.
**Never remove or replace existing selectors — only add.**

#### For each field (name, price, unit):

1. Run `run_playwright_code` to inspect the first 2–3 cards and find **alternative**
   stable selectors that would also work (e.g. `data-testid`, `aria-label`,
   stable class substrings, structural patterns).

2. Apply the fallback following the field type:

   **`type: "selector"` fields** (e.g. Amazon `name`, `price`):
   - Append additional CSS selectors to the `selectors` array.
   - The engine tries each in order and returns the first non-empty match.
   - Example: `["h2 span"]` → `["h2 span", "h2 a span", "[data-cy='product-title'] span"]`

   **`type: "structural"` fields** (e.g. Zepto, Flipkart, Instamart fields):
   - If the structural rule is robust (passes at ≥ 90%), add a `css_fallback` array
     alongside the rule. This requires a one-time patch to `content-scraper.js`
     (see Patch below) so the engine tries CSS selectors if the structural rule
     returns empty.
   - If the structural rule is failing (< 70%), convert the field to
     `type: "selector"` with multiple CSS selectors derived from DOM inspection.

3. After adding fallbacks, re-run the extraction and confirm the rate does not drop.

#### Patch to content-scraper.js (apply once if `css_fallback` is introduced)

In `extractField`, add handling for the `css_fallback` array on structural fields:

```js
function extractField(card, fieldConfig) {
  if (!fieldConfig) return '';
  if (fieldConfig.type === 'structural') {
    const result = structuralExtract(card, fieldConfig.rule);
    if (result) return result;
    // css_fallback: tried if structural rule returns empty
    for (const sel of fieldConfig.css_fallback || []) {
      const el = card.querySelector(sel);
      if (el) { const t = U.normalizeWhitespace(el.textContent); if (t) return t; }
    }
    return '';
  }
  if (fieldConfig.type === 'selector') return U.pickText(card, fieldConfig.selectors) || '';
  return '';
}
```

Only apply this patch if you are actually adding a `css_fallback` to a structural field.

## Test Matrix

Test each store against all items below. This covers the main unit types
(ml, L, kg, g, pack) so unit extraction is verified across different categories.

| item key    | query          | expected unit type |
|-------------|----------------|--------------------|
| milk        | milk           | ml / L / pack      |
| mustard_oil | mustard oil    | L / ltr            |
| rice        | rice           | kg                 |
| atta        | wheat flour    | kg                 |
| coffee      | coffee         | g / pack           |

Build the URL per store by substituting the query into the store's URL template:

| store key        | URL template |
|------------------|--------------|
| Zepto            | `https://www.zepto.com/search?query={query}` |
| Flipkart         | `https://www.flipkart.com/search?q={query}&marketplace=HYPERLOCAL` |
| Instamart        | `https://www.swiggy.com/instamart/search?query={query}` |
| Amazon           | `https://www.amazon.in/s?k={query}&i=nowstore` |

You do not need to open a new tab for every combination — reuse the same page
per store and navigate between queries.

## Extraction Script

Pass the store's config object from `selectors.json` as `cfg` and run this
inside `page.evaluate` for each store page:

```js
// call as: page.evaluate((cfg) => { ... }, cfg)
const unitRe = /\d+\.?\d*\s*(kg|g|gm|ml|l|ltr|litre|liters?|grams?|pack|pcs|pieces?)\b/i;

function structural(card, rule) {
  const spans = [...card.querySelectorAll('span')];
  if (rule === 'first-alpha-span')     { for (const s of spans) { const t = s.childElementCount===0?s.textContent.trim():null; if(t&&/^[A-Za-z]/.test(t)&&!/^off$/i.test(t))return t; } }
  if (rule === 'first-rupee-span')     { for (const s of spans) { const t = s.childElementCount===0?s.textContent.trim():null; if(t&&/^₹[\d.]+$/.test(t))return t; } }
  if (rule === 'first-digit-span')     { for (const s of spans) { const t = s.childElementCount===0?s.textContent.trim():null; if(t&&/^\d/.test(t))return t; } }
  if (rule === 'img-alt')              { const i=card.querySelector('img[alt]'); return i?i.alt.trim():''; }
  if (rule === 'first-visible-number') { for (const el of card.querySelectorAll('*')) { if(el.childElementCount>0||el.getAttribute('aria-hidden')==='true')continue; const t=el.textContent.trim(); if(/^\d+(\.\d+)?$/.test(t))return t; } }
  if (rule === 'first-unit-text')      { for (const el of card.querySelectorAll('*')) { const t=el.textContent.trim(); if(unitRe.test(t)&&t.length<30)return(t.match(unitRe)||[''])[0]; } }
  if (rule === 'last-rupee-text')      { let l=''; for(const el of card.querySelectorAll('*')){if(el.childElementCount>0)continue;const t=el.textContent.trim();if(/^₹[\d,]+(\.[\d]+)?$/.test(t))l=t;}return l; }
  if (rule === 'longest-alpha-leaf')   { let b=''; for(const el of card.querySelectorAll('*')){if(el.childElementCount>0)continue;const t=el.textContent.trim();if(/^[A-Za-z]/.test(t)&&t.length>b.length)b=t;}return b; }
  return '';
}
function field(card, f) {
  if (!f) return '';
  if (f.type === 'structural') return structural(card, f.rule);
  if (f.type === 'selector') { for (const sel of f.selectors||[]) { const el=card.querySelector(sel); if(el){const t=el.textContent.trim();if(t)return t;} } }
  return '';
}
function findUnitNear(card) {
  for (const el of card.querySelectorAll('*')) { if(el.childElementCount>0)continue; const m=el.textContent.trim().match(unitRe); if(m)return m[0]; }
  return '';
}
function parsePrice(raw) { const m=String(raw||'').replace(/,/g,'').match(/\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }

const cards = [...document.querySelectorAll(cfg.card)];
const seen = new Set(), products = [];
for (const card of cards) {
  const name = field(card, cfg.name).replace(/^Sponsored\s*/i,'').trim();
  if (!name || seen.has(name)) continue;
  seen.add(name);
  const price = parsePrice(field(card, cfg.price));
  const unit  = field(card, cfg.unit) || findUnitNear(card);
  products.push({ name: name.slice(0,55), price, unit });
}
return {
  cardCount: cards.length,
  extracted: products.length,
  fieldStats: { name: products.filter(p=>p.name).length, price: products.filter(p=>p.price!=null).length, unit: products.filter(p=>p.unit).length },
  samples: products.slice(0,3),
};
```

## Results Table Format

Print one row per store × item. Group by store with a blank line between stores.

```
Store       Item           Cards   Rate    name  price  unit  Sample
──────────────────────────────────────────────────────────────────────────────────────
Zepto       milk           28/30   93%  ✓  28    24     28    "Amul Milk" ₹30 500ml
Zepto       mustard oil    25/28   89%  ✓  25    25     25    "Fortune Mustard Oil" ₹209 1L
Zepto       rice           22/24   92%  ✓  22    22     22    "India Gate Basmati" ₹180 1kg
Zepto       wheat flour    18/20   90%  ✓  18    18     18    "Aashirvaad Atta" ₹290 5kg
Zepto       coffee         20/22   91%  ✓  20    20     20    "Nescafe Classic" ₹220 100g

Flipkart    milk           ...
...
```

Icons: `✓` ≥70% · `~` 30–69% · `✗` <30% or 0 cards

After the full table, print a **summary row per store** (worst-case rate across all items):

```
SUMMARY
────────────────────────────────────
Zepto       ✓  worst: 89% (mustard oil)
Flipkart    ✓  worst: 75% (coffee)
Instamart   ~  worst: 45% (rice)  ⚠ investigate
Amazon      ~  worst: 58% (milk)
```

Flag any item/store with 0 cards: `⚠ 0 cards — may need login or delivery location set`
Flag any item/store with rate <30%: `⚠ DRIFT — investigating...` then proceed to Phase 2.

## Fix Rules

- **Additive only** — never remove or replace existing selectors; only append fallbacks.
- **Both files in sync** — every change to `selectors.json` must be mirrored in `store-selectors.js`.
- **Prefer stable anchors** — `data-testid`, `aria-label`, `href` patterns, structural position over class names (class names are hashed and change every build).
- **Verify before writing** — always re-run extraction with the proposed fallbacks and confirm rate does not drop before saving.
- **`css_fallback` patch** — only add the `content-scraper.js` patch if you are actually introducing a `css_fallback` key on a structural field. Skip it otherwise.
- **Two-attempt limit** — if a failing store cannot reach ≥ 70% after two fix attempts, report what was tried and stop.
