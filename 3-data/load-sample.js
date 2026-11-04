// Fills your local listings file with 3 obviously fake example items, so you can
// open the app before any real listings exist. Real listings are never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../toolbox/env.js';
import { loadListings, addNew } from './store.js';

const real = loadListings().filter(l => l.source !== 'manual');
if (real.length) {
  console.log(`You already have ${real.length} real listings, so the examples were not added.`);
} else {
  const sample = JSON.parse(fs.readFileSync(path.join(ROOT, '3-data', 'sample', 'example-listings.json'), 'utf8'));
  const added = addNew(sample);
  console.log(`Added ${added.length} example listings (they say EXAMPLE ONLY in the title).`);
}
