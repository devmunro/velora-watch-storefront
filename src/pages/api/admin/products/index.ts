import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { productCreateAdminSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner']);
  if ('response' in request) return request.response;

  const parsed = productCreateAdminSchema.safeParse({
    ...Object.fromEntries(request.form),
    featured: request.form.get('featured') === 'true',
  });
  if (!parsed.success) return adminResultRedirect('/admin/products/new', 'error');

  const specificationEntries = [
    ['Case', parsed.data.caseSpecification],
    ['Movement', parsed.data.movementSpecification],
    ['Crystal', parsed.data.crystalSpecification],
    ['Water resistance', parsed.data.waterResistanceSpecification],
    ['Warranty', parsed.data.warrantySpecification],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const admin = createSupabaseAdmin();
  // Create the product and its first variant together so every new product can be purchased.
  const { data, error } = await admin.schema('private').rpc('create_product_with_variant', {
    p_actor_user_id: request.authorization.user.id,
    p_collection_id: parsed.data.collectionId,
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_short_description: parsed.data.shortDescription,
    p_description: parsed.data.description,
    p_specifications: Object.fromEntries(specificationEntries),
    p_primary_image_path: parsed.data.primaryImagePath,
    p_primary_image_alt: parsed.data.primaryImageAlt,
    p_position: parsed.data.position,
    p_seo_title: parsed.data.seoTitle,
    p_seo_description: parsed.data.seoDescription,
    p_featured: parsed.data.featured,
    p_variant_name: parsed.data.variantName,
    p_sku: parsed.data.sku,
    p_finish: parsed.data.finish,
    p_strap: parsed.data.strap,
    p_price_amount: parsed.data.pricePounds,
    p_initial_stock: parsed.data.initialStock,
    p_low_stock_threshold: parsed.data.lowStockThreshold,
  });
  if (error || !data) return adminResultRedirect('/admin/products/new', 'error');

  await writeAudit(request.authorization.user.id, request.authorization.role, 'product.created', 'product', data, {
    sku: parsed.data.sku,
    initial_stock: parsed.data.initialStock,
  });
  return adminResultRedirect(`/admin/products/${data}`);
};
