import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140);
const internalPath = z.string().trim().regex(/^\/(?!\/)/).max(500);
const version = z.coerce.number().int().positive();
const position = z.coerce.number().int().min(0).max(999);
const pounds = z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/).transform((value) => Math.round(Number(value) * 100));

export const settingsAdminSchema = z.object({
  announcement: z.string().trim().min(3).max(160),
  freeShippingThresholdPounds: pounds.refine((value) => value <= 1_000_000),
  contactEmail: z.union([z.literal(''), z.email().max(254)]).transform((value) => value || null),
  defaultSeoTitle: z.string().trim().min(3).max(70),
  defaultSeoDescription: z.string().trim().min(20).max(170),
  version,
});

export const heroAdminSchema = z.object({
  eyebrow: z.string().trim().min(2).max(100),
  title: z.string().trim().min(2).max(100),
  accent: z.string().trim().min(2).max(100),
  body: z.string().trim().min(20).max(400),
  primaryLabel: z.string().trim().min(2).max(60),
  primaryHref: internalPath,
  secondaryLabel: optionalText(60),
  secondaryHref: z.union([z.literal(''), internalPath]).transform((value) => value || null),
  mediaPath: internalPath,
  mediaAlt: z.string().trim().min(5).max(240),
  position,
  version,
});

export const benefitAdminSchema = z.object({
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(3).max(140),
  icon: z.enum(['shield', 'delivery', 'returns', 'quality']),
  position,
  version,
});

export const productAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug,
  collectionId: z.union([z.literal(''), z.uuid()]).transform((value) => value || null),
  position,
  shortDescription: z.string().trim().min(20).max(280),
  description: z.string().trim().min(40).max(4000),
  specifications: z.string().min(2).max(5000),
  primaryImagePath: internalPath,
  primaryImageAlt: z.string().trim().min(5).max(240),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  featured: z.boolean(),
  version,
});

export const productCreateAdminSchema = productAdminSchema.omit({ version: true, specifications: true }).extend({
  caseSpecification: optionalText(160),
  movementSpecification: optionalText(160),
  crystalSpecification: optionalText(160),
  waterResistanceSpecification: optionalText(160),
  warrantySpecification: optionalText(160),
  variantName: z.string().trim().min(2).max(100),
  sku: z.string().trim().regex(/^[A-Z0-9-]+$/).max(40),
  finish: z.string().trim().min(2).max(100),
  strap: z.string().trim().min(2).max(100),
  pricePounds: pounds.refine((value) => value >= 100 && value <= 10_000_000),
  initialStock: z.coerce.number().int().min(0).max(100_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
});

export const variantAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sku: z.string().trim().regex(/^[A-Z0-9-]+$/).max(40),
  finish: z.string().trim().min(2).max(100),
  strap: z.string().trim().min(2).max(100),
  position,
  version,
  productId: z.uuid(),
});

export const variantCreateAdminSchema = variantAdminSchema.omit({ version: true }).extend({
  pricePounds: pounds.refine((value) => value >= 100 && value <= 10_000_000),
  initialStock: z.coerce.number().int().min(0).max(100_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
});

export const variantPriceAdminSchema = z.object({
  pricePounds: pounds.refine((value) => value >= 100 && value <= 10_000_000),
  active: z.boolean(),
  version,
  productId: z.uuid(),
});

export const collectionAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  eyebrow: z.string().trim().min(2).max(100),
  description: z.string().trim().min(20).max(1000),
  imagePath: internalPath,
  imageAlt: z.string().trim().min(5).max(240),
  position,
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  version,
});
export const collectionCreateAdminSchema = collectionAdminSchema.omit({ version: true });

export const journalAdminSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug,
  excerpt: z.string().trim().min(20).max(300),
  body: z.string().trim().min(50).max(12_000),
  imagePath: internalPath,
  imageAlt: z.string().trim().min(5).max(240),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  authorName: z.string().trim().min(2).max(100),
  categoryId: z.union([z.literal(''), z.uuid()]).transform((value) => value || null),
  featured: z.boolean(),
  relatedProductIds: z.array(z.uuid()).max(12).default([]),
  version: version.optional(),
});

export const homepageSectionAdminSchema = z.object({
  eyebrow: z.string().trim().min(2).max(100),
  heading: z.string().trim().min(2).max(140),
  accent: optionalText(100),
  body: z.string().trim().min(10).max(700),
  mediaPath: z.union([z.literal(''), internalPath]).transform((value) => value || null),
  mediaAlt: optionalText(240),
  primaryLabel: optionalText(60),
  primaryHref: z.union([z.literal(''), internalPath]).transform((value) => value || null),
  featuredProductId: z.union([z.literal(''), z.uuid()]).transform((value) => value || null),
  featuredCollectionId: z.union([z.literal(''), z.uuid()]).transform((value) => value || null),
  featuredJournalPostId: z.union([z.literal(''), z.uuid()]).transform((value) => value || null),
  position,
  visible: z.boolean(),
  version,
});

export const onboardingAdminSchema = z.object({
  action: z.enum(['complete', 'dismiss', 'restart']),
});

export const policyAdminSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug,
  body: z.string().trim().min(40).max(12_000),
  version: version.optional(),
});

export const publishAdminSchema = z.object({
  entity: z.enum(['products', 'collections', 'hero_slides', 'homepage_sections', 'journal_posts', 'policy_pages', 'product_media', 'navigation_items']),
  id: z.uuid(),
  version,
  status: z.enum(['draft', 'published']),
  returnTo: z.string().regex(/^\/admin(?:\/|$)/).max(300),
});

export const inventoryAdjustmentSchema = z.object({
  variantId: z.uuid(),
  delta: z.coerce.number().int().min(-1000).max(1000).refine((value) => value !== 0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  note: z.string().trim().min(3).max(240),
  version,
});

export const orderFulfilmentSchema = z.object({
  status: z.enum(['paid', 'processing', 'shipped', 'cancelled', 'refunded']),
  trackingNumber: optionalText(120),
  trackingUrl: z.union([z.literal(''), z.url().startsWith('https://').max(500)]).transform((value) => value || null),
  version,
});

export const staffAdminSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  role: z.enum(['owner', 'editor', 'fulfilment']),
});

export const staffUpdateSchema = z.object({
  userId: z.uuid(),
  role: z.enum(['owner', 'editor', 'fulfilment']),
  active: z.boolean(),
  version,
});

export const mediaSignSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().min(1).max(10_485_760),
  altText: z.string().trim().min(5).max(240),
  productId: z.union([z.literal(''), z.uuid()]).transform((value) => value || null),
});

export const productMediaAdminSchema = z.object({
  altText: z.string().trim().min(5).max(240),
  position,
  version,
});

export const navigationAdminSchema = z.object({
  label: z.string().trim().min(2).max(40),
  href: internalPath,
  position,
  version,
});
