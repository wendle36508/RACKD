// PLACEHOLDER: the Stripe subscription. RACKD is members-only, so this is the door in.
// When it's built: Stripe sends RACKD a message (a "webhook") whenever someone subscribes
// or cancels. This file reads it and makes them a member (or not). Members get refreshes
// (7-money/plans.config.js); everyone else sees "subscribe to start" and costs nothing.
// Needs STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_CHECKOUT_URL in .env.
// A free trial, if Tanner wants one, is set on the Stripe price (trialDays in plans.config.js).
import { getUser, saveUser } from '../3-data/store.js';
import { activity } from '../toolbox/alerts.js';

export function setPlan(userId, plan) {
  const u = getUser(userId);
  activity('plan-change', { user: userId, from: u.plan || 'none', to: plan });
  u.plan = plan;
  saveUser(u);
  return u;
}

export async function handleStripeWebhook(/* rawBody, signatureHeader */) {
  activity('stripe-event', { handled: false, note: 'Stripe not set up yet' });
  // TODO when Stripe is set up:
  // 1. verify the signature with STRIPE_WEBHOOK_SECRET
  // 2. checkout.session.completed or customer.subscription.created -> setPlan(userId, 'member')
  // 3. customer.subscription.deleted or invoice.payment_failed (final) -> setPlan(userId, 'none')
  return { status: 501, body: 'Stripe is not set up yet.' };
}
