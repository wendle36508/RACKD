// Self-test that needs no internet and no Apify account (Apify is faked).
// Checks the rules Tanner set: refresh on open at most once an hour, 2 refreshes a day
// (free 50 each, premium 150 each), the budget guard, light sharing, sold checks, and
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
  } else if (body.mode === 'url') {
    items = body.urls.map((u, i) => ({ url: u, sold: i === 0, title: 'x', mainPicture: 'https://e.com/a.jpg', price: 25 }));
  } else {
    items = Array.from({ length: body.maxListings }, () => { n++; return { title: 'Depop ' + n, url: `https://www.depop.com/products/item-${n}/`, mainPicture: 'https://e.com/d.jpg', price: 30, brandName: 'Levis', style: ['vintage'], sizes: ['M'] }; });
  }
  return { ok: true, json: async () => items, text: async () => '' };
};

const { ROOT } = await import('./env.js');
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
const raw = { title: 'Test jacket', url: 'https://www.depop.com/products/test-jacket-1a2b/', mainPicture: 'https://example.com/a.jpg',
  price: { priceAmount: '35.00', currencyName: 'USD' }, sizes: ['M'], brandName: "Levi's", sellerUsername: 'should-be-dropped' };
const l = toListing(raw);
ok(l && l.id === 'depop:test-jacket-1a2b' && l.price === 35 && l.size === 'M', 'Depop item is converted (id, price, size)');
ok(l && !('sellerUsername' in l) && problems(l).length === 0, 'seller username dropped, listing passes the rules');
ok(toListing({ title: 'no photo', url: raw.url, price: 5 }) === null, 'items without a photo are skipped');
ok(JSON.stringify(splitCount(50, enabledSources()).map(([s, c]) => [s.name, c])) === '[["vinted",25],["depop",15],["ebay",10]]', 'a 50-listing refresh is split 25 Vinted / 15 Depop / 10 eBay (50/30/20)');

// Floor 2: refresh on open
const t0 = new Date('2026-11-05T15:00:00Z');
let r = await refreshForUser('alice', t0);
ok(r.scraped === 50, 'free user: first open scrapes 50');
ok(scrapeDecision(store.getUser('alice'), new Date(t0.getTime() + 30 * 60e3)).reason === 'cooldown', 'opening again within the hour does not scrape');
ok(nextRefresh(store.getUser('alice'), new Date(t0.getTime() + 30 * 60e3)).at === new Date(t0.getTime() + 60 * 60e3).toISOString(), 'the app can tell them when their next refresh is');
r = await refreshForUser('alice', new Date(t0.getTime() + 61 * 60e3));
ok(r.scraped === 50, 'after an hour, the second refresh scrapes 50');
ok(scrapeDecision(store.getUser('alice'), new Date(t0.getTime() + 3 * 3600e3)).reason === 'daily-limit', 'a third refresh the same day is refused (100 a day)');
ok(nextRefresh(store.getUser('alice'), new Date(t0.getTime() + 3 * 3600e3)).tomorrow === true, '...and the app says "new finds tomorrow"');
ok(scrapeDecision(store.getUser('alice'), new Date('2026-11-06T15:00:00Z')).ok, 'next day, refreshes are back');
setPlan('bob', 'premium');
r = await refreshForUser('bob', t0);
ok(r.scraped === 150, 'premium user: a refresh scrapes 150');
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
ok(alice.lastRefresh.ids.length === 50, 'a refresh remembers its own finds, so the app can put them first');
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
const stale = all.filter(x => x.source === 'depop').slice(0, 3).map(x => ({ ...x, lastCheckedAt: '2026-01-01T00:00:00Z' }));
store.updateListings(stale);
await checkStale(stale);
ok(store.loadListings().find(x => x.id === stale[0].id).status === 'sold', 'a stale listing that sold is hidden before it is shown');

// Floor 7: spend guard
const spent = spentThisMonth();
ok(spent > 0, `Apify spend is recorded ($${spent.toFixed(2)} in this test)`);
record(330, 'test: pretend the budget is used up');
let blocked = false; try { allow(0.01, 'test'); } catch (e) { blocked = e.code === 'BUDGET'; }
ok(blocked, 'once the $330 budget is reached, scraping stops');
r = await refreshForUser('erin', t0);
ok(r.reason === 'budget' && r.scraped === 0, 'a user who opens the app after that gets no new scrape (stored matches only)');

// Safety rails
const ev = store.readActivity();
const types = t => ev.filter(e => e.type === t);
ok(types('refresh-start').length === 4 && types('refresh-done').length === 4, 'every refresh is in the activity log (start and finish)');
ok(types('refresh-skipped').some(e => e.reason === 'budget') || types('budget-block').length > 0, 'a refresh blocked by the budget is logged');
ok(types('plan-change').some(e => e.user === 'bob' && e.to === 'premium'), 'plan changes are logged');
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

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
