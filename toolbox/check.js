// Self-test that needs no internet and no Apify account (Apify is faked).
// Checks the rules Tanner set: refresh on open at most once an hour, 2 refreshes a day
// (150 each), members-only, the budget guard, light sharing, sold checks, and
// that the app builds. Run with: npm run check
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rackd-check-'));
process.env.RACKD_DATA_DIR = tmp;          // test data and logs go in a throwaway folder
process.env.RACKD_LOG_DIR = path.join(tmp, 'logs');
delete process.env.RESEND_API_KEY;         // never send real alert emails from a test
process.env.APIFY_TOKEN = 'fake-token-for-test';
process.env.SOURCES = 'vinted,depop,ebay';
process.env.VINTED_ACTOR_ID = 'test~vinted';
process.env.EBAY_ACTOR_ID = 'test~ebay';

// Fake Apify: returns made-up listings and counts what was asked for.
const asked = [];
let n = 0;
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body); asked.push({ url: String(url), body });
  let items;
  if (String(url).includes('ebay')) {
    items = body.startUrls ? body.startUrls.map(({ url }) => ({ url, title: 'e', image: 'https://e.com/e.jpg', price: '30' }))
      : Array.from({ length: body.maxItems }, () => { n++; return { url: `https://www.ebay.com/itm/${100000000 + n}`, title: 'eBay ' + n, image: 'https://e.com/e.jpg', price: { value: '25.00' }, brand: 'Levis', size: 'M' }; });
  } else if (String(url).includes('vinted')) {
    items = body.startUrls ? body.startUrls.map(({ url }) => ({ id: url.split('/').pop(), url, title: 'v', photo: { url: 'https://e.com/v.jpg' }, price: '20' }))
      : Array.from({ length: body.maxItems }, () => { n++; return { id: n, url: `https://www.vinted.com/items/${n}`, title: 'Vinted ' + n, photo: { url: 'https://e.com/v.jpg' }, price: '18.00', brand_title: 'Levis', size_title: 'M' }; });
  } else {
    // shaped like piotrv1001/depop-listings-scraper output
    items = Array.from({ length: body.maxItems }, () => { n++; return { id: String(n), slug: `item-${n}`, url: `https://www.depop.com/products/item-${n}/`, description: `Levis vintage jacket ${n}\n#levis #vintage`, price: 30, originalPrice: 30, currency: 'USD', brand: 'Levis', condition: 'used_good', categoryName: 'Jackets', sizes: ['M'], status: 'STATUS_ONSALE', images: ['https://e.com/d.jpg'] }; });
  }
  return { ok: true, json: async () => items, text: async () => '' };
};

const { ROOT } = await import('./env.js');
// The test uses its own settings, whatever is in your .env (which env.js just loaded):
// test mode off, the normal $330 budget, all three sites, no real keys.
Object.assign(process.env, { SOURCES: 'vinted,depop,ebay', MONTHLY_BUDGET_USD: '330', PROXY_USD_PER_1000: '0', APIFY_TOKEN: 'fake-token-for-test',
  DEPOP_ACTOR_ID: 'test~depop', VINTED_ACTOR_ID: 'test~vinted', EBAY_ACTOR_ID: 'test~ebay' });
for (const k of ['TEST_MODE_EVERYONE_IS_MEMBER', 'STRIPE_CHECKOUT_URL', 'EBAY_CAMPAIGN_ID', 'RESEND_API_KEY', 'ALERT_EMAIL_TO']) delete process.env[k];
const { toListing } = await import('../1-sources/depop/map.js');
const { splitCount, enabledSources } = await import('../1-sources/index.js');
const { problems } = await import('../3-data/validate.js');
const store = await import('../3-data/store.js');
const { scrapeDecision, refreshForUser, nextRefresh } = await import('../2-freshness/on-open.js');
const { checkStale } = await import('../2-freshness/check-before-show.js');
const { deckFor } = await import('../4-algorithm/deck.js');
const { profileOf, searchFor } = await import('../4-algorithm/taste.js');
const { allow, record, spentThisMonth } = await import('../7-money/spend-guard.js');
const { setPlan } = await import('../7-money/stripe.js');

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failed++; };

