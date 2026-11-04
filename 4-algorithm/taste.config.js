// Settings for how RACKD reads style and shares listings between users.
export const TASTE = {
  // Until someone has this many likes, their scrapes use the starter searches below.
  likesBeforePersonal: 3,
  starterSearches: ['vintage', 'y2k', 'streetwear', 'levis', 'carhartt', 'free people'],
};

// Light sharing: a listing scraped for one user can show up for another user only if it
// is a strong match for THEIR style, and only as a small part of their deck.
export const SHARING = {
  minMatch: 0.6,             // 0 to 1. Higher = only very close matches are shared
  maxSharedFraction: 0.2,    // at most 20% of anyone's deck comes from other people's scrapes
  needLikes: 3,              // nobody gets shared listings until RACKD knows their style a bit
};
