import type { APIContext } from 'astro';

import type { StaffRole } from './admin-permissions';
import { createSupabaseAdmin, getStaffRole } from './supabase';

export type { StaffRole } from './admin-permissions';

export const roleLabels: Record<StaffRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  fulfilment: 'Fulfilment',
};

export async function authorizeAdmin(
  context: Pick<APIContext, 'locals'>,
  allowed: StaffRole[] = ['owner', 'editor', 'fulfilment'],
) {
  const user = context.locals.user;
  if (!user) return null;
  const role = await getStaffRole(user.id);
  if (!role || !allowed.includes(role)) return null;
  return { user, role };
}

export async function writeAudit(
  actorUserId: string,
  actorRole: StaffRole,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  const admin = createSupabaseAdmin();
  const { error } = await admin.schema('private').from('audit_logs').insert({
    actor_user_id: actorUserId,
    actor_role: actorRole,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
  if (error) throw new Error('Unable to record the administrative action.');
}

export async function getAdminDashboard(userId?: string) {
  const admin = createSupabaseAdmin();
  const [products, orders, drafts, inventory, reservations, pendingOrders, recentActivity, preferences] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('id', { count: 'exact', head: true }),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    admin.schema('private').from('inventory').select('on_hand,reserved,low_stock_threshold'),
    admin
      .schema('private')
      .from('inventory_reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'processing']),
    admin.schema('private').from('audit_logs').select('id,action,entity_type,created_at').order('created_at', { ascending: false }).limit(6),
    userId
      ? admin.schema('private').from('staff_preferences').select('*').eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const stock = inventory.data ?? [];
  return {
    productCount: products.count ?? 0,
    orderCount: orders.count ?? 0,
    draftCount: drafts.count ?? 0,
    pendingReservationCount: reservations.count ?? 0,
    pendingOrderCount: pendingOrders.count ?? 0,
    lowStockCount: stock.filter((item) => item.on_hand - item.reserved <= item.low_stock_threshold).length,
    outOfStockCount: stock.filter((item) => item.on_hand - item.reserved <= 0).length,
    recentActivity: recentActivity.data ?? [],
    onboarding: preferences.data,
  };
}

export async function getAdminContent() {
  const admin = createSupabaseAdmin();
  const [settings, hero, benefits, navigation, sections, products, collections, journal] = await Promise.all([
    admin.from('site_settings').select('*').eq('singleton_key', 'primary').single(),
    admin.from('hero_slides').select('*').order('position'),
    admin.from('benefits').select('*').order('position'),
    admin.from('navigation_items').select('*').order('position'),
    admin.from('homepage_sections').select('*').order('position'),
    admin.from('products').select('id,name,status').order('name'),
    admin.from('collections').select('id,name,status').order('name'),
    admin.from('journal_posts').select('id,title,status').order('created_at', { ascending: false }),
  ]);
  if (settings.error || hero.error || benefits.error || navigation.error || sections.error) throw new Error('Unable to load site content.');
  return {
    settings: settings.data,
    heroSlides: hero.data ?? [], benefits: benefits.data ?? [], navigation: navigation.data ?? [],
    sections: sections.data ?? [], products: products.data ?? [], collections: collections.data ?? [], journal: journal.data ?? [],
  };
}

export async function getAdminSettings() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('site_settings').select('*').eq('singleton_key', 'primary').single();
  if (error) throw new Error('Unable to load store settings.');
  return data;
}

export async function getAdminProducts() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('products')
    .select('id,slug,name,status,featured,position,version,collection:collections(name),variants:product_variants(id,sku,name,price_amount,active)')
    .order('position');
  if (error) throw new Error('Unable to load products.');
  return data ?? [];
}

export async function getAdminProduct(id: string) {
  const admin = createSupabaseAdmin();
  const [product, collections] = await Promise.all([
    admin.from('products').select('*,variants:product_variants(*)').eq('id', id).maybeSingle(),
    admin.from('collections').select('id,name,status').order('position'),
  ]);
  if (product.error || collections.error) throw new Error('Unable to load that product.');
  return { product: product.data, collections: collections.data ?? [] };
}

export async function getAdminProductCreator() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('collections').select('id,name,status').order('position');
  if (error) throw new Error('Unable to load the product creator.');
  return { collections: data ?? [] };
}

export async function getAdminCollections() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('collections').select('*').order('position');
  if (error) throw new Error('Unable to load collections.');
  return data ?? [];
}

