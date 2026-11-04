// Floor 6: the public demo site around the swipe deck: page title and search/preview tags,
// the hero with the sign-up list, the "how it works" and FAQ sections, the founder footer,
// and the extra pages (/about, /changelog, robots.txt, sitemap.xml).
// The words live in site.config.js; the plan numbers come from floor 7 so they never drift.
import { SITE } from './site.config.js';
import { MEMBER_PLAN, SUBSCRIPTION } from '../../7-money/plans.config.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const price = `$${MEMBER_PLAN.priceUsdPerMonth}`;
const trial = SUBSCRIPTION.trialDays;
const perDay = MEMBER_PLAN.refreshesPerDay * MEMBER_PLAN.perRefresh;

export const TITLE = 'RACKD - one swipe deck for Depop, Vinted and eBay thrift finds';
export const DESCRIPTION = 'Swipe secondhand fashion from Depop, Vinted and eBay in one deck. RACKD learns your style, so every refresh shows better finds.';

export function headTags({ path = '/', title = TITLE, description = DESCRIPTION } = {}) {
  const url = SITE.url + path;
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', name: 'RACKD', url: SITE.url,
    logo: SITE.url + '/og.png', description: DESCRIPTION,
    founder: { '@type': 'Person', name: SITE.founder.name },
    ...(SITE.founder.links.length ? { sameAs: SITE.founder.links.map(l => l.url) } : {}),
  };
  return `<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="RACKD">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE.url}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The RACKD swipe deck: one card per thrift find, with Like and Pass buttons">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE.url}/og.png">
<script type="application/ld+json">${JSON.stringify(org).replace(/</g, '\\u003c')}</script>
<style>${CSS}</style>`;
}

// Site styles. They reuse the app's colours (--bg, --ink, --accent...) so dark mode just works.
const CSS = `
html,body{height:auto}
body{overscroll-behavior:auto}
.site{max-width:560px;margin:0 auto;padding:0 16px}
.hero{padding:max(18px,env(safe-area-inset-top,0px)) 0 6px;display:flex;flex-direction:column;gap:10px}
.hero .logo{font:800 22px/1 var(--display)}
.hero h1{font:800 clamp(26px,7.4vw,36px)/1.08 var(--display);letter-spacing:-.02em;margin:0;text-wrap:balance}
.hero .sub{font-size:16px;margin:0}
.who{font-size:13px;color:var(--muted);margin:0}
.signup{display:flex;gap:8px;flex-wrap:wrap}
.signup input{flex:1 1 180px;min-width:0;height:48px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:0 14px;font:500 16px var(--body)}
.signup button,.cta{height:48px;border:0;border-radius:12px;background:var(--accent);color:#fff;font:700 15px var(--body);padding:0 16px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.signup input:focus-visible,.signup button:focus-visible,.cta:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.fine{font-size:12px;color:var(--muted);margin:0}
.formmsg{font-size:13px;margin:0;font-weight:600}
.try{font:700 12px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:6px 0 0}
body > .app{height:min(700px,calc(100svh - 24px));min-height:540px;margin-top:6px}
.buyline{font-size:13px;color:var(--muted);text-align:center;margin:8px 0 0}
.sec{padding:26px 0 0;display:flex;flex-direction:column;gap:12px}
.sec h2{font:800 24px/1.15 var(--display);margin:0;text-wrap:balance}
.points{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.points li{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px}
.points b{display:block;font:700 15px var(--body);margin-bottom:2px}
.points p,.faq p{margin:0;color:var(--muted)}
.faq details{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.faq summary{font-weight:700;cursor:pointer;min-height:24px}
.faq details[open] summary{margin-bottom:6px}
.quotes{display:grid;gap:10px}
.quotes figure{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px}
.quotes figcaption{font-size:13px;color:var(--muted);margin-top:6px}
.founder{display:flex;gap:12px;align-items:center}
.avatar{width:52px;height:52px;border-radius:50%;flex:none;object-fit:cover;background:var(--accent);color:#fff;display:grid;place-items:center;font:800 22px var(--display)}
.founder p{margin:0}
.badge{display:inline-block;font:700 12px var(--body);padding:6px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}
.sitefoot{padding:26px 0 calc(24px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;font-size:14px}
.sitefoot nav{display:flex;gap:16px;flex-wrap:wrap;background:none;border:0;padding:0}
.sitefoot a,.page a{color:var(--accent);font-weight:600}
.sitefoot a{display:inline-block;padding:6px 0}
.page a.cta{color:#fff;text-decoration:none}
.page{padding-bottom:40px}
.page h1{font:800 32px/1.1 var(--display);margin:18px 0 8px}
.page h2{font:800 20px var(--display);margin:24px 0 6px}
.page li{margin:4px 0}
.tag{font:700 11px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-right:6px}
`;

