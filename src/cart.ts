import type { CartItem, PersonOrder, ShareTuple } from './types.ts';

const ADJECTIVES = [
  'Brave',
  'Calm',
  'Daring',
  'Eager',
  'Fancy',
  'Gentle',
  'Happy',
  'Icy',
  'Jolly',
  'Keen',
  'Lively',
  'Merry',
  'Noble',
  'Odd',
  'Proud',
  'Quick',
  'Rusty',
  'Sly',
  'Tough',
  'Vast',
  'Witty',
  'Zany',
  'Clunky',
  'Nimble',
  'Jazzy',
  'Fuzzy',
  'Grumpy',
  'Shiny',
  'Spicy',
  'Wacky',
];

const ANIMALS = [
  'Bear',
  'Cat',
  'Dog',
  'Eagle',
  'Fox',
  'Goat',
  'Hawk',
  'Ibis',
  'Jaguar',
  'Koala',
  'Lion',
  'Moose',
  'Newt',
  'Otter',
  'Panda',
  'Quail',
  'Raven',
  'Snake',
  'Tiger',
  'Urchin',
  'Viper',
  'Wolf',
  'Yak',
  'Zebra',
  'Cougar',
  'Falcon',
  'Hamster',
  'Lizard',
  'Parrot',
  'Squid',
];

/** Format price: 394 → "394,00 ₴" */
export function formatPrice(price: number): string {
  return `${price.toFixed(2).replace('.', ',')} ₴`;
}

/** Format an item line without price: "2× Huila Timana" */
export function itemLine(count: number, name: string): string {
  return `${count}× ${name}`;
}

/** Build a plain item list (no prices). */
export function buildItemList(items: ShareTuple[]): string {
  return items.map(([, count, name]) => itemLine(count, name)).join('\n');
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

/** Generate a random Ubuntu-style name: "Adjective Animal". */
export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

/** Sum of all item counts in the cart. */
export function totalPackCount(cartItems: CartItem[]): number {
  return cartItems.reduce((sum, item) => sum + item.count, 0);
}

/** Whether the cart qualifies for wholesale pricing (16+ packs). */
export function isWholesale(cartItems: CartItem[]): boolean {
  return totalPackCount(cartItems) >= 16;
}

/** Pick the appropriate price tier for an item. */
export function pickPrice(item: CartItem, wholesale: boolean): number {
  if (wholesale) return item.variant?.price_wholesale || 0;
  return item.variant?.price_retail || 0;
}

/** Format a priced report line: "2× Huila Timana  —  394,00 ₴  =  788,00 ₴" */
function reportLine(count: number, name: string, unitPrice: number): string {
  let line = `${count}× ${name}  —  ${formatPrice(unitPrice)}`;
  if (count > 1) line += `  =  ${formatPrice(unitPrice * count)}`;
  return line;
}

/** Build a formatted block for one person's order. */
export function buildPersonBlock(
  order: PersonOrder,
  cartItems: CartItem[],
  wholesale: boolean,
): string {
  const lines: string[] = [`— ${order.name} —`];
  let subtotal = 0;
  for (const orderItem of order.items) {
    const cartItem = cartItems.find((ci) => ci.slug === orderItem.slug);
    const price = cartItem ? pickPrice(cartItem, wholesale) : 0;
    subtotal += price * orderItem.count;
    lines.push(reportLine(orderItem.count, orderItem.name, price));
  }
  lines.push(`Subtotal:  ${formatPrice(subtotal)}`);
  return lines.join('\n');
}

/** Build the full multi-person order report. */
export function buildOrderReport(
  orders: PersonOrder[],
  cartItems: CartItem[],
): string {
  const wholesale = isWholesale(cartItems);
  const blocks = orders.map((o) => buildPersonBlock(o, cartItems, wholesale));
  const packs = totalPackCount(cartItems);

  let total = 0;
  for (const order of orders) {
    for (const orderItem of order.items) {
      const cartItem = cartItems.find((ci) => ci.slug === orderItem.slug);
      const price = cartItem ? pickPrice(cartItem, wholesale) : 0;
      total += price * orderItem.count;
    }
  }

  const lines = [
    blocks.join('\n\n'),
    '',
    '─'.repeat(30),
    `${packs} packs  ·  Total: ${formatPrice(total)}`,
  ];

  // Savings line
  if (wholesale) {
    let retailTotal = 0;
    for (const order of orders) {
      for (const orderItem of order.items) {
        const cartItem = cartItems.find((ci) => ci.slug === orderItem.slug);
        const retailPrice = cartItem?.variant?.price_retail || 0;
        retailTotal += retailPrice * orderItem.count;
      }
    }
    const savings = retailTotal - total;
    if (savings > 0) {
      lines.push(`Wholesale! You save ${formatPrice(savings)}`);
    }
  } else {
    // Calculate potential savings if they hit 16 packs
    const needed = 16 - packs;
    let wholesaleTotal = 0;
    for (const order of orders) {
      for (const orderItem of order.items) {
        const cartItem = cartItems.find((ci) => ci.slug === orderItem.slug);
        const wp = cartItem?.variant?.price_wholesale || 0;
        wholesaleTotal += wp * orderItem.count;
      }
    }
    const potentialSavings = total - wholesaleTotal;
    if (needed > 0 && potentialSavings > 0) {
      lines.push(
        `Add ${needed} more for wholesale (save ${formatPrice(potentialSavings)})`,
      );
    }
  }

  return lines.join('\n');
}
