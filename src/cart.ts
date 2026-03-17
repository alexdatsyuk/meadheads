import type { CartItem, ShareTuple } from './types.ts';

/** Format price: 394 → "394,00 ₴" */
export function formatPrice(price: number): string {
  return `${price.toFixed(2).replace('.', ',')} ₴`;
}

/** Build a report line: "2× Huila Timana — 394,00 ₴ = 788,00 ₴" */
export function reportLine(
  count: number,
  name: string,
  unitPrice: number,
): string {
  let line = `${count}× ${name} — ${formatPrice(unitPrice)}`;
  if (count > 1) line += ` = ${formatPrice(unitPrice * count)}`;
  return line;
}

export interface ReportItem {
  count: number;
  name: string;
  price: number;
}

/** Build a full report from a list of items. */
export function buildReport(items: ReportItem[]): {
  lines: string[];
  total: number;
} {
  const lines: string[] = [];
  let total = 0;
  for (const { count, name, price } of items) {
    total += price * count;
    lines.push(reportLine(count, name, price));
  }
  return { lines, total };
}

/** Extract share tuples from cart API response items. */
export function extractShareData(cartItems: CartItem[]): ShareTuple[] {
  return cartItems.map((item) => [
    item.slug,
    item.count,
    item.product?.label || item.slug,
  ]);
}

/** Encode share tuples into a URL hash fragment. */
export function encodeShareLink(origin: string, items: ShareTuple[]): string {
  return `${origin}/#cart=${btoa(JSON.stringify(items))}`;
}

/** Decode share tuples from a URL hash string (without the leading #). */
export function decodeShareLink(hash: string): ShareTuple[] {
  return JSON.parse(atob(hash.slice(5))); // skip "cart="
}

/** Compute the merged quantity for a slug given existing cart quantities. */
export function mergeQuantities(
  existing: Map<string, number>,
  slug: string,
  count: number,
): number {
  return (existing.get(slug) || 0) + count;
}

/** Resolve the live price for an imported item from the API response. */
export function resolvePrice(cartItems: CartItem[], slug: string): number {
  const item = cartItems.find((i) => i.slug === slug);
  return item?.variant?.price_retail || 0;
}
