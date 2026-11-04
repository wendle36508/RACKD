// Floor 4: picks which stored listings a user should see next, best match first.
// Their own scrapes come first; other people's scrapes are only mixed in if they are a
// strong match for this user's style (see SHARING in taste.config.js).
// A card they've been shown before (swiped or not) is never picked again.
import { profileOf, match } from './taste.js';
import { SHARING } from './taste.config.js';

export function deckFor(user, listings, fingerprints, { limit = 200, freshOnly = null } = {}) {
  const byId = new Map(listings.map(l => [l.id, l]));
  const P = profileOf(user, byId, fingerprints);
  // Never the same card twice: anything they swiped OR just had on screen is left out.
  const seen = new Set([...user.liked, ...user.passed, ...(user.shown || [])]);
  const ok = l => l.status === 'active' && !seen.has(l.id) && (!freshOnly || freshOnly(l));

  const own = [], shared = [];
  for (const l of listings) {
    if (!ok(l)) continue;
    const m = match(l, P, fingerprints);
    const theirs = !l.scrapedFor || l.scrapedFor === user.id || (l.foundFor || []).includes(user.id);
    if (theirs) own.push({ l, m });
    else if (P.likes >= SHARING.needLikes && m >= SHARING.minMatch) shared.push({ l, m });
  }
  const byBest = (a, b) => b.m - a.m || b.l.firstSeenAt.localeCompare(a.l.firstSeenAt);
  own.sort(byBest); shared.sort(byBest);

  const maxShared = Math.floor(Math.min(limit, own.length + shared.length) * SHARING.maxSharedFraction);
  const picked = [...own.slice(0, limit - Math.min(maxShared, shared.length)), ...shared.slice(0, maxShared)];
  return { profile: P, items: picked.sort(byBest).slice(0, limit).map(x => x.l) };
}