function signupForm(id) {
  const action = SITE.waitlistFormUrl;
  return `<form class="signup" id="${id}" ${action ? `action="${esc(action)}" method="POST"` : 'data-off="1"'}>
  <label for="${id}-email" style="position:absolute;left:-9999px">Email</label>
  <input id="${id}-email" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="you@email.com">
  <button type="submit">Get the ${trial}-day free trial first</button>
</form>
<p class="formmsg" id="${id}-msg" role="status" hidden></p>`;
}

export function heroHTML() {
  return `<div class="site">
<header class="hero">
  <h1>One deck for every thrift find on Depop, Vinted and eBay</h1>
  <p class="sub">Swipe. We learn your style. Every refresh shows better finds.</p>
  <p class="who">For thrifters who hunt across Depop, Vinted and eBay and are done checking three apps for a listing that sold an hour ago. Not a store, and not for new clothes.</p>
  ${signupForm('hero-signup')}
  <p class="fine">Sign-up opens soon: join the list and you're first in. ${trial} days free, then ${price} a month. Card needed to start; cancel before day ${trial} and you pay nothing.</p>
  <p class="try">Try the demo deck below</p>
</header>
</div>`;
}

function quotesHTML() {
  if (!SITE.quotes.length) return '';   // only real quotes, never placeholders
  return `<section class="sec"><h2>From people who tried it</h2><div class="quotes">${SITE.quotes.map(q => `<figure><blockquote style="margin:0">"${esc(q.quote)}"</blockquote><figcaption>${esc(q.name)}${q.context ? ', ' + esc(q.context) : ''}</figcaption></figure>`).join('')}</div></section>`;
}

function founderHTML() {
  const f = SITE.founder;
  const pic = f.photo ? `<img class="avatar" src="${esc(f.photo)}" alt="${esc(f.name)}, founder of RACKD" width="52" height="52">` : `<div class="avatar" aria-hidden="true">${esc(f.name[0])}</div>`;
  const links = [...f.links, { label: 'Follow the build', url: '/changelog/' }];
  return `<div class="founder">${pic}<div><p>${esc(f.line)}</p><p>${links.map(l => `<a href="${esc(l.url)}"${l.url.startsWith('http') ? ' rel="me noopener" target="_blank"' : ''}>${esc(l.label)}</a>`).join(' · ')}</p></div></div>
<div><span class="badge">${esc(SITE.incubator)}</span></div>`;
}

export function footerHTML() {
  return `<footer class="sitefoot">
  ${founderHTML()}
  <nav aria-label="More about RACKD"><a href="/about/">About</a><a href="/changelog/">Changelog</a></nav>
  <p class="fine">Some links to sellers may earn RACKD a small commission, at no extra cost to you.</p>
</footer>`;
}

export function bottomHTML() {
  return `<div class="site">
<p class="buyline">RACKD is the hunt, not the checkout: buying happens on Depop, Vinted or eBay, with their buyer protection.</p>
${quotesHTML()}
<section class="sec">
  <h2>The treasure hunt, without opening three apps</h2>
  <ul class="points">
    <li><b>One deck, three apps</b><p>Finds from Depop, Vinted and eBay land in one place. Up to ${perDay} a day for members, in ${MEMBER_PLAN.refreshesPerDay} refreshes.</p></li>
    <li><b>Only live listings</b><p>In the members app, every card is checked right before you see it, and sold items are pulled, so you're not falling for a find that's already gone.</p></li>
    <li><b>Gets your style</b><p>Every like and pass teaches RACKD what you'd actually wear, so tomorrow's deck is better than today's.</p></li>
    <li><b>Never the same card twice</b><p>Once you've seen a find, it's out of your deck for good.</p></li>
    <li><b>Junk and fakes are next</b><p>Thrifting online can feel like a minefield: in our own read of 45 one-star Depop reviews, 11 were about junk or fake items. Filtering those out before they reach your deck is what we're building next.</p></li>
  </ul>
</section>
<section class="sec faq">
  <h2>Questions</h2>
  <details><summary>Why pay for discovery when other apps are free to try?</summary><p>Each refresh pulls fresh listings picked for your style, just for you, and every listing costs us real money to pull. ${price} a month covers that. You get ${trial} days free first to see if it's worth it.</p></details>
  <details><summary>Who handles my purchase if something goes wrong?</summary><p>RACKD is the hunt, not the checkout. When you tap to buy, the real listing opens on Depop, Vinted or eBay, and you buy there with their buyer protection and their support.</p></details>
  <details><summary>Is the AI style matching a gimmick?</summary><p>Try it in the demo above: like a few pieces, then open "Your style" to see what it picked up and why cards were picked for you. The members app also reads the photos themselves with FashionCLIP, a fashion image model, not just the listing titles.</p></details>
  <details><summary>When can I use it with real listings?</summary><p>Soon. The demo uses made-up example finds so you can try the swiping now. Join the list above and you'll be first in when real Depop, Vinted and eBay finds go live.</p></details>
</section>
<section class="sec" id="join">
  <h2>Want in first?</h2>
  ${signupForm('foot-signup')}
</section>
${footerHTML()}
</div>
<script>
// Sign-up list. With WAITLIST_FORM_URL set, the email is sent to that form. Without it the
// form says so plainly, and nothing is collected.
document.querySelectorAll('form.signup').forEach(f=>f.addEventListener('submit',async e=>{
  e.preventDefault(); const msg=document.getElementById(f.id+'-msg'); msg.hidden=false;
  if(f.dataset.off){ msg.textContent="Thanks! The sign-up list isn't switched on yet, so we didn't save your email. Check back in a few days."; return; }
  try{ const r=await fetch(f.action,{method:'POST',body:new FormData(f),headers:{Accept:'application/json'}});
    if(!r.ok) throw 0; msg.textContent="You're on the list. We'll email you when the ${trial}-day free trial opens."; f.reset(); }
  catch(_){ msg.textContent="That didn't go through. Please try again in a minute."; }
}));
</script>`;
}

