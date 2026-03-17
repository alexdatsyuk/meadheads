import { deepStrictEqual, match, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildItemList,
  buildOrderReport,
  buildPersonBlock,
  decodeShareLink,
  encodeShareLink,
  extractShareData,
  formatPrice,
  generateRandomName,
  isWholesale,
  itemLine,
  mergeQuantities,
  pickPrice,
  totalPackCount,
} from './cart.ts';
import type { CartItem, PersonOrder, ShareTuple } from './types.ts';

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

describe('itemLine', () => {
  it('formats item without price', () => {
    strictEqual(itemLine(2, 'Huila Timana'), '2× Huila Timana');
  });
});

describe('buildItemList', () => {
  it('builds plain item list without prices', () => {
    const items: ShareTuple[] = [
      ['abc', 2, 'Huila Timana'],
      ['def', 1, 'Gitwe'],
    ];
    strictEqual(buildItemList(items), '2× Huila Timana\n1× Gitwe');
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

describe('generateRandomName', () => {
  it('matches "Word Word" pattern', () => {
    const name = generateRandomName();
    match(name, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it('returns a string', () => {
    strictEqual(typeof generateRandomName(), 'string');
  });
});

describe('totalPackCount', () => {
  it('sums counts across items', () => {
    const items: CartItem[] = [
      { slug: 'a', count: 5 },
      { slug: 'b', count: 3 },
      { slug: 'c', count: 8 },
    ];
    strictEqual(totalPackCount(items), 16);
  });

  it('returns 0 for empty cart', () => {
    strictEqual(totalPackCount([]), 0);
  });
});

describe('isWholesale', () => {
  it('returns true at 16 packs', () => {
    const items: CartItem[] = [{ slug: 'a', count: 16 }];
    strictEqual(isWholesale(items), true);
  });

  it('returns false below 16 packs', () => {
    const items: CartItem[] = [{ slug: 'a', count: 15 }];
    strictEqual(isWholesale(items), false);
  });

  it('returns true above 16 packs', () => {
    const items: CartItem[] = [
      { slug: 'a', count: 10 },
      { slug: 'b', count: 8 },
    ];
    strictEqual(isWholesale(items), true);
  });
});

describe('pickPrice', () => {
  const item: CartItem = {
    slug: 'a',
    count: 1,
    variant: { price_retail: 400, price_wholesale: 350 },
  };

  it('returns retail price when not wholesale', () => {
    strictEqual(pickPrice(item, false), 400);
  });

  it('returns wholesale price when wholesale', () => {
    strictEqual(pickPrice(item, true), 350);
  });

  it('returns 0 when variant is missing', () => {
    strictEqual(pickPrice({ slug: 'a', count: 1 }, false), 0);
  });

  it('returns 0 when wholesale price is missing', () => {
    const noWholesale: CartItem = {
      slug: 'a',
      count: 1,
      variant: { price_retail: 400 },
    };
    strictEqual(pickPrice(noWholesale, true), 0);
  });
});

describe('buildPersonBlock', () => {
  const cartItems: CartItem[] = [
    {
      slug: 'huila',
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

  it('formats person block with retail prices', () => {
    const order: PersonOrder = {
      name: 'Clunky Cougar',
      items: [
        { slug: 'huila', count: 2, name: 'Huila Timana' },
        { slug: 'gitwe', count: 1, name: 'Gitwe' },
      ],
    };
    const block = buildPersonBlock(order, cartItems, false);
    strictEqual(
      block,
      [
        '— Clunky Cougar —',
        '2× Huila Timana  —  394,00 ₴  =  788,00 ₴',
        '1× Gitwe  —  409,00 ₴',
        'Subtotal:  1197,00 ₴',
      ].join('\n'),
    );
  });

  it('formats person block with wholesale prices', () => {
    const order: PersonOrder = {
      name: 'Clunky Cougar',
      items: [
        { slug: 'huila', count: 2, name: 'Huila Timana' },
        { slug: 'gitwe', count: 1, name: 'Gitwe' },
      ],
    };
    const block = buildPersonBlock(order, cartItems, true);
    strictEqual(
      block,
      [
        '— Clunky Cougar —',
        '2× Huila Timana  —  350,00 ₴  =  700,00 ₴',
        '1× Gitwe  —  380,00 ₴',
        'Subtotal:  1080,00 ₴',
      ].join('\n'),
    );
  });
});

describe('buildOrderReport', () => {
  const cartItems: CartItem[] = [
    {
      slug: 'huila',
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

  it('shows retail prices and "add more" hint when below 16', () => {
    const orders: PersonOrder[] = [
      {
        name: 'Clunky Cougar',
        items: [
          { slug: 'huila', count: 2, name: 'Huila Timana' },
          { slug: 'gitwe', count: 1, name: 'Gitwe' },
        ],
      },
    ];
    const report = buildOrderReport(orders, cartItems);
    match(report, /3 packs/);
    match(report, /Total: 1197,00 ₴/);
    match(report, /Add 13 more for wholesale/);
    match(report, /save 117,00 ₴/);
  });

  it('shows wholesale prices and savings when at 16+ packs', () => {
    const wholesaleCart: CartItem[] = [
      {
        slug: 'huila',
        count: 10,
        variant: { price_retail: 394, price_wholesale: 350 },
      },
      {
        slug: 'gitwe',
        count: 8,
        variant: { price_retail: 409, price_wholesale: 380 },
      },
    ];
    const orders: PersonOrder[] = [
      {
        name: 'Nimble Hamster',
        items: [
          { slug: 'huila', count: 10, name: 'Huila Timana' },
          { slug: 'gitwe', count: 8, name: 'Gitwe' },
        ],
      },
    ];
    const report = buildOrderReport(orders, wholesaleCart);
    match(report, /18 packs/);
    match(report, /Wholesale! You save/);
  });

  it('handles multiple people', () => {
    const multiCart: CartItem[] = [
      {
        slug: 'huila',
        count: 12,
        variant: { price_retail: 394, price_wholesale: 350 },
      },
      {
        slug: 'gitwe',
        count: 6,
        variant: { price_retail: 409, price_wholesale: 380 },
      },
    ];
    const orders: PersonOrder[] = [
      {
        name: 'Nimble Hamster',
        items: [{ slug: 'huila', count: 5, name: 'Huila Timana' }],
      },
      {
        name: 'Clunky Cougar',
        items: [
          { slug: 'huila', count: 7, name: 'Huila Timana' },
          { slug: 'gitwe', count: 6, name: 'Gitwe' },
        ],
      },
    ];
    const report = buildOrderReport(orders, multiCart);
    match(report, /— Nimble Hamster —/);
    match(report, /— Clunky Cougar —/);
    match(report, /18 packs/);
    match(report, /Wholesale!/);
  });

  it('exactly 16 packs triggers wholesale', () => {
    const cart16: CartItem[] = [
      {
        slug: 'a',
        count: 16,
        variant: { price_retail: 400, price_wholesale: 350 },
      },
    ];
    const orders: PersonOrder[] = [
      { name: 'Test', items: [{ slug: 'a', count: 16, name: 'Coffee' }] },
    ];
    const report = buildOrderReport(orders, cart16);
    match(report, /16 packs/);
    match(report, /Wholesale! You save 800,00 ₴/);
  });
});
