import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../../lib/server/admin-http';
import { variantPriceAdminSchema } from '../../../../../lib/server/admin-validation';
import { createStripe } from '../../../../../lib/server/stripe';
import { createSupabaseAdmin } from '../../../../../lib/server/supabase';
import { uuidSchema } from '../../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = variantPriceAdminSchema.safeParse({ ...Object.fromEntries(request.form), active: request.form.get('active') === 'true' });
  const returnTo = `/admin/products/${request.form.get('productId')}`;
  if (!id.success || !parsed.success) return adminResultRedirect(returnTo, 'error');
  const admin = createSupabaseAdmin();
  const { data: variant, error: readError } = await admin.from('product_variants')
    .select('id,name,sku,price_amount,currency,stripe_product_id,stripe_price_id,version,product:products(name)')
    .eq('id', id.data).maybeSingle();
  if (readError || !variant) return adminResultRedirect(returnTo, 'error');
  if (variant.version !== parsed.data.version) return adminResultRedirect(returnTo, 'conflict');

  let stripeProductId = variant.stripe_product_id;
  let newPriceId = variant.stripe_price_id;
  let stripe: ReturnType<typeof createStripe> | null = null;
  if (parsed.data.pricePounds !== variant.price_amount) {
    try {
      stripe = createStripe();
      const productRecord = Array.isArray(variant.product) ? variant.product[0] : variant.product;
      if (!stripeProductId) {
        const stripeProduct = await stripe.products.create({
          name: `${productRecord?.name ?? 'Velora watch'} — ${variant.name}`,
          metadata: { variant_id: variant.id, sku: variant.sku },
        }, { idempotencyKey: `variant-product-${variant.id}` });
        stripeProductId = stripeProduct.id;
      }
      const stripePrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: parsed.data.pricePounds,
        currency: variant.currency,
        metadata: { variant_id: variant.id, sku: variant.sku },
      }, { idempotencyKey: `variant-price-${variant.id}-${parsed.data.pricePounds}` });
      newPriceId = stripePrice.id;
    } catch {
      return adminResultRedirect(`${returnTo}?payment=unavailable`, 'error');
    }
  }

  const { data, error } = await admin.from('product_variants').update({
    price_amount: parsed.data.pricePounds, active: parsed.data.active,
    stripe_product_id: stripeProductId, stripe_price_id: newPriceId, version: parsed.data.version + 1,
  }).eq('id', id.data).eq('version', parsed.data.version).select('id').maybeSingle();
  if (error || !data) {
    if (stripe && newPriceId && newPriceId !== variant.stripe_price_id) await stripe.prices.update(newPriceId, { active: false }).catch(() => undefined);
    return adminResultRedirect(returnTo, data ? 'error' : 'conflict');
  }
  if (stripe && variant.stripe_price_id && newPriceId !== variant.stripe_price_id) {
    await stripe.prices.update(variant.stripe_price_id, { active: false }).catch(() => undefined);
  }
  await writeAudit(request.authorization.user.id, request.authorization.role, 'variant.commerce_updated', 'product_variant', id.data, {
    price_changed: parsed.data.pricePounds !== variant.price_amount, active: parsed.data.active,
  });
  return adminResultRedirect(returnTo);
};
