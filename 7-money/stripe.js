// PLACEHOLDER: the Stripe subscription. RACKD is members-only, so this is the door in.
// When it's built: Stripe sends RACKD a message (a "webhook") whenever someone subscribes
// or cancels. This file reads it and makes them a member (or not). Members get refreshes
// (7-money/plans.config.js); everyone else sees "subscribe to start" and costs nothing.
// Needs STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_CHECKOUT_URL in .env.
// Free trial (Tanner, 4 Nov 2026): 3 days, using Stripe's built-in trial. A card is required at
// sign-up; Stripe charges $9.99 automatically when the trial ends. Someone on the trial
// (Stripe status "trialing") is a member with the normal limits. If the first charge fails
// or they cancel during the trial, they go back to 'none' and get no more scraping.
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
  // 2. checkout.session.completed or customer.subscription.created/updated with status
  //    'trialing' or 'active' -> setPlan(userId, 'member')  (Checkout: payment_method_collection
  //    'always' and subscription_data.trial_period_days = SUBSCRIPTION.trialDays, so a card is required)
  // 3. customer.subscription.deleted, or status 'past_due'/'unpaid'/'canceled' (e.g. the charge at
  //    the end of the trial failed) -> setPlan(userId, 'none')
  return { status: 501, body: 'Stripe is not set up yet.' };
}
