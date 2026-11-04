// How often RACKD looks for new items and checks old ones. Change the numbers here.
export const SCHEDULE = {
  newListingsPerHour: 20,     // every hour: add up to 20 brand-new listings
  overFetch: 5,               // ask for a few extra, since some will be repeats we already have
  dailyRecheckCount: 500,     // once a day: re-check the 500 listings checked longest ago
  dailyRecheckHour: 4,        // 4am, when nobody is swiping
  missesBeforeRemoved: 2,     // a listing that can't be found 2 checks in a row is taken down
  keepSoldDays: 30,           // sold items stay in storage (hidden) this long, for the style AI, then are deleted
};
