// Floor 6: a demo version of RACKD to put online before real listings flow.
// It uses made-up placeholder items (no real listings, no Poshmark data, no scraping, costs
// nothing) and builds the demo site in 6-hosting/demo/dist/: the deck with a hero, FAQ and
// founder footer around it (words in site.config.js), plus /about and /changelog. That folder
// is what gets deployed to Vercel.
//   node 6-hosting/demo/build-demo.js
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, logger } from '../../toolbox/env.js';
import { renderApp } from '../../5-app/app-data.js';
import { alert } from '../../toolbox/alerts.js';
import { SITE } from './site.config.js';
import { TITLE, headTags, heroHTML, bottomHTML, aboutPage, changelogPage, robotsTxt, sitemapXml } from './site.js';

const log = logger('demo');

// [title, brand, category, style, size, price, original price, colour, shape, search words]
const ITEMS = [
  ['Vintage trucker denim jacket', "Levi's", 'Jackets', '90s vintage', 'M', 48, 65, '#4a6fa5', 'jacket', 'levis trucker jacket'],
  ['Carpenter work pants', 'Carhartt', 'Pants', 'workwear', '32', 38, null, '#8b6b3d', 'pants', 'carhartt carpenter pants'],
  ['Y2K baby tee, butterfly print', 'Unbranded', 'T-shirts', 'y2k', 'S', 16, 22, '#f2a7c3', 'tee', 'y2k baby tee'],
  ['Chunky cable-knit sweater', 'J.Crew', 'Sweaters', 'cozy knitwear', 'L', 29, null, '#d8c8a8', 'sweater', 'cable knit sweater'],
  ['Retro running sneakers', 'New Balance', 'Shoes', 'streetwear', '9', 55, 80, '#9aa3ad', 'shoe', 'new balance vintage sneakers'],
  ['Faded band tee', 'Hanes', 'T-shirts', 'grunge', 'L', 24, null, '#3a3a3a', 'tee', 'vintage band tee'],
  ['Corduroy button-up shirt', 'Ralph Lauren', 'Shirts', 'preppy', 'M', 32, 45, '#a0522d', 'shirt', 'ralph lauren corduroy shirt'],
  ['Pleated tennis skirt', 'Unbranded', 'Skirts', 'preppy', 'S', 18, null, '#ffffff', 'skirt', 'pleated tennis skirt'],
  ['Fleece quarter-zip pullover', 'Patagonia', 'Sweatshirts', 'outdoors', 'M', 44, 70, '#2f6f5e', 'sweater', 'patagonia fleece pullover'],
  ['Straight-leg mom jeans', "Levi's", 'Jeans', '90s vintage', '28', 35, null, '#6f8fbf', 'pants', 'levis mom jeans'],
  ['Oversized blazer', 'Zara', 'Jackets', 'minimal', 'M', 30, 50, '#2b2b2b', 'jacket', 'oversized blazer'],
  ['Graphic hoodie', 'Champion', 'Sweatshirts', 'streetwear', 'XL', 27, null, '#7d3c98', 'sweater', 'champion vintage hoodie'],
  ['Silk slip dress', 'Unbranded', 'Dresses', 'minimal', 'S', 26, 40, '#c9a27e', 'dress', 'silk slip dress'],
  ['Leather loafers', 'G.H. Bass', 'Shoes', 'preppy', '10', 42, null, '#5a3825', 'shoe', 'bass loafers'],
  ['Striped rugby shirt', 'Polo', 'Shirts', 'preppy', 'L', 36, 55, '#1f3a68', 'shirt', 'vintage rugby shirt'],
  ['Cargo pants', 'Dickies', 'Pants', 'workwear', '30', 25, null, '#6b705c', 'pants', 'dickies cargo pants'],
  ['Cropped knit cardigan', 'Urban Outfitters', 'Sweaters', 'y2k', 'S', 20, 34, '#b5c99a', 'sweater', 'cropped cardigan'],
  ['Windbreaker jacket', 'Nike', 'Jackets', 'streetwear', 'L', 40, null, '#e4572e', 'jacket', 'vintage nike windbreaker'],
  ['Linen button-down', 'Gap', 'Shirts', 'minimal', 'M', 19, null, '#efe6d8', 'shirt', 'linen button down'],
  ['Floral midi dress', 'Free People', 'Dresses', 'boho', 'M', 34, 58, '#d1495b', 'dress', 'free people floral dress'],
  ['Canvas high-tops', 'Converse', 'Shoes', 'streetwear', '8', 28, null, '#e9e3d5', 'shoe', 'vintage converse'],
  ['Wool overcoat', 'Unbranded', 'Jackets', 'minimal', 'L', 60, 95, '#6d6875', 'jacket', 'wool overcoat'],
  ['Ringer tee', 'Unbranded', 'T-shirts', '70s retro', 'M', 15, null, '#f4d35e', 'tee', 'vintage ringer tee'],
  ['Wide-leg trousers', 'Banana Republic', 'Pants', 'minimal', '30', 27, 40, '#8d99ae', 'pants', 'wide leg trousers'],
];

