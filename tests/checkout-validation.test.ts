import { describe, expect, it } from 'vitest';

import { checkoutSchema } from '../src/lib/server/checkout-validation';

const variantId = '40000000-0000-4000-8000-000000000001';

describe('checkout input validation', () => {
  it('accepts server-verifiable variant lines', () => {
    expect(checkoutSchema.safeParse({ lines: [{ quantity: 2, variantId }] }).success).toBe(true);
  });

  it('rejects browser-provided price fields', () => {
    const result = checkoutSchema.safeParse({
      lines: [{ priceAmount: 1, quantity: 1, variantId }],
    });

    // Extra properties are stripped; they can never reach the reservation contract.
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lines[0]).toEqual({ quantity: 1, variantId });
  });

  it('rejects duplicate variants and invalid quantities', () => {
    expect(
      checkoutSchema.safeParse({
        lines: [
          { quantity: 1, variantId },
          { quantity: 2, variantId },
        ],
      }).success,
    ).toBe(false);
    expect(checkoutSchema.safeParse({ lines: [{ quantity: 6, variantId }] }).success).toBe(false);
  });
});
