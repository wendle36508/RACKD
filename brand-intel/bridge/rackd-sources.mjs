// Bridge between the Python brand-intel tool and RACKD's existing listing sources (floor 1).
// Python can't run the JavaScript scrapers directly, so it calls this small file instead.
// It uses the same seams as the swipe app: source.search(...) and source.checkListings(...),
// so every Apify run still goes through runPaid (the spend guard) and the Residential proxy.
//
//   node rackd-sources.mjs search <source> "<search words>" <count> <out.json>
//   node rackd-sources.mjs check  <source> <urls.json> <out.json>
//
// Results go to <out.json> (not the screen), because the spend guard prints its own lines.
// Exit codes: 0 ok, 2 budget reached, 3 this site can't do that job, 1 anything else.
import fs from 'node:fs';
import { sourceFor } from '../../1-sources/index.js';
import { activity } from '../../toolbox/alerts.js';

const [job, sourceName, arg, a4, a5] = process.argv.slice(2);
const source = sourceFor({ source: sourceName });

function done(out, data) { fs.writeFileSync(out, JSON.stringify(data)); process.exit(0); }

try {
  if (!source) { console.error(`Unknown source "${sourceName}".`); process.exit(3); }
  if (job === 'search') {
    const count = Math.max(1, Math.floor(Number(a4)));
    const listings = await source.search({ queries: [arg] }, count, `brand-intel search: ${arg} (${sourceName})`);
    activity('brand-intel-search', { source: sourceName, query: arg, asked: count, got: listings.length });
    done(a5, listings);
  } else if (job === 'check') {
    if (typeof source.checkListings !== 'function') { console.error(`${sourceName} can't re-check single listings.`); process.exit(3); }
    const urls = JSON.parse(fs.readFileSync(arg, 'utf8'));
    const result = urls.length ? await source.checkListings(urls) : {};
    activity('brand-intel-check', { source: sourceName, checked: urls.length });
    done(a4, result);
  } else {
    console.error('Use: search <source> "<words>" <count> <out.json>  or  check <source> <urls.json> <out.json>');
    process.exit(1);
  }
} catch (e) {
  activity('brand-intel-error', { job, source: sourceName, error: e.message });
  console.error(e.message);
  process.exit(e.code === 'BUDGET' ? 2 : 1);
}
