/**
 * Bookmarklet entry point — runs on madheadscoffee.com.
 *
 * Two modes:
 *   SHARE  — no #cart hash → read cart, copy share link, show item list
 *   IMPORT — #cart=... in URL → add items to cart, show multi-person report, go to checkout
 */

import {
  buildItemList,
  buildOrderReport,
  decodeShareLink,
  encodeShareLink,
  extractShareData,
  generateRandomName,
  mergeQuantities,
} from './cart.ts';
import type { CartResponse, PersonOrder } from './types.ts';

const API_PATH = '/api';
const API_METHOD = 'cart.change';
const STORAGE_KEY = 'meadheads-orders';

async function cartCall(slug: string, count: number): Promise<CartResponse> {
  const r = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: API_METHOD,
      params: { slug, count, options: {} },
    }),
  });
  return r.json();
}

function loadOrders(): PersonOrder[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: PersonOrder[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
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

    for (const [slug, count] of sharedItems) {
      const newCount = mergeQuantities(existingQty, slug, count);
      await cartCall(slug, newCount);
    }

    // Final cart read — get complete state with both price tiers
    const finalCart = await cartCall('_dummy_', 0);

    const name = generateRandomName();
    const orders = loadOrders();
    orders.push({
      name,
      items: sharedItems.map(([slug, count, label]) => ({
        slug,
        count,
        name: label || slug,
      })),
    });
    saveOrders(orders);

    const report = buildOrderReport(orders, finalCart.data || []);
    alert(`Added to cart:\n\n${report}`);
    location.href = '/checkout';
  } else {
    // ── SHARE MODE ────────────────────────────────────────────────
    const cart = await cartCall('_dummy_', 0);

    if (!cart.data || !cart.data.length) {
      alert('Cart is empty!');
      return;
    }

    const items = extractShareData(cart.data);
    const link = encodeShareLink(location.origin, items);

    await navigator.clipboard.writeText(link);

    alert(`Link copied!\n\n${buildItemList(items)}`);
  }
})();
