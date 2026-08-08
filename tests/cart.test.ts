import { describe, expect, it } from 'vitest';

import { cartCount, normaliseCart } from '../src/lib/cart';

describe('cart normalisation', () => {
  it('rejects malformed values and caps quantities', () => {
    expect(
      normaliseCart([
        { variantId: 'variant-one', quantity: 8 },
        { variantId: '', quantity: 1 },
        { variantId: 'variant-two', quantity: 0 },
        null,
      ]),
    ).toEqual([{ variantId: 'variant-one', quantity: 5 }]);
  });

  it('merges duplicate variants without exceeding the checkout limit', () => {
    const cart = normaliseCart([
      { variantId: 'variant-one', quantity: 2 },
      { variantId: 'variant-one', quantity: 4 },
      { variantId: 'variant-two', quantity: 1 },
    ]);

    expect(cart).toEqual([
      { variantId: 'variant-one', quantity: 5 },
      { variantId: 'variant-two', quantity: 1 },
    ]);
    expect(cartCount(cart)).toBe(6);
  });

  it('limits a cart to twenty distinct lines', () => {
    const cart = normaliseCart(
      Array.from({ length: 25 }, (_, index) => ({ quantity: 1, variantId: `variant-${index}` })),
    );

    expect(cart).toHaveLength(20);
  });
});