// Floor 1: turning a raw Depop item into a RACKD listing
const raw = { id: '960104883', slug: 'test-jacket-1a2b', url: 'https://www.depop.com/products/test-jacket-1a2b/', description: "Levi's trucker jacket, barely worn #levis #y2k\nSize M",
  price: 35, originalPrice: 50, currency: 'USD', brand: "Levi's", condition: 'used_excellent', categoryName: 'Jackets', sizes: ['M'], status: 'STATUS_ONSALE',
  images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'], location: 'Boston, MA', sellerUsername: 'should-be-dropped' };
const l = toListing(raw);
ok(l && l.id === 'depop:test-jacket-1a2b' && l.price === 35 && l.originalPrice === 50 && l.size === 'M' && l.title === "Levi's trucker jacket, barely worn" && l.condition === 'Excellent' && l.photoUrls.length === 2, 'Depop item from your scraper is converted (id, title, price, markdown, size, condition, photos)');
const { searchInput } = await import('../1-sources/depop/depop.config.js');
const di = searchInput({ queries: ['levis'], brands: ['Not A Depop Brand'], minPrice: 9.5, maxPrice: 40.2 }, 45);
ok(di.searchQueries[0] === 'levis' && di.maxItems === 45 && di.priceMin === 9 && di.priceMax === 41 && !('brands' in di), 'Depop search uses your scraper\'s fields, and never sends a brand filter that could stop the run');
ok(l && !('sellerUsername' in l) && !JSON.stringify(l).includes('Boston') && problems(l).length === 0, 'seller details dropped, listing passes the rules');
ok(toListing({ title: 'no photo', url: raw.url, price: 5 }) === null, 'items without a photo are skipped');
ok(JSON.stringify(splitCount(50, enabledSources()).map(([s, c]) => [s.name, c])) === '[["vinted",25],["depop",15],["ebay",10]]', 'a 50-listing refresh is split 25 Vinted / 15 Depop / 10 eBay (50/30/20)');

// Members-only
const t0 = new Date('2026-11-05T15:00:00Z');
let r = await refreshForUser('nina', t0);
ok(r.scraped === 0 && r.reason === 'not-member', 'someone who has not subscribed gets no scraping (costs nothing)');
ok(nextRefresh(store.getUser('nina'), t0).subscribe === true, '...and the app shows them "become a member"');
process.env.TEST_MODE_EVERYONE_IS_MEMBER = 'true';
ok(scrapeDecision(store.getUser('nina'), t0).ok, 'test mode lets everyone in (for trying it before Stripe exists)');
delete process.env.TEST_MODE_EVERYONE_IS_MEMBER;
const { MEMBER_PLAN } = await import('../7-money/plans.config.js');
ok(MEMBER_PLAN.priceUsdPerMonth === 9.99 && MEMBER_PLAN.refreshesPerDay === 2 && MEMBER_PLAN.perRefresh === 150, 'the plan is $9.99 a month for 2 refreshes of 150 a day');
const { SUBSCRIPTION } = await import('../7-money/plans.config.js');
ok(SUBSCRIPTION.trialDays === 3, 'there is a 3-day free trial (card required; Stripe charges $9.99 when it ends)');

// Floor 2: refresh on open
setPlan('alice', 'member');
r = await refreshForUser('alice', t0);
ok(r.scraped === 150, 'member: first open scrapes 150');
ok(scrapeDecision(store.getUser('alice'), new Date(t0.getTime() + 30 * 60e3)).reason === 'cooldown', 'opening again within the hour does not scrape');
ok(nextRefresh(store.getUser('alice'), new Date(t0.getTime() + 30 * 60e3)).at === new Date(t0.getTime() + 60 * 60e3).toISOString(), 'the app can tell them when their next refresh is');
r = await refreshForUser('alice', new Date(t0.getTime() + 61 * 60e3));
ok(r.scraped === 150, 'after an hour, the second refresh scrapes 150');
ok(scrapeDecision(store.getUser('alice'), new Date(t0.getTime() + 3 * 3600e3)).reason === 'daily-limit', 'a third refresh the same day is refused (300 a day)');
ok(nextRefresh(store.getUser('alice'), new Date(t0.getTime() + 3 * 3600e3)).tomorrow === true, '...and the app says "new finds tomorrow"');
ok(scrapeDecision(store.getUser('alice'), new Date('2026-11-06T15:00:00Z')).ok, 'next day, refreshes are back');
setPlan('bob', 'member');
r = await refreshForUser('bob', t0);
ok(r.scraped === 150 && JSON.stringify(asked.slice(-3).map(a => a.body.maxListings ?? a.body.maxItems)) === '[75,45,30]', 'each refresh of 150 is split 75 Vinted / 45 Depop / 30 eBay');
ok(asked.some(a => a.body.proxyConfiguration?.apifyProxyGroups?.[0] === 'RESIDENTIAL'), 'every scrape uses the Residential proxy');

// Floor 4: style-based searches and light sharing
const all = store.loadListings();
const byId = new Map(all.map(x => [x.id, x]));
const carol = { id: 'carol', liked: all.filter(x => x.scrapedFor === 'alice').slice(0, 4).map(x => x.id), passed: [] };
const s = searchFor(profileOf(carol, byId));
ok(s.personal && s.queries.includes('levis') && s.size === 'M', 'searches are built from what the user liked (brand, size)');
const deck = deckFor(carol, all, { items: {} }, { limit: 50 }).items;
ok(deck.length > 0 && deck.filter(x => x.scrapedFor !== 'carol').length <= Math.floor(50 * 0.2), 'other people\'s finds are at most 20% of a deck, and only strong matches');
const dave = { id: 'dave', liked: [], passed: [] };
ok(deckFor(dave, all, { items: {} }).items.every(x => !x.scrapedFor || x.scrapedFor === 'dave'), 'a brand-new user gets no shared listings');

// Never the same card twice
const alice = store.getUser('alice');
ok(alice.lastRefresh.ids.length === 150, 'a refresh remembers its own finds, so the app can put them first');
const top = deckFor(alice, store.loadListings(), { items: {} }).items[0];
store.markShown('alice', [top.id]);
ok(!deckFor(store.getUser('alice'), store.loadListings(), { items: {} }).items.some(x => x.id === top.id), 'a card someone was shown never comes back, even if they didn\'t swipe it');
const bobsFind = store.loadListings().find(x => x.scrapedFor === 'bob');
store.upsertFound([bobsFind], 'frank');
ok(deckFor(store.getUser('frank'), store.loadListings(), { items: {} }).items.some(x => x.id === bobsFind.id), 'a listing someone else found first still counts as yours when your refresh finds it');
const P = profileOf({ liked: [], passed: [] }, byId);
ok(searchFor(P, 0).queries.join() !== searchFor(P, 1).queries.join(), 'each refresh searches for something a bit different, so fewer repeats come back');
const ebayItem = store.loadListings().find(x => x.source === 'ebay');
const { buyLink } = await import('../7-money/affiliate.js');
process.env.EBAY_CAMPAIGN_ID = '5338000000';
ok(ebayItem && buyLink(ebayItem).includes('campid=5338000000'), 'eBay listings are scraped and their Buy links carry your eBay affiliate id');
delete process.env.EBAY_CAMPAIGN_ID;

// Floor 2: sold check before showing
const stale = all.filter(x => x.source === 'ebay').slice(0, 3).map(x => ({ ...x, lastCheckedAt: '2026-01-01T00:00:00Z' }));
store.updateListings(stale);
const callsBefore = asked.length;
await checkStale(stale);
ok(asked.length === callsBefore + 1 && store.loadListings().find(x => x.id === stale[0].id).lastCheckedAt > '2026-01-01', 'a stale listing is re-checked with the scraper before it is shown');
const staleDepop = all.filter(x => x.source === 'depop').slice(0, 2).map(x => ({ ...x, lastCheckedAt: '2026-01-01T00:00:00Z' }));
store.updateListings(staleDepop);
const calls2 = asked.length;
await checkStale(staleDepop);
const { isFresh } = await import('../2-freshness/check-before-show.js');
ok(asked.length === calls2 && !isFresh(store.loadListings().find(x => x.id === staleDepop[0].id)), 'Depop listings older than 24 hours cost nothing to check: they just stay hidden unless a refresh finds them again');

// Floor 7: spend guard
const { runPaid } = await import('../1-sources/apify/apify.js');
const realFetch = globalThis.fetch;
const before = spentThisMonth();
globalThis.fetch = async () => { const e = new Error('The operation timed out'); e.name = 'TimeoutError'; throw e; };
try { await runPaid('vinted', 'test~vinted', {}, 100, 'test: a run that times out'); } catch {}
ok(Math.abs(spentThisMonth() - before - 0.1) < 1e-6, 'a run that times out is counted at the most it could cost (Apify may still have charged)');
const before2 = spentThisMonth();
globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'bad token' });
try { await runPaid('vinted', 'test~vinted', {}, 100, 'test: a refused run'); } catch {}
ok(spentThisMonth() === before2, 'a run Apify refuses outright (wrong token) costs nothing and is not counted');
globalThis.fetch = realFetch;
const spent = spentThisMonth();
ok(spent > 0, `Apify spend is recorded ($${spent.toFixed(2)} in this test)`);
record(330, 'test: pretend the budget is used up');
let blocked = false; try { allow(0.01, 'test'); } catch (e) { blocked = e.code === 'BUDGET'; }
ok(blocked, 'once the $330 budget is reached, scraping stops');
setPlan('erin', 'member');
r = await refreshForUser('erin', t0);
ok(r.reason === 'budget' && r.scraped === 0, 'a user who opens the app after that gets no new scrape (stored matches only)');

