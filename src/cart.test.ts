import { deepStrictEqual, match, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildReport,
  decodeShareLink,
  encodeShareLink,
  extractShareData,
  formatPrice,
  mergeQuantities,
  reportLine,
  resolvePrice,
} from './cart.ts';
import type { CartItem, ShareTuple } from './types.ts';

describe('formatPrice', () => {
  it('formats whole number', () => {
    strictEqual(formatPrice(394), '394,00 ₴');
  });

  it('formats zero', () => {
    strictEqual(formatPrice(0), '0,00 ₴');
  });

  it('formats fractional value', () => {
    strictEqual(formatPrice(99.5), '99,50 ₴');
  });

  it('formats large number', () => {
    strictEqual(formatPrice(12345), '12345,00 ₴');
  });
});

describe('reportLine', () => {
  it('single item — no subtotal', () => {
    strictEqual(
      reportLine(1, 'Huila Timana', 394),
      '1× Huila Timana — 394,00 ₴',
    );
  });

  it('multiple items — shows subtotal', () => {
    strictEqual(
      reportLine(2, 'Huila Timana', 394),
      '2× Huila Timana — 394,00 ₴ = 788,00 ₴',
    );
  });

  it('zero price', () => {
    strictEqual(reportLine(1, 'Free Sample', 0), '1× Free Sample — 0,00 ₴');
  });
});

describe('buildReport', () => {
  it('builds report with multiple items', () => {
    const items = [
      { count: 2, name: 'Huila Timana', price: 394 },
      { count: 1, name: 'Gitwe', price: 409 },
    ];
    const { lines, total } = buildReport(items);

    deepStrictEqual(lines, [
      '2× Huila Timana — 394,00 ₴ = 788,00 ₴',
      '1× Gitwe — 409,00 ₴',
    ]);
    strictEqual(total, 1197);
  });

  it('empty list returns zero total', () => {
    const { lines, total } = buildReport([]);
    deepStrictEqual(lines, []);
    strictEqual(total, 0);
  });
});

describe('extractShareData', () => {
  it('extracts tuples from cart items', () => {
    const cartItems: CartItem[] = [
      {
        slug: 'abc-123',
        count: 2,
        product: { label: 'Huila Timana' },
        variant: { price_retail: 394 },
      },
    ];
    deepStrictEqual(extractShareData(cartItems), [
      ['abc-123', 2, 'Huila Timana'],
    ]);
  });

  it('falls back to slug when product label is missing', () => {
    const cartItems: CartItem[] = [{ slug: 'abc-123', count: 1 }];
    deepStrictEqual(extractShareData(cartItems), [['abc-123', 1, 'abc-123']]);
  });

  it('handles missing variant', () => {
    const cartItems: CartItem[] = [
      { slug: 'abc-123', count: 1, product: { label: 'Test' } },
    ];
    deepStrictEqual(extractShareData(cartItems), [['abc-123', 1, 'Test']]);
  });
});

describe('encodeShareLink / decodeShareLink', () => {
  it('round-trips share data', () => {
    const items: ShareTuple[] = [
      ['abc-123', 2, 'Huila Timana'],
      ['def-456', 1, 'Gitwe'],
    ];
    const link = encodeShareLink('https://madheadscoffee.com', items);
    match(link, /^https:\/\/madheadscoffee\.com\/#cart=/);

    const hash = link.split('#')[1];
    const decoded = decodeShareLink(hash);
    deepStrictEqual(decoded, items);
  });
});

describe('mergeQuantities', () => {
  it('adds to existing quantity', () => {
    const existing = new Map([['abc', 3]]);
    strictEqual(mergeQuantities(existing, 'abc', 2), 5);
  });

  it('returns count when slug not in existing', () => {
    const existing = new Map<string, number>();
    strictEqual(mergeQuantities(existing, 'abc', 2), 2);
  });
});

describe('resolvePrice', () => {
  it('returns live API price', () => {
    const cartItems: CartItem[] = [
      { slug: 'abc', count: 1, variant: { price_retail: 400 } },
    ];
    strictEqual(resolvePrice(cartItems, 'abc'), 400);
  });

  it('returns 0 when slug not found', () => {
    strictEqual(resolvePrice([], 'abc'), 0);
  });

  it('returns 0 when variant has no price', () => {
    const cartItems: CartItem[] = [{ slug: 'abc', count: 1, variant: {} }];
    strictEqual(resolvePrice(cartItems, 'abc'), 0);
  });
});
