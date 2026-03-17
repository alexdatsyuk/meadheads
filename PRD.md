# Meadheads — Product Requirements Document

## Problem

The Madheads team orders coffee together from [madheadscoffee.com](https://madheadscoffee.com) (a Horoshop-powered Ukrainian roaster). There's no built-in way to share or merge shopping carts. Without a tool, one person has to manually re-add everyone's items — slow, error-prone, and annoying.

## Solution

A browser bookmarklet with two modes:

- **Share**: reads your cart, copies a share link with encoded items to clipboard, shows a plain item list.
- **Import**: opens a share link, adds items to your existing cart (merging quantities), assigns a random name to the person, tracks each person's order in `sessionStorage`, shows a multi-person price report with dual pricing (retail vs wholesale at 16+ packs), redirects to checkout.

Hosted as a static landing page on GitHub Pages. Zero backend. Runs entirely client-side on the Horoshop domain.

## Users

Madheads dev team (~10 people). Everyone adds their own items, shares a link in the group chat, and one person imports all links before checkout.

## Share link format

```
https://madheadscoffee.com/#cart=<base64 JSON>
```

Payload is an array of `[slug, count, label]` tuples. Prices are never included — the import side fetches live prices from the API.

## Horoshop API

Single endpoint used:

```
POST /api
{ method: "cart.change", params: { slug, count, options: {} } }
```

- Sets `count` for a product `slug`, returns full cart state.
- Read-only trick: call with a nonexistent slug and `count: 0`.
- Response: `{ ok: true, data: CartItem[] }` — each item has `slug`, `count`, `variant.price_retail`, `variant.price_wholesale`, `product.label`.

## Technical stack

| Concern | Tool |
|---|---|
| Language | TypeScript (native strip-types via Node 24+) |
| Bundler | esbuild (TS → minified IIFE → `javascript:` URI injected into index.html) |
| Tests | `node --test` + `node:assert` (built-in) |
| Lint/format | Biome |
| Tool versions | mise (`.mise.toml`: `node = "24"`, `biome = "latest"`) |
| Hosting | GitHub Pages (static `index.html`) |
| CI | None yet |

**Design principle**: minimize tooling. 1 npm devDependency (esbuild). Everything else is built-in Node or managed via mise.

## Project structure

```
index.html          Landing page with bookmarklet drag target (href is a build artifact)
src/
  types.ts          Horoshop API TypeScript interfaces
  cart.ts           Pure functions — dual pricing, per-person reporting, encoding/decoding share links
  cart.test.ts      Unit tests (29 tests covering all pure functions)
  bookmarklet.ts    Browser entry point — thin glue over cart.ts (fetch, alert, clipboard, sessionStorage)
esbuild.config.js   Bundles src/bookmarklet.ts → minified IIFE, injects into index.html
tsconfig.json       TypeScript config (strict, noEmit, erasableSyntaxOnly)
biome.json          Linter and formatter config
.mise.toml          Tool versions (node, biome)
package.json        Scripts: test, build, lint, format
```

## Key design decisions

- **Pure functions in `cart.ts`**: all logic is testable without a browser. `bookmarklet.ts` is just glue.
- **No framework**: a single static page with no client interactivity doesn't need one.
- **Dual pricing**: orders with 16+ total packs automatically show wholesale prices, with a savings line. Below threshold, a hint shows how many more packs are needed.
- **Per-person tracking**: each import assigns a random Ubuntu-style name (e.g. "Clunky Cougar") and stores the order in `sessionStorage`. The report accumulates across imports within the same browser session.
- **Prices from API only**: share links carry no prices — the import side always fetches live prices, keeping links short and data fresh.
- **Single source of truth**: one copy of each function, bundled by esbuild. No code duplication.

## Known limitations

- Bookmarklets don't work on mobile browsers (no bookmarks bar).
- The `alert()` UI is crude but sufficient for the current user base.
- No error handling for network failures in the bookmarklet (fetch can silently fail).
- Horoshop API is undocumented — types are reverse-engineered and may drift.

## Possible improvements

- Replace `alert()` with an injected DOM overlay for better UX.
- Add error handling / retry for API calls in the bookmarklet.
- Add CI (GitHub Actions: test + lint + build).
- Add a "copy link" button to the landing page for mobile users (QR code?).
- Explore whether Horoshop exposes a cart merge endpoint to simplify import.

## Deployed at

https://alexdatsyuk.github.io/meadheads/
