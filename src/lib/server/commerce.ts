import type Stripe from 'stripe';
import type { User } from '@supabase/supabase-js';

import type { RuntimeEnvironment } from './runtime-env';
import { createStripe } from './stripe';
import { createSupabaseAdmin } from './supabase';

export type CheckoutLine = { variantId: string; quantity: number };

type ReservationItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  reservation_id: string;
  sku: string;
  unit_amount: number;
  variant_id: string;
  variant_name: string;
};

type VariantRecord = {
  currency: string;
  id: string;
  price_amount: number;
  product_id: string;
  sku: string;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
};

export class CommerceError extends Error {
  constructor(
    public readonly code: 'configuration' | 'invalid' | 'stock' | 'unavailable',
    message = 'Checkout is temporarily unavailable.',
  ) {
    super(message);
    this.name = 'CommerceError';
  }
}

function databaseMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  return String('message' in error ? error.message : '');
}

function stripeObjectId(value: string | { id: string } | null): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value.id;
}

export async function getOrCreateStripeCustomer(user: User): Promise<string> {
  if (!user.email) throw new CommerceError('invalid', 'A verified email address is required.');

  const admin = createSupabaseAdmin();
  const stripe = createStripe();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('stripe_customer_id,version')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) throw new CommerceError('unavailable');

  if (profile?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (!('deleted' in customer) || !customer.deleted) return customer.id;
    } catch {
      // A stale identifier is replaced below without exposing provider details.
    }
  }

  const customer = await stripe.customers.create(
    {
      email: user.email,
      metadata: { velora_user_id: user.id },
    },
    {
      idempotencyKey: profile?.stripe_customer_id
        ? `velora-customer-recovery-${user.id}-${profile.version}`
        : `velora-customer-${user.id}`,
    },
  );

  const { error: saveError } = await admin.from('profiles').upsert(
    {
      stripe_customer_id: customer.id,
      user_id: user.id,
    },
    { onConflict: 'user_id' },
  );

  if (saveError) throw new CommerceError('unavailable');
  return customer.id;
}

export async function reserveInventory(
  userId: string,
  lines: CheckoutLine[],
  expiresAt: Date,
): Promise<{ id: string; items: ReservationItem[] }> {
  const admin = createSupabaseAdmin();
  const { data: reservationId, error } = await admin.schema('private').rpc('reserve_inventory', {
    p_expires_at: expiresAt.toISOString(),
    p_lines: lines.map((line) => ({ quantity: line.quantity, variant_id: line.variantId })),
    p_user_id: userId,
  });

  if (error || typeof reservationId !== 'string') {
    const message = databaseMessage(error);
    if (message.includes('insufficient_stock') || message.includes('unavailable_variant')) {
      throw new CommerceError('stock', 'One or more selections are no longer available.');
    }
    if (message.includes('invalid_reservation_request')) throw new CommerceError('invalid');
    throw new CommerceError('unavailable');
  }

  const { data: items, error: itemsError } = await admin
    .schema('private')
    .from('reservation_items')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('sku');

  if (itemsError || !items?.length) {
    await releaseReservation(reservationId, 'released');
    throw new CommerceError('unavailable');
  }

  return { id: reservationId, items: items as ReservationItem[] };
}

async function activePriceMatches(
  stripe: ReturnType<typeof createStripe>,
  priceId: string | null,
  amount: number,
): Promise<boolean> {
  if (!priceId) return false;

  try {
    const price = await stripe.prices.retrieve(priceId);
    return price.active && price.currency === 'gbp' && price.unit_amount === amount;
  } catch {
    return false;
  }
}