const SHAPES = {
  tee: 'M70 60 L110 45 Q150 70 190 45 L230 60 L265 110 L230 130 L215 115 L215 250 L85 250 L85 115 L70 130 L35 110 Z',
  shirt: 'M75 55 L115 42 L150 70 L185 42 L225 55 L262 120 L232 132 L218 112 L218 255 L82 255 L82 112 L68 132 L38 120 Z M150 70 L150 255',
  sweater: 'M72 60 L115 46 Q150 62 185 46 L228 60 L255 200 L228 206 L215 120 L215 252 L85 252 L85 120 L72 206 L45 200 Z',
  jacket: 'M72 55 L118 40 L150 95 L182 40 L228 55 L258 210 L226 214 L215 125 L215 255 L85 255 L85 125 L74 214 L42 210 Z M150 95 L150 255',
  pants: 'M95 40 L205 40 L222 255 L165 255 L150 110 L135 255 L78 255 Z',
  skirt: 'M110 60 L190 60 L235 230 L65 230 Z',
  dress: 'M115 40 L135 40 Q150 60 165 40 L185 40 L180 100 L235 255 L65 255 L120 100 Z',
  shoe: 'M40 190 L60 130 L120 135 Q150 170 200 165 L255 180 Q265 200 250 215 L45 215 Z',
};

function photo(colour, shape, label) {
  const light = ['#ffffff', '#efe6d8', '#e9e3d5', '#d8c8a8', '#f4d35e', '#f2a7c3', '#b5c99a'].includes(colour);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f3efe8"/>` +
    `<g transform="translate(30,20) scale(0.8)"><path d="${SHAPES[shape]}" fill="${colour}" stroke="${light ? '#b8ae9c' : 'none'}" stroke-width="3" stroke-linejoin="round"/></g>` +
    `<text x="150" y="36" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="#8a8172" text-anchor="middle">${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const now = new Date().toISOString();
const listings = ITEMS.map(([title, brand, category, style, size, price, orig, colour, shape, q], i) => ({
  id: `manual:demo-${i + 1}`, source: 'manual', sourceId: `demo-${i + 1}`,
  url: `https://www.depop.com/search/?q=${encodeURIComponent(q)}`, affiliateUrl: null,
  title, brand, price, originalPrice: orig, currency: 'USD', size, category, condition: 'used - good', style,
  photoUrl: photo(colour, shape, 'Example find'), photoUrls: [], sellerRating: null, sellerReviewCount: null,
  status: 'active', missedChecks: 0, scrapedFor: null, firstSeenAt: now, lastCheckedAt: now, soldAt: null,
}));

const foot = 'DEMO: example finds, so you can try the swiping. Real Depop, Vinted and eBay thrift finds are coming soon - the treasure hunt without opening three apps.';
const dist = path.join(ROOT, '6-hosting', 'demo', 'dist');
const write = (rel, text) => { const f = path.join(dist, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
fs.rmSync(dist, { recursive: true, force: true });
write('index.html', renderApp({ listings, fp: { items: {} }, foot, title: TITLE, head: headTags(), top: heroHTML(), bottom: bottomHTML() }));
write(path.join('about', 'index.html'), aboutPage());
write(path.join('changelog', 'index.html'), changelogPage());
write('robots.txt', robotsTxt());
write('sitemap.xml', sitemapXml());
// Pictures that sit next to the page: the link-preview image, and Tanner's photo once added.
for (const f of ['og.png', SITE.founder.photo].filter(Boolean)) {
  const src = path.join(ROOT, '6-hosting', 'demo', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dist, f));
  else await alert(`Demo site: ${f} is missing`, `6-hosting/demo/${f} was not found, so the site links to a picture that isn't there.`);
}
if (!SITE.waitlistFormUrl) await alert('Demo site: sign-up list is not switched on', 'The "Get the 3-day free trial first" form is not collecting emails yet. Set WAITLIST_FORM_URL in Vercel (see 6-hosting/demo/site.config.js).');
log(`Built ${dist}: ${listings.length} example items, plus /about, /changelog, robots.txt and sitemap.xml.`);
