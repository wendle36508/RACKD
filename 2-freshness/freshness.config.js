// How RACKD keeps each user's deck fresh. Change the numbers here.
// (How MANY listings each user gets is set per plan in 7-money/plans.config.js.)
export const FRESHNESS = {
  cooldownMinutes: 30,       // new listings at most once per this long, per user (Tanner, 6 Nov 2026: every 30 minutes)
  staleAfterHours: 24,       // a listing not confirmed for sale in this long is re-checked before it's shown
  checkBeforeShow: 30,       // how many of the user's next cards get that check each time they open the app
  missesBeforeRemoved: 2,    // a listing that can't be found 2 checks in a row is taken down
  keepSoldDays: 30,          // sold items stay in storage (hidden) this long, then cleanup deletes them
  dayTimeZone: 'America/New_York',   // the daily refresh limit resets at midnight here (US Eastern)
};