export async function prepareStripeLineItems(
  reservationItems: ReservationItem[],
): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  const admin = createSupabaseAdmin();
  const stripe = createStripe();
  const variantIds = reservationItems.map((item) => item.variant_id);
  const { data, error } = await admin
    .from('product_variants')
    .select('id,product_id,sku,price_amount,currency,stripe_product_id,stripe_price_id')
    .in('id', variantIds);

  if (error || data?.length !== variantIds.length) throw new CommerceError('unavailable');
  const variants = new Map((data as VariantRecord[]).map((variant) => [variant.id, variant]));
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const item of reservationItems) {
    const variant = variants.get(item.variant_id);
    if (!variant || variant.currency !== 'gbp') throw new CommerceError('unavailable');

    let productId = variant.stripe_product_id;
    if (productId) {
      try {
        const existing = await stripe.products.retrieve(productId);
        if (existing.deleted) productId = null;
      } catch {
        productId = null;
      }
    }

    if (!productId) {
      const product = await stripe.products.create(
        {
          name: `${item.product_name} — ${item.variant_name}`,
          metadata: { sku: item.sku, variant_id: item.variant_id },
        },
        { idempotencyKey: `velora-product-${item.variant_id}` },
      );
      productId = product.id;
    }

    let priceId = variant.stripe_price_id;
    if (!(await activePriceMatches(stripe, priceId, item.unit_amount))) {
      // A reservation keeps its price snapshot even if an editor changes the catalogue concurrently.
      if (priceId && variant.price_amount === item.unit_amount) {
        await stripe.prices.update(priceId, { active: false }).catch(() => undefined);
      }

      const price = await stripe.prices.create(
        {
          currency: 'gbp',
          metadata: { sku: item.sku, variant_id: item.variant_id },
          product: productId,
          unit_amount: item.unit_amount,
        },
        { idempotencyKey: `velora-price-${item.variant_id}-${item.unit_amount}-gbp` },
      );
      priceId = price.id;
    }

    if (variant.price_amount === item.unit_amount) {
      const { error: saveError } = await admin
        .from('product_variants')
        .update({ stripe_price_id: priceId, stripe_product_id: productId })
        .eq('id', item.variant_id)
        .eq('price_amount', item.unit_amount);
      if (saveError) throw new CommerceError('unavailable');
    }

    if (!priceId) throw new CommerceError('unavailable');
    lineItems.push({ price: priceId, quantity: item.quantity });
  }

  return lineItems;
}

export async function attachCheckoutSession(reservationId: string, userId: string, sessionId: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.schema('private').rpc('attach_checkout_session', {
    p_checkout_session_id: sessionId,
    p_reservation_id: reservationId,
    p_user_id: userId,
  });
  if (error || data !== true) throw new CommerceError('unavailable');
}

export async function releaseReservation(
  reservationId: string,
  status: 'expired' | 'released',
  event?: Pick<Stripe.Event, 'id' | 'type'>,
): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.schema('private').rpc('release_reservation', {
    p_event_id: event?.id ?? null,
    p_event_type: event?.type ?? null,
    p_release_status: status,
    p_reservation_id: reservationId,
  });
  return !error && data === true;
}

function shippingAddress(session: Stripe.Checkout.Session): Record<string, string | null> {
  const shipping = session.collected_information?.shipping_details;
  if (!shipping) return {};

  return {
    city: shipping.address.city,
    country: shipping.address.country,
    line1: shipping.address.line1,
    line2: shipping.address.line2,
    name: shipping.name,
    postal_code: shipping.address.postal_code,
    state: shipping.address.state,
  };
}

function paymentDetails(session: Stripe.Checkout.Session) {
  const paymentIntent =
    session.payment_intent && typeof session.payment_intent !== 'string' ? session.payment_intent : null;
  const charge =
    paymentIntent?.latest_charge && typeof paymentIntent.latest_charge !== 'string'
      ? paymentIntent.latest_charge
      : null;

  return {
    paymentIntentId: stripeObjectId(session.payment_intent),
    receiptUrl: charge?.receipt_url ?? '',
  };
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = createStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent.latest_charge'],
  });
}

export async function finalizePaidCheckout(
  session: Stripe.Checkout.Session,
  event?: Pick<Stripe.Event, 'id' | 'type'>,
): Promise<string> {
  const reservationId = session.metadata?.reservation_id;
  const userId = session.metadata?.user_id;
  const customerEmail = session.customer_details?.email;

  if (
    !reservationId ||
    !userId ||
    !customerEmail ||
    session.payment_status !== 'paid' ||
    session.currency !== 'gbp' ||
    !session.amount_total
  ) {
    throw new CommerceError('invalid');
  }

  const { paymentIntentId, receiptUrl } = paymentDetails(session);
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.schema('private').rpc('finalize_reservation', {
    p_amount_total: session.amount_total,
    p_checkout_session_id: session.id,
    p_currency: session.currency,
    p_customer_email: customerEmail,
    p_event_id: event?.id ?? null,
    p_event_type: event?.type ?? null,
    p_payment_intent_id: paymentIntentId,
    p_receipt_url: receiptUrl,
    p_reservation_id: reservationId,
    p_shipping_address: shippingAddress(session),
    p_user_id: userId,
  });

  if (error || typeof data !== 'string') throw new CommerceError('unavailable');
  return data;
}

export async function releaseCheckoutSession(
  session: Stripe.Checkout.Session,
  event: Pick<Stripe.Event, 'id' | 'type'>,
): Promise<boolean> {
  const reservationId = session.metadata?.reservation_id;
  if (!reservationId) return false;
  return releaseReservation(reservationId, 'expired', event);
}

export async function cleanupOrphanedReservations(environment?: RuntimeEnvironment): Promise<number> {
  const admin = createSupabaseAdmin(environment);
  const { data, error } = await admin.schema('private').rpc('cleanup_orphaned_reservations');
  if (error || typeof data !== 'number') throw new CommerceError('unavailable');
  return data;
}
