import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

/** Extract the built bookmarklet JS from index.html href attribute. */
function getBookmarkletCode(): string {
  const html = readFileSync('index.html', 'utf8');
  const match = html.match(/href="javascript:([\s\S]*?)"\s*aria-label/);
  if (!match) throw new Error('Bookmarklet href not found in index.html');
  return match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

const CART_ITEMS = [
  {
    slug: 'huila-timana',
    count: 2,
    variant: { price_retail: 394, price_wholesale: 350 },
    product: { label: 'Huila Timana' },
  },
  {
    slug: 'gitwe',
    count: 1,
    variant: { price_retail: 409, price_wholesale: 380 },
    product: { label: 'Gitwe' },
  },
];

/** Encode share tuples into a hash fragment. */
function encodeCart(items: [string, number, string][]): string {
  return `cart=${btoa(JSON.stringify(items))}`;
}

/** Set up a mock page with API routing and run bookmarklet, returning alert text. */
async function runBookmarklet(
  page: import('@playwright/test').Page,
  hash: string,
  apiData: unknown[],
): Promise<string> {
  // Serve a minimal HTML page so fetch('/api') works
  await page.route('**/*', (route, request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: apiData }),
      });
    }
    if (url.pathname === '/' || url.pathname === '/checkout') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<html><body>mock</body></html>',
      });
    }
    return route.continue();
  });

  await page.goto(`http://localhost:9999/${hash ? `#${hash}` : ''}`);

  const dialogPromise = page.waitForEvent('dialog');
  await page.evaluate((code) => {
    // biome-ignore lint: eval is needed to run the bookmarklet
    eval(code);
  }, getBookmarkletCode());
  const dialog = await dialogPromise;
  const message = dialog.message();
  await dialog.accept();
  return message;
}

test.describe('share mode', () => {
  test('alert shows item list with proper newlines', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const message = await runBookmarklet(page, '', CART_ITEMS);

    // Should start with "Link copied!" followed by blank line then items
    const lines = message.split('\n');
    expect(lines[0]).toBe('Link copied!');
    expect(lines[1]).toBe(''); // blank separator
    expect(lines[2]).toBe('2× Huila Timana');
    expect(lines[3]).toBe('1× Gitwe');
    expect(lines).toHaveLength(4);
  });
});

test.describe('import mode', () => {
  test('alert shows person block with proper newlines', async ({ page }) => {
    const shareTuples: [string, number, string][] = [
      ['huila-timana', 2, 'Huila Timana'],
      ['gitwe', 1, 'Gitwe'],
    ];

    const message = await runBookmarklet(page, encodeCart(shareTuples), CART_ITEMS);

    const lines = message.split('\n');

    // "Added to cart:" then blank line
    expect(lines[0]).toBe('Added to cart:');
    expect(lines[1]).toBe('');

    // Person block: "— Name —" header
    expect(lines[2]).toMatch(/^— .+ —$/);

    // Item lines with prices
    expect(lines[3]).toMatch(/^2× Huila Timana {2}— {2}\d+,\d+ ₴ {2}= {2}\d+,\d+ ₴$/);
    expect(lines[4]).toMatch(/^1× Gitwe {2}— {2}\d+,\d+ ₴$/);

    // Subtotal
    expect(lines[5]).toMatch(/^Subtotal: {2}\d+,\d+ ₴$/);

    // Blank line then separator
    expect(lines[6]).toBe('');
    expect(lines[7]).toMatch(/^─+$/);

    // Pack count and total
    expect(lines[8]).toMatch(/^3 packs {2}· {2}Total: \d+,\d+ ₴$/);

    // "Add N more" hint (below 16 packs)
    expect(lines[9]).toMatch(/^Add \d+ more for wholesale/);

    // No extra lines
    expect(lines).toHaveLength(10);
  });

  test('second import accumulates orders with proper separation', async ({ page }) => {
    const items1: [string, number, string][] = [
      ['huila-timana', 2, 'Huila Timana'],
    ];
    const items2: [string, number, string][] = [
      ['gitwe', 1, 'Gitwe'],
    ];

    // First import
    const msg1 = await runBookmarklet(page, encodeCart(items1), CART_ITEMS);
    expect((msg1.match(/^— .+ —$/gm) || []).length).toBe(1);

    // Second import — need to set up routes again on same page context
    // (page navigated to /checkout, so we re-navigate)
    const msg2 = await runBookmarklet(page, encodeCart(items2), CART_ITEMS);

    // Should have 2 person blocks
    const personHeaders = msg2.match(/^— .+ —$/gm) || [];
    expect(personHeaders.length).toBe(2);

    // Two person blocks should be separated by a blank line
    // Find the pattern: "Subtotal: ...\n\n— Name —"
    expect(msg2).toMatch(/Subtotal: .+\n\n— .+ —/);
  });
});
