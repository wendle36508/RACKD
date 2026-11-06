// Floor 2: "refresh on open".
// Each time a user opens the app (and every 30 minutes while it stays open), RACKD scrapes
// new listings picked for THEIR style, unless:
//   - it already scraped for them less than 30 minutes ago (cooldown), or
//   - they aren't a member (RACKD is members-only: no subscription, no scraping), or
//   - they've had all of today's refreshes (200 listings each, see 7-money/plans.config.js), or
//   - this month's Apify budget is used up (spend guard).
// While the scrape runs (it takes a minute or two), the app shows their stored matches.
import { logger } from '../toolbox/env.js';
import { enabledSources, splitCount } from '../1-sources/index.js';
import { getUser, saveUser, loadListings, upsertFound, loadFingerprints } from '../3-data/store.js';
import { problems } from '../3-data/validate.js';
import { profileOf, searchFor } from '../4-algorithm/taste.js';
import { planFor } from '../7-money/plans.config.js';
import { FRESHNESS } from './freshness.config.js';
import { activity, alert } from '../toolbox/alerts.js';

const log = logger('on-open');
// A "day" for the refresh limit runs midnight to midnight in this time zone (US Eastern).
const today = now => now.toLocaleDateString('en-CA', { timeZone: FRESHNESS.dayTimeZone });

/** Should we scrape for this user right now, and how many? (No side effects.) */
export function scrapeDecision(user, now = new Date()) {
  const plan = planFor(user);
  const isToday = user.day?.date === today(now);
  const used = isToday ? user.day.count : 0;
  if (!plan) return { ok: false, reason: 'not-member', usedToday: used };
  const refreshes = isToday ? (user.day.refreshes || 0) : 0;
  if (user.lastScrapeAt) {
    const next = new Date(new Date(user.lastScrapeAt).getTime() + FRESHNESS.cooldownMinutes * 60e3);
    if (now < next) return { ok: false, reason: 'cooldown', nextAt: next.toISOString(), usedToday: used };
  }
  if (refreshes >= plan.refreshesPerDay) return { ok: false, reason: 'daily-limit', usedToday: used };
  return { ok: true, count: plan.perRefresh, usedToday: used };
}

const running = new Set();

/** Runs the scrape for one user. Returns { scraped, added, reason }. */
export async function refreshForUser(userId, now = new Date()) {
  if (running.has(userId)) return { scraped: 0, added: 0, reason: 'already-running' };
  const user = getUser(userId);
  const d = scrapeDecision(user, now);
  if (!d.ok) {
    activity('refresh-skipped', { user: userId, reason: d.reason, nextAt: d.nextAt || null });
    return { scraped: 0, added: 0, reason: d.reason, nextAt: d.nextAt };
  }

  running.add(userId);
  user.lastScrapeAt = now.toISOString();       // set first, so a second open can't start another
  if (user.day?.date !== today(now)) user.day = { date: today(now), count: 0, refreshes: 0 };
  user.day.refreshes = (user.day.refreshes || 0) + 1;
  const rotation = user.searchCursor || 0;     // each refresh searches a different slice of their style
  user.searchCursor = rotation + 1;
  user.lastRefresh = { at: now.toISOString(), ids: [] };   // what this refresh finds goes to the front
  saveUser(user);

  let scraped = 0, added = 0, repeats = 0, reason = 'done';
  const errors = [];
  activity('refresh-start', { user: userId, plan: user.plan || 'none', asked: d.count, refreshToday: user.day.refreshes });
  try {
    const listings = loadListings();
    const P = profileOf(user, new Map(listings.map(l => [l.id, l])), loadFingerprints());
    const search = searchFor(P, rotation);
    for (const [src, n] of splitCount(d.count, enabledSources())) {
      try {
        const found = await src.search(search, n, `${src.name} for ${userId}`);
        scraped += found.length;
        const good = found.filter(l => !problems(l).length);
        const r = upsertFound(good, userId);
        added += r.added;
        const u = getUser(userId);
        const seen = new Set([...u.liked, ...u.passed, ...(u.shown || [])]);
        repeats += r.ids.filter(id => seen.has(id)).length;      // already seen by them, so hidden
        u.lastRefresh = { at: u.lastRefresh?.at || now.toISOString(), ids: [...(u.lastRefresh?.ids || []), ...r.ids] };
        saveUser(u);
      } catch (e) {
        log(`${src.name} for ${userId}: ${e.message}`);
        if (e.code === 'BUDGET') { reason = 'budget'; break; }
        reason = 'source-error';
        errors.push(`${src.name}: ${e.message}`);
      }
    }
    const u = getUser(userId);
    u.day.count += scraped;                    // listings paid for today, shown in /api/status
    saveUser(u);
    log(`${userId}: asked ${d.count} (${search.personal ? 'personal: ' : 'starter: '}${search.queries.join(', ')}), got ${scraped}, ${added} new to RACKD, ${repeats} they'd already seen.`);
    activity('refresh-done', { user: userId, asked: d.count, scraped, added, repeats, reason, searches: search.queries, errors });
    if (errors.length) alert('A scrape failed', `Refresh for user ${userId}:\n${errors.join('\n')}`);
  } catch (e) {
    activity('refresh-done', { user: userId, asked: d.count, scraped, added, reason: 'crash', errors: [e.message] });
    alert('A refresh crashed', `User ${userId}: ${e.message}`);
    reason = 'crash';
  } finally {
    running.delete(userId);
  }
  return { scraped, added, reason };
}

export const isRunning = userId => running.has(userId);

/** When this user's next refresh can happen (for the app's "all caught up" message). */
export function nextRefresh(user, now = new Date()) {
  const d = scrapeDecision(user, now);
  if (d.ok) return { now: true };
  if (d.reason === 'not-member') return { subscribe: true };
  if (d.reason === 'daily-limit') return { tomorrow: true };
  const refreshesToday = user.day?.date === today(now) ? user.day.refreshes || 0 : 0;
  if (refreshesToday >= planFor(user).refreshesPerDay) return { tomorrow: true };
  return { at: d.nextAt };
}
