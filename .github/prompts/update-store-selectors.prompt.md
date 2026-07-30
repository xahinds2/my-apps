---
name: Update Store Selectors
description: Update CSS/structural selectors for a grocery store scraper (Zepto, Instamart, or a new store). Use when selectors are broken, a store has changed its DOM, or you want to add a new store to the scraper.
argument-hint: "Store name (e.g. Zepto) or 'new store'"
agent: agent
---

You are updating the grocery price scraper selectors. The two files that must always stay in sync are:

- [extension/selectors.json](../../extension/selectors.json) — human-readable source of truth
- [extension/store-selectors.js](../../extension/store-selectors.js) — runtime global used by the extension

The unified scraper that reads from these files is [extension/content-scraper.js](../../extension/content-scraper.js).

## Your Task

The user has asked to update selectors for: **$input**

### Step 1 — Inspect the live page

If a browser page for the store is open, use `run_playwright_code` to inspect the actual DOM:

```js
// Find the first product card and inspect its children
return page.evaluate(() => {
  const link = document.querySelector('a[href*="/pn/"]'); // adjust card selector as needed
  const spans = [...link.querySelectorAll('span')];
  return spans.map(s => ({ class: s.className.slice(0, 60), text: s.textContent.trim().slice(0, 30) }));
});
```

Use this to determine:
- **card selector** — the CSS selector that matches individual product cards
- **name** — how to extract the product name (CSS selector or structural rule)
- **price** — how to extract the current price (CSS selector or structural rule)
- **unit** — how to extract the weight/unit (CSS selector or structural rule)

### Step 2 — Choose extraction type

| Situation | Use |
|---|---|
| Store uses stable `data-testid` or semantic class names | `"type": "selector"` with an array of selectors tried in order |
| Store hashes class names on every deploy (like Zepto) | `"type": "structural"` with a rule: `first-rupee-span`, `first-alpha-span`, or `last-span` |

Structural rules available in content-scraper.js:
- `first-rupee-span` — first `<span>` whose text matches `/^₹[\d.]+$/`
- `first-alpha-span` — first `<span>` whose text starts with a letter (skips ₹ and "OFF")
- `last-span` — last `<span>` inside the card

### Step 3 — Verify with Playwright

Before writing, verify the extracted values look correct:

```js
return page.evaluate(() => {
  const results = [];
  for (const link of [...document.querySelectorAll('CARD_SELECTOR')].slice(0, 5)) {
    const spans = [...link.querySelectorAll('span')];
    // test your extraction logic here
    results.push({ name: '...', price: '...', unit: '...' });
  }
  return results;
});
```

### Step 4 — Update both files

Update [extension/selectors.json](../../extension/selectors.json) first (source of truth), then mirror the exact same values into [extension/store-selectors.js](../../extension/store-selectors.js).

For a **new store**, also add its URL match patterns to `content_scripts[0].matches` in [extension/manifest.json](../../extension/manifest.json).

### Step 5 — Confirm

Tell the user:
- Which fields were updated and what values were set
- Whether they need to reload the extension at `chrome://extensions` (always yes after JS changes)
- If it was a structural extraction, show sample extracted values from the verification step
