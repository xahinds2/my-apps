# Wish Me — Vision

## What it is

A personal wishlist app. Not a product search engine, not a price tracker — just a simple place to remember what you want in life and jump to the right store when you're ready to buy.

## The problem it solves

When you want something, you often:
- Browse multiple stores (Amazon, Myntra, Flipkart, etc.)
- Find a few specific listings you like
- Then forget where you found them

Wish Me is your memory. Jot down the item, paste the store links you shortlisted, and come back to them anytime.

## Core principles

**1. No scraping, ever**
We do not fetch product data automatically. Stores block it, it breaks constantly, and it's not the point. The user is the curator.

**2. Links are first-class**
Each wish item can have multiple store links — different products or different stores for the same thing. Clicking a link opens the store directly.

**3. One click to the store**
The app is a launchpad, not a destination. The goal is to get the user to the store as fast as possible when they're ready to buy.

**4. Zero maintenance**
No scrapers to fix, no store-specific code to update, no API keys for external services. The only moving parts are the user's own links.

## What a wish item looks like

- A name (typed by the user, e.g. "Nike Air Max 95")
- Zero or more store links, each associated with a specific product listing
- Created date

## What we intentionally leave out

- Live prices — too fragile, requires scraping
- Product images — not available without scraping or JS rendering
- Store filtering / explore pages — no scraped catalog to filter
- Price history / alerts — out of scope

## Who it's for

Anyone who browses products across stores and wants a lightweight place to track their shortlist — without relying on store wishlists that are siloed per platform.
