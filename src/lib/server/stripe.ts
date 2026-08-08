import Stripe from 'stripe';

import { requireStripeEnvironment } from './runtime-env';

export function createStripe() {
  const environment = requireStripeEnvironment();
  return new Stripe(environment.secretKey, {
    appInfo: { name: 'Velora storefront', version: '0.1.0' },
    maxNetworkRetries: 2,
  });
}
