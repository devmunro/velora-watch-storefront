import { z } from 'zod';

export const checkoutSchema = z
  .object({
    lines: z
      .array(
        z.object({
          quantity: z.number().int().min(1).max(5),
          variantId: z.uuid(),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine((value) => new Set(value.lines.map((line) => line.variantId)).size === value.lines.length, {
    message: 'Duplicate variants are not permitted.',
  });
