// PLACEHOLDER: Stripe subscription for the premium plan.
// When it's built: Stripe sends RACKD a message (a "webhook") whenever someone starts or
// cancels a subscription. This file reads that message and flips the user's plan, which
// automatically raises their daily scrape cap (7-money/plans.config.js).
// Needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env, and a Stripe checkout link.
import { getUser, saveUser } from '../3-data/store.js';
import { activity } from '../toolbox/alerts.js';

export function setPlan(userId, plan) {
  const u = getUser(userId);
  activity('plan-change', { user: userId, from: u.plan || 'free', to: plan });
  u.plan = plan;
  saveUser(u);
  return u;
}

export async function handleStripeWebhook(/* rawBody, signatureHeader */) {
  activity('stripe-event', { handled: false, note: 'Stripe not set up yet' });
  // TODO when Stripe is set up:
  // 1. verify the signature with STRIPE_WEBHOOK_SECRET
  // 2. checkout.session.completed or customer.subscription.created -> setPlan(userId, 'premium')
  // 3. customer.subscription.deleted -> setPlan(userId, 'free')
  return { status: 501, body: 'Stripe is not set up yet.' };
}
