import { z } from 'zod';

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

export const profileSchema = z.object({
  firstName: optionalText(80),
  lastName: optionalText(80),
  phone: optionalText(32),
  version: z.coerce.number().int().positive(),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(2).max(120),
  line2: optionalText(120),
  city: z.string().trim().min(2).max(100),
  county: optionalText(100),
  postcode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9 -]{1,8}$/),
  countryCode: z.literal('GB'),
  isDefault: z.boolean(),
});

export const uuidSchema = z.uuid();
export const versionSchema = z.coerce.number().int().positive();
