// HOURLY JOB: get new listings from every switched-on source and save the new ones.
import { logger } from '../toolbox/env.js';
import { enabledSources } from '../1-sources/index.js';
import { addNew } from '../3-data/store.js';
import { problems } from '../3-data/validate.js';
import { SCHEDULE } from './schedule.config.js';

const log = logger('fetch-new');
const sources = enabledSources();
const perSource = Math.ceil(SCHEDULE.newListingsPerHour / sources.length);
let total = 0;

for (const src of sources) {
  try {
    const got = await src.fetchNew(perSource + SCHEDULE.overFetch);
    const good = got.filter(l => { const p = problems(l); if (p.length) log(`${src.name}: skipped ${l.id} (${p.join(', ')})`); return !p.length; });
    const added = addNew(good, perSource);
    total += added.length;
    log(`${src.name}: ${got.length} found, ${added.length} new saved`);
  } catch (e) {
    log(`${src.name}: stopped: ${e.message}`);
    process.exitCode = 1;
  }
}
log(`Done. ${total} new listings this hour.`);
