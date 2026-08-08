import type { APIRoute } from 'astro';

import { checkoutSchema } from '../../../lib/server/checkout-validation';
import {
  attachCheckoutSession,
  CommerceError,
  getOrCreateStripeCustomer,
  prepareStripeLineItems,
  releaseReservation,
  reserveInventory,
} from '../../../lib/server/commerce';
import { isSameOriginRequest, readJson } from '../../../lib/server/http';
import { createStripe } from '../../../lib/server/stripe';

export const prerender = false;

function json(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    status,
  });
}

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) return json('Please sign in before checkout.', 401);
  if (!isSameOriginRequest(context.request)) return json('Invalid request.', 403);

  let reservationId: string | null = null;
  let stripeSessionId: string | null = null;

  try {
    const parsed = checkoutSchema.safeParse(await readJson(context.request, 8_192));
    if (!parsed.success) return json('Your shopping bag could not be verified.', 400);

    const stripe = createStripe();
    const stripeCustomerId = await getOrCreateStripeCustomer(context.locals.user);
    const expiresAtSeconds = Math.floor(Date.now() / 1_000) + 30 * 60;
    const reservation = await reserveInventory(
      context.locals.user.id,
      parsed.data.lines,
      new Date(expiresAtSeconds * 1_000),
    );
    reservationId = reservation.id;

    const lineItems = await prepareStripeLineItems(reservation.items);
    const origin = context.url.origin;
    const session = await stripe.checkout.sessions.create(
      {
        billing_address_collection: 'auto',
        cancel_url: `${origin}/checkout/cancelled`,
        customer: stripeCustomerId,
        customer_update: { address: 'auto', name: 'auto', shipping: 'auto' },
        expires_at: expiresAtSeconds,
        line_items: lineItems,
        locale: 'en-GB',
        metadata: {
          reservation_id: reservation.id,
          user_id: context.locals.user.id,
        },
        mode: 'payment',
        payment_intent_data: {
          metadata: {
            reservation_id: reservation.id,
            user_id: context.locals.user.id,
          },
        },
        phone_number_collection: { enabled: true },
        shipping_address_collection: { allowed_countries: ['GB'] },
        submit_type: 'pay',
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      },
      { idempotencyKey: `velora-checkout-${reservation.id}` },
    );
    stripeSessionId = session.id;

    if (!session.url) throw new CommerceError('unavailable');
    await attachCheckoutSession(reservation.id, context.locals.user.id, session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      status: 201,
    });
  } catch (error) {
    if (stripeSessionId) {
      await createStripe().checkout.sessions.expire(stripeSessionId).catch(() => undefined);
    }
    if (reservationId) await releaseReservation(reservationId, 'released');

    if (error instanceof CommerceError) {
      const status = error.code === 'stock' ? 409 : error.code === 'invalid' ? 400 : 503;
      return json(error.message, status);
    }
    return json('Secure checkout is temporarily unavailable. Please try again.', 503);
  }
};