export async function getAdminCollection(id: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('collections').select('*,products(id,name,status,position)').eq('id', id).maybeSingle();
  if (error) throw new Error('Unable to load that collection.');
  return data;
}

export async function getAdminJournal() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('journal_posts').select('*,category:journal_categories(name,slug)').order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load journal posts.');
  return data ?? [];
}

export async function getAdminJournalEditor(id?: string) {
  const admin = createSupabaseAdmin();
  const [post, categories, products, media] = await Promise.all([
    id
      ? admin.from('journal_posts').select('*,related:journal_post_products(product_id)').eq('id', id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from('journal_categories').select('id,name,slug,status').order('position'),
    admin.from('products').select('id,name,status').order('name'),
    admin.from('product_media').select('id,storage_path,alt_text,product:products(name)').eq('status', 'published').order('created_at', { ascending: false }),
  ]);
  if (post.error || categories.error || products.error || media.error) throw new Error('Unable to load the article editor.');
  return { post: post.data, categories: categories.data ?? [], products: products.data ?? [], media: (media.data ?? []).map((item) => ({ ...item, public_url: admin.storage.from('catalogue').getPublicUrl(item.storage_path).data.publicUrl })) };
}

export async function getAdminPolicy(id: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('policy_pages').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Unable to load that policy.');
  return data;
}

export async function getAdminPolicies() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('policy_pages').select('*').order('title');
  if (error) throw new Error('Unable to load policy pages.');
  return data ?? [];
}

export async function getAdminInventory() {
  const admin = createSupabaseAdmin();
  const [inventory, variants, reservations, movements] = await Promise.all([
    admin
      .schema('private')
      .from('inventory')
      .select('*')
      .order('on_hand'),
    admin.from('product_variants').select('id,sku,name,product:products(name)'),
    admin
      .schema('private')
      .from('inventory_reservations')
      .select('id,status,expires_at,created_at,items:reservation_items(quantity,sku,product_name)')
      .eq('status', 'pending')
      .order('expires_at'),
    admin
      .schema('private')
      .from('inventory_movements')
      .select('id,variant_id,reason,delta_on_hand,delta_reserved,note,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (inventory.error || variants.error || reservations.error || movements.error) throw new Error('Unable to load inventory.');
  const variantsById = new Map((variants.data ?? []).map((variant) => [variant.id, variant]));
  return {
    inventory: (inventory.data ?? []).map((item) => ({ ...item, variant: variantsById.get(item.variant_id) ?? null })),
    reservations: reservations.data ?? [], movements: movements.data ?? [],
  };
}

export async function getAdminOrders() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('orders')
    .select('id,status,total_amount,currency,customer_email,tracking_number,created_at,order_items(product_name,quantity)')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load orders.');
  return data ?? [];
}

export async function getAdminOrder(id: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('orders').select('*,order_items(*)').eq('id', id).maybeSingle();
  if (error) throw new Error('Unable to load that order.');
  return data;
}

export async function getAdminMedia() {
  const admin = createSupabaseAdmin();
  const [uploads, products, catalogueMedia] = await Promise.all([
    admin
      .schema('private')
      .from('media_uploads')
      .select('*')
      .order('created_at', { ascending: false }),
    admin.from('products').select('id,name').order('name'),
    admin.from('product_media').select('*,product:products(name)').order('product_id').order('position'),
  ]);
  if (uploads.error || products.error || catalogueMedia.error) throw new Error('Unable to load media.');
  const productsById = new Map((products.data ?? []).map((product) => [product.id, product]));
  return {
    uploads: (uploads.data ?? []).map((upload) => ({ ...upload, product: upload.product_id ? productsById.get(upload.product_id) ?? null : null })),
    products: products.data ?? [],
    catalogueMedia: (catalogueMedia.data ?? []).map((item) => ({ ...item, public_url: admin.storage.from('catalogue').getPublicUrl(item.storage_path).data.publicUrl })),
  };
}

export async function getAdminStaff() {
  const admin = createSupabaseAdmin();
  const [{ data, error }, authUsers] = await Promise.all([
    admin.schema('private').from('staff_members').select('*').order('created_at'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error || authUsers.error) throw new Error('Unable to load staff accounts.');
  const emailById = new Map(authUsers.data.users.map((user) => [user.id, user.email ?? 'Unknown email']));
  return (data ?? []).map((member) => ({ ...member, email: emailById.get(member.user_id) ?? 'Unknown email' }));
}

export async function getAdminAudit() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .schema('private')
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150);
  if (error) throw new Error('Unable to load audit history.');
  return data ?? [];
}
