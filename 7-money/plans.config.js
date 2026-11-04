// RACKD is members-only (Tanner, 4 Nov 2026): there is no free version.
// Every member gets the same plan. Change the numbers here and everything else follows.
export const MEMBER_PLAN = {
  refreshesPerDay: 2,
  perRefresh: 150,          // 2 x 150 = up to 300 new listings a day per member
  priceUsdPerMonth: 9.99,   // Tanner, 4 Nov 2026. Set the same price on the Stripe product
};

export const SUBSCRIPTION = {
  // Tanner, 4 Nov 2026: a very short free trial. Card required at sign-up; Stripe charges
  // $9.99 automatically when the trial ends. Trial users get the normal member limits.
  // Set the same number of days on the Stripe price (Stripe's built-in trial).
  trialDays: 3,
  // Where the "Subscribe" button goes: your Stripe payment link (put it in .env when Stripe exists)
  checkoutUrl: () => (process.env.STRIPE_CHECKOUT_URL || '').trim(),
  // TEST MODE, for trying RACKD on your laptop before Stripe exists: everyone counts as a
  // member. Must be off before real users arrive (the health check shows it as amber).
  testModeEveryoneIsMember: () => /^(1|true|yes)$/i.test((process.env.TEST_MODE_EVERYONE_IS_MEMBER || '').trim()),
};

export const isMember = user => SUBSCRIPTION.testModeEveryoneIsMember() || ['member', 'premium'].includes(user?.plan);

/** The member plan for members; null for anyone who hasn't subscribed (they get no scraping). */
export function planFor(user) {
  if (!isMember(user)) return null;
  return { ...MEMBER_PLAN, dailyCap: MEMBER_PLAN.refreshesPerDay * MEMBER_PLAN.perRefresh };
}
