// Quick self-test that needs no internet and no Apify account:
// converts a made-up Depop item, checks it against the listing rules, and makes sure
// the app builds. Run with: npm run check
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './env.js';
import { toListing } from '../1-sources/depop/map.js';
import { problems } from '../3-data/validate.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failed++; };

const fakeDepop = { title: 'Test jacket', url: 'https://www.depop.com/products/test-seller-test-jacket-1a2b/', mainPicture: 'https://example.com/a.jpg',
  price: { priceAmount: '35.00', currencyName: 'USD' }, sizes: ['M'], brandName: 'Levi\'s', sellerReviewsRating: 4.8, sellerReviewsTotal: 52, sellerUsername: 'should-be-dropped' };
const l = toListing(fakeDepop);
ok(l && l.id === 'depop:test-seller-test-jacket-1a2b', 'Depop item gets a RACKD id');
ok(l && l.price === 35 && l.size === 'M' && l.brand === "Levi's", 'price, size and brand are read');
ok(l && !('sellerUsername' in l), 'seller username is dropped');
ok(l && problems(l).length === 0, 'converted item passes the listing rules');
ok(toListing({ title: 'no photo', url: fakeDepop.url, price: 5 }) === null, 'items without a photo are skipped');
ok(toListing({ ...fakeDepop, sold: true }).status === 'sold', 'sold items are marked sold');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rackd-check-'));
const env = { ...process.env, RACKD_DATA_DIR: tmp };
try {
  execFileSync(process.execPath, [path.join(ROOT, '3-data', 'load-sample.js')], { env, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(ROOT, '5-app', 'build-app.js')], { env, stdio: 'pipe' });
  const html = fs.readFileSync(path.join(ROOT, '5-app', 'dist', 'rackd.html'), 'utf8');
  ok(html.includes('EXAMPLE ONLY') && !html.includes('__DATA__'), 'the app builds from stored listings');
  ok(!/poshmark/i.test(html), 'no Poshmark data in the app');
} catch (e) { ok(false, 'app build: ' + (e.stderr || e.message)); }
fs.rmSync(tmp, { recursive: true, force: true });

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
