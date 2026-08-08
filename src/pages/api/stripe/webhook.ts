import type { APIRoute } from 'astro';
import type Stripe from 'stripe';

import {
  CommerceError,
  finalizePaidCheckout,
  releaseCheckoutSession,
  retrieveCheckoutSession,
} from '../../../lib/server/commerce';
import { requireStripeEnvironment } from '../../../lib/server/runtime-env';
import { createStripe } from '../../../lib/server/stripe';

export const prerender = false;

const acceptedEvents = new Set([
  'checkout.session.async_payment_failed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.completed',
  'checkout.session.expired',
]);

function response(status = 200) {
  return new Response(status === 200 ? 'Received.' : 'Invalid webhook.', { status });
}

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (!signature || (Number.isFinite(contentLength) && contentLength > 1_048_576)) return response(400);

  let event: Stripe.Event;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > 1_048_576) return response(400);
    const environment = requireStripeEnvironment();
    if (!environment.webhookSecret) return response(503);
    event = await createStripe().webhooks.constructEventAsync(
      new Uint8Array(body),
      signature,
      environment.webhookSecret,
    );
  } catch {
    return response(400);
  }

  if (!acceptedEvents.has(event.type)) return response();

  try {
    const eventSession = event.data.object as Stripe.Checkout.Session;
    if (!eventSession.id.startsWith('cs_')) return response();
    const session = await retrieveCheckoutSession(eventSession.id);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      if (session.payment_status === 'paid') await finalizePaidCheckout(session, event);
      return response();
    }

    if (session.metadata?.reservation_id) {
      const released = await releaseCheckoutSession(session, event);
      if (!released) throw new CommerceError('unavailable');
    }
    return response();
  } catch (error) {
    if (error instanceof CommerceError && error.code === 'invalid') return response();
    // A non-2xx response asks Stripe to retry transient provider or database failures.
    return response(500);
  }
};
