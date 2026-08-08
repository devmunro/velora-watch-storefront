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

export async function getAdminDashboard() {
  const admin = createSupabaseAdmin();
  const [products, orders, drafts, inventory, reservations] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('id', { count: 'exact', head: true }),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    admin.schema('private').from('inventory').select('on_hand,reserved,low_stock_threshold'),
    admin
      .schema('private')
      .from('inventory_reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  const stock = inventory.data ?? [];
  return {
    productCount: products.count ?? 0,
    orderCount: orders.count ?? 0,
    draftCount: drafts.count ?? 0,
    pendingReservationCount: reservations.count ?? 0,
    lowStockCount: stock.filter((item) => item.on_hand - item.reserved <= item.low_stock_threshold).length,
  };
}

export async function getAdminContent() {
  const admin = createSupabaseAdmin();
  const [settings, hero, benefits, navigation] = await Promise.all([
    admin.from('site_settings').select('*').eq('singleton_key', 'primary').single(),
    admin.from('hero_slides').select('*').order('position'),
    admin.from('benefits').select('*').order('position'),
    admin.from('navigation_items').select('*').order('position'),
  ]);
  if (settings.error || hero.error || benefits.error || navigation.error) throw new Error('Unable to load site content.');
  return { settings: settings.data, heroSlides: hero.data ?? [], benefits: benefits.data ?? [], navigation: navigation.data ?? [] };
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

export async function getAdminCollections() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('collections').select('*').order('position');
  if (error) throw new Error('Unable to load collections.');
  return data ?? [];
}

export async function getAdminJournal() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('journal_posts').select('*').order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load journal posts.');
  return data ?? [];
}

export async function getAdminPolicies() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('policy_pages').select('*').order('title');
  if (error) throw new Error('Unable to load policy pages.');
  return data ?? [];
}

export async function getAdminInventory() {
  const admin = createSupabaseAdmin();
  const [inventory, reservations, movements] = await Promise.all([
    admin
      .schema('private')
      .from('inventory')
      .select('*,variant:product_variants(id,sku,name,product:products(name))')
      .order('on_hand'),
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
  if (inventory.error || reservations.error || movements.error) throw new Error('Unable to load inventory.');
  return { inventory: inventory.data ?? [], reservations: reservations.data ?? [], movements: movements.data ?? [] };
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
      .select('*,product:products(name)')
      .order('created_at', { ascending: false }),
    admin.from('products').select('id,name').order('name'),
    admin.from('product_media').select('*,product:products(name)').order('product_id').order('position'),
  ]);
  if (uploads.error || products.error || catalogueMedia.error) throw new Error('Unable to load media.');
  return { uploads: uploads.data ?? [], products: products.data ?? [], catalogueMedia: catalogueMedia.data ?? [] };
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
