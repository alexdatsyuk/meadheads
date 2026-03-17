/**
 * Bookmarklet entry point — runs on madheadscoffee.com.
 *
 * Two modes:
 *   SHARE  — no #cart hash → read cart, copy share link, show price report
 *   IMPORT — #cart=... in URL → add items to cart, show price report, go to checkout
 */

import {
  buildReport,
  decodeShareLink,
  encodeShareLink,
  extractShareData,
  formatPrice,
  mergeQuantities,
  resolvePrice,
} from './cart.ts';
import type { CartResponse } from './types.ts';

const API_PATH = '/api';
const API_METHOD = 'cart.change';
const NL = '\n';

function cartCall(slug: string, count: number): Promise<CartResponse> {
  return fetch(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: API_METHOD,
      params: { slug, count, options: {} },
    }),
  }).then((r) => r.json());
}

(async () => {
  const hash = location.hash.slice(1);

  if (hash.startsWith('cart=')) {
    // ── IMPORT MODE ───────────────────────────────────────────────
    const sharedItems = decodeShareLink(hash);

    const currentCart = await cartCall('_dummy_', 0);
    const existingQty = new Map(
      (currentCart.data || []).map((item) => [item.slug, item.count] as const),
    );

    const reportItems = [];

    for (const [slug, count, name] of sharedItems) {
      const newCount = mergeQuantities(existingQty, slug, count);
      const response = await cartCall(slug, newCount);
      const price = resolvePrice(response.data || [], slug);

      reportItems.push({ count, name: name || slug, price });
    }

    const { lines, total } = buildReport(reportItems);

    alert(
      'Added to cart:' +
        NL +
        NL +
        lines.join(NL) +
        NL +
        NL +
        'Total: ' +
        formatPrice(total),
    );
    location.href = '/checkout';
  } else {
    // ── SHARE MODE ────────────────────────────────────────────────
    const cart = await cartCall('_dummy_', 0);

    if (!cart.data || !cart.data.length) {
      alert('Cart is empty!');
      return;
    }

    const items = extractShareData(cart.data);
    const reportItems = cart.data.map((item) => ({
      count: item.count,
      name: item.product?.label || item.slug,
      price: item.variant?.price_retail || 0,
    }));

    const { lines, total } = buildReport(reportItems);
    const link = encodeShareLink(location.origin, items);

    await navigator.clipboard.writeText(link);

    alert(
      'Link copied!' +
        NL +
        NL +
        lines.join(NL) +
        NL +
        NL +
        'Total: ' +
        formatPrice(total),
    );
  }
})();