// Safety rails
const ev = store.readActivity();
const types = t => ev.filter(e => e.type === t);
ok(types('refresh-start').length === 4 && types('refresh-done').length === 4, 'every refresh is in the activity log (start and finish)');
ok(types('refresh-skipped').some(e => e.reason === 'budget') || types('budget-block').length > 0, 'a refresh blocked by the budget is logged');
ok(types('plan-change').some(e => e.user === 'bob' && e.to === 'member'), 'plan changes are logged');
ok(types('spend').length > 0 && types('sold-check').length === 1, 'spending and sold checks are logged');
const alerts = types('alert').map(e => e.subject);
ok(alerts.some(s => s.startsWith('50%')) && alerts.some(s => s.startsWith('80%')) && alerts.some(s => s.startsWith('Budget reached')), 'alerts fire at 50%, 80% and 100% of the budget');
ok(alerts.filter(s => s.startsWith('80%')).length === 1, 'each budget alert fires only once a month');
const { summarize } = await import('./daily-summary.js');
const sum = summarize(new Date().toISOString().slice(0, 10));
ok(/Refreshes run: \d+/.test(sum) && /Problems: \d+/.test(sum), 'the daily summary is written');
const { health } = await import('./health.js');
const h = health();
ok(['1-sources', '2-freshness', '3-data', '4-algorithm', '5-app', '6-hosting', '7-money', 'toolbox'].every(k => h[k]?.light), 'every floor has a health light');
ok(h['7-money'].light === 'red', 'the money floor goes red when the budget is used up');

