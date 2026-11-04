// The plans a user can be on, and how many NEW listings RACKD scrapes for them.
// Each user gets a few refreshes a day (one per app open, at least an hour apart).
// Change the numbers here and everything else follows.
export const PLANS = {
  free: {
    refreshesPerDay: 2,
    perRefresh: 50,         // 2 x 50 = 100 new listings a day
    priceUsdPerMonth: 0,
  },
  premium: {
    refreshesPerDay: 2,
    perRefresh: 150,        // 2 x 150 = 300 new listings a day
    priceUsdPerMonth: null, // decide later. Stripe sets a user to premium (7-money/stripe.js)
  },
};

export function planFor(user) {
  const p = PLANS[user?.plan] || PLANS.free;
  return { ...p, dailyCap: p.refreshesPerDay * p.perRefresh };
}
