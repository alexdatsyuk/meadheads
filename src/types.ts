/**
 * Horoshop API types for madheadscoffee.com
 *
 * API endpoint: POST /api
 * Request body: { method: "cart.change", params: { slug, count, options: {} } }
 *
 * Setting count=0 with a nonexistent slug (e.g. "_dummy_") reads the cart
 * without modifying it.
 */

export interface CartItemVariant {
  price_retail?: number;
  price_wholesale?: number;
}

export interface CartItemProduct {
  label?: string;
}

export interface CartItem {
  slug: string;
  count: number;
  variant?: CartItemVariant;
  product?: CartItemProduct;
}

export interface CartResponse {
  ok: boolean;
  data: CartItem[];
}

/**
 * Share link tuple: [slug, count, label]
 *
 * Prices are never included — the import side fetches live prices from the API.
 */
export type ShareTuple = [slug: string, count: number, label: string];