// Floor 5: the app builds
try {
  execFileSync(process.execPath, [path.join(ROOT, '3-data', 'load-sample.js')], { env: process.env, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, '5-app', 'build-app.js')], { env: process.env, stdio: 'pipe' });
  const html = fs.readFileSync(path.join(ROOT, '5-app', 'dist', 'rackd.html'), 'utf8');
  ok(!html.includes('__DATA__') && !html.includes('__LIVE__'), 'the app builds');
  ok(!/poshmark/i.test(html), 'no Poshmark data in the app');
} catch (e) { ok(false, 'app build: ' + (e.stderr || e.message)); }

// Floor 6: the public demo site builds, with its title, headline, sign-up form and pages
try {
  execFileSync(process.execPath, [path.join(ROOT, '6-hosting', 'demo', 'build-demo.js')], { env: { ...process.env, RESEND_API_KEY: '' }, stdio: 'pipe' });
  const dist = path.join(ROOT, '6-hosting', 'demo', 'dist');
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  ok(/<title>RACKD - [^<]+<\/title>/.test(html) && /<h1>/.test(html) && html.includes('og:image') && html.includes('application/ld+json') && html.includes('class="signup"'), 'the demo site has a real title, headline, preview tags and sign-up form');
  ok(['about/index.html', 'changelog/index.html', 'robots.txt', 'sitemap.xml', 'og.png'].every(f => fs.existsSync(path.join(dist, f))), 'the demo site has /about, /changelog, robots.txt, sitemap.xml and its preview image');
  ok(!/__(TITLE|HEAD|TOP|BOTTOM|DATA|FOOT)__/.test(html) && !/poshmark/i.test(html), 'the demo site has no leftover placeholders or Poshmark data');
} catch (e) { ok(false, 'demo site build: ' + (e.stderr || e.message)); }

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