// A simple standalone page (about, changelog) in the same look as the app.
export function pageHTML({ path, title, description, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14152a">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:wght@400;500;700&display=swap">
<style>
:root{--bg:#f2f1f7;--surface:#fff;--ink:#14152a;--muted:#6b6d85;--line:#e2e1ec;--accent:#5b3df5;
  --display:"Bricolage Grotesque","Arial Black",system-ui,sans-serif;--body:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0f1020;--surface:#1b1c33;--ink:#f1f0fa;--muted:#a3a4bf;--line:#2c2d4a;--accent:#8b74ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f1020;--surface:#1b1c33;--ink:#f1f0fa;--muted:#a3a4bf;--line:#2c2d4a;--accent:#8b74ff;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 var(--body)}
</style>
${headTags({ path, title, description })}
</head>
<body>
<div class="site page">
  <p style="margin:18px 0 0"><a href="/" style="text-decoration:none;font:800 22px var(--display);color:var(--ink)">RACK<span style="color:var(--accent)">D</span></a></p>
  ${body}
  ${footerHTML()}
</div>
</body>
</html>`;
}

export function aboutPage() {
  return pageHTML({
    path: '/about/', title: 'About RACKD - who is building it and why',
    description: 'RACKD is built by Tanner, a Babson sophomore and thrifter, in the Babson Ignite incubator: one swipe deck for Depop, Vinted and eBay finds.',
    body: `<h1>About RACKD</h1>
  <p>RACKD is one swipe deck for secondhand fashion. Finds from Depop, Vinted and eBay land in one place, you like or pass, and RACKD learns your style so every refresh shows better finds.</p>
  <h2>Who's building it</h2>
  <p>${esc(SITE.founder.line.replace(' Building in public - follow along.', ''))} RACKD is ${esc(SITE.incubator.charAt(0).toLowerCase() + SITE.incubator.slice(1))}, and the whole build is logged in public on the <a href="/changelog/">changelog</a>.</p>
  <h2>Why it exists</h2>
  <p>Thrifting online means checking three apps, falling for listings that already sold, and wading through junk. In our own read of 45 one-star Depop reviews, 11 were about junk or fake items. RACKD is the treasure hunt without that: one deck, only live listings, and filtering out junk and fakes is what we're building next.</p>
  <h2>Why it's a paid membership</h2>
  <p>RACKD pulls fresh listings for each member, picked for their style, up to ${perDay} a day, and every listing costs us real money to pull. ${price} a month pays for that. You get ${trial} days free first, and you can cancel before the trial ends and pay nothing.</p>
  <h2>Buying</h2>
  <p>RACKD is the hunt, not the checkout. You buy on Depop, Vinted or eBay, with their buyer protection and support. Some links may earn RACKD a small commission, at no extra cost to you.</p>
  <p><a class="cta" href="/#join">Get the ${trial}-day free trial first</a></p>`,
  });
}

const TAG = { shipped: 'Shipped', decided: 'Decided', built: 'Built' };
export function changelogPage() {
  const d = s => new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return pageHTML({
    path: '/changelog/', title: 'RACKD changelog - building in public',
    description: 'What has shipped, what was decided and what is next for RACKD, the swipe deck for Depop, Vinted and eBay thrift finds.',
    body: `<h1>Changelog</h1>
  <p>RACKD is being built in public. Here's what shipped, what we decided, and what's next.</p>
  ${SITE.changelog.map(e => `<h2><time datetime="${e.date}">${d(e.date)}</time></h2><ul>${e.items.map(([k, t]) => `<li><span class="tag">${TAG[k] || esc(k)}</span>${esc(t)}</li>`).join('')}</ul>`).join('')}
  <h2>Next</h2><ul>${SITE.next.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
  <p>- ${esc(SITE.founder.name)}</p>`,
  });
}

export const robotsTxt = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`;
export const sitemapXml = (date = new Date().toISOString().slice(0, 10)) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', '/about/', '/changelog/'].map(p => `  <url><loc>${SITE.url}${p}</loc><lastmod>${date}</lastmod></url>`).join('\n')}
</urlset>
`;
