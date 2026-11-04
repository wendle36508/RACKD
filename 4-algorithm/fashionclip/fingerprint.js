// Floor 4: RACKD style AI.
// FashionCLIP (a free AI trained on fashion photos) "looks at" each listing photo and
// turns it into 512 numbers, a style fingerprint. Items that look alike get similar
// fingerprints, so the app can learn someone's taste from the photos themselves.
// Only listings without a fingerprint yet are processed, so hourly runs are quick.
// Photos are read into memory only. Nothing is saved or re-posted.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../toolbox/env.js';
import { activeListings, loadFingerprints, saveFingerprints } from '../../3-data/store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const log = logger('style-ai');
const test = process.argv.includes('--test');

const MODELS = ['patrickjohncyh/fashion-clip', 'ff13/fashion-clip'];
// Words the app uses to describe someone's style. FashionCLIP scores how well each fits.
const VIBES = ['boho','minimalist','streetwear','athleisure','preppy','90s vintage','y2k','gorpcore outdoor','cottagecore','grunge',
  'classic luxury','sporty','romantic feminine','edgy','cozy knitwear','western','coastal','workwear','festival','old money'];
const COLORS = ['black','white','cream and beige','earth tones','pastel','bright colors','denim blue','pink','green','red','gray','brown','floral print','neutral'];
const SCALE = 0.25 / 127;

function normalize(v) { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Array.from(v, x => x / n); }
// Packs each fingerprint into a short text code (8-bit numbers) so files stay small.
function pack(v) { const b = Buffer.alloc(v.length); v.forEach((x, i) => b.writeInt8(Math.max(-127, Math.min(127, Math.round(x / SCALE))), i)); return b.toString('base64'); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const fp = loadFingerprints();
const todo = activeListings().filter(l => !fp.items[l.id] && l.source !== 'manual');
if (!todo.length && fp.vibes) { log('Every active listing already has a fingerprint. Nothing to do.'); process.exit(0); }

const T = await import('@huggingface/transformers').catch(() => null);
if (!T) { log('The AI add-on is not installed yet. Run "npm install" (or RACKD.bat option 1) first.'); process.exit(1); }
T.env.cacheDir = path.join(here, 'model-cache');

async function load() {
  for (const m of MODELS) {
    try {
      log('Loading FashionCLIP (' + m + '). The first time downloads about 600 MB...');
      const r = { m,
        processor: await T.AutoProcessor.from_pretrained(m),
        tokenizer: await T.AutoTokenizer.from_pretrained(m),
        vision: await T.CLIPVisionModelWithProjection.from_pretrained(m),
        text: await T.CLIPTextModelWithProjection.from_pretrained(m) };
      log('Model ready: ' + m);
      return r;
    } catch (e) { log('Could not load ' + m + ': ' + e.message); }
  }
  throw new Error('FashionCLIP could not be downloaded. Check the internet connection and try again.');
}

try {
  const { m, processor, tokenizer, vision, text } = await load();
  if (!fp.vibes || fp.model !== m) {
    const textVec = async labels => {
      const inputs = tokenizer(labels.map(l => 'a photo of ' + l + ' clothing'), { padding: true, truncation: true });
      const { text_embeds } = await text(inputs);
      const d = text_embeds.dims[1], arr = text_embeds.data;
      return Object.fromEntries(labels.map((l, i) => [l, pack(normalize(arr.slice(i * d, (i + 1) * d)))]));
    };
    fp.vibes = await textVec(VIBES); fp.colors = await textVec(COLORS);
    fp.model = m; fp.scale = SCALE;
  }
  const n = test ? Math.min(3, todo.length) : todo.length;
  let ok = 0, failed = 0;
  for (let i = 0; i < n; i++) {
    try {
      const image = await T.RawImage.fromURL(todo[i].photoUrl);
      const { image_embeds } = await vision(await processor(image));
      fp.items[todo[i].id] = pack(normalize(image_embeds.data));
      ok++;
    } catch (e) { failed++; log('Photo for ' + todo[i].id + ' skipped: ' + e.message); }
    if ((i + 1) % 10 === 0 || i + 1 === n) process.stdout.write(`\r  Looked at ${i + 1} of ${n} photos`);
    if ((i + 1) % 25 === 0) saveFingerprints(fp);   // save as we go
    await sleep(300); // gentle on the photo server
  }
  console.log('');
  saveFingerprints(fp);
  log(`Done: ${ok} new fingerprints, ${failed} skipped, model ${m}.`);
  if (test && n && !ok) throw new Error('No photos could be read in the test.');
} catch (e) { log('Stopped: ' + e.message); process.exit(1); }
