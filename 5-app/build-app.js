// Floor 5, offline version: builds one app file (5-app/dist/rackd.html) from whatever is in
// storage, for trying the app or showing it without a server. The real app runs through
// 5-app/server.js, which refreshes listings each time someone opens it.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, logger } from '../toolbox/env.js';
import { activeListings, loadFingerprints } from '../3-data/store.js';
import { renderApp, toCard } from './app-data.js';

const log = logger('build-app');
const listings = activeListings();
if (!listings.length) { log('No active listings yet. Run "npm run demo" for examples.'); process.exit(1); }

const sources = [...new Set(listings.map(l => toCard(l).src))].join(', ');
const foot = `${listings.length} listings from ${sources}, updated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Buying happens on the seller's site.`;
const out = path.join(ROOT, '5-app', 'dist', 'rackd.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, renderApp({ listings, fp: loadFingerprints(), foot }));
log(`Built ${out}: ${listings.length} listings.`);
