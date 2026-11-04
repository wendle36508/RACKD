// Floor 6: the RACKD blog (/blog and /blog/<slug>), written by HeyCatch (https://heycatch.ai).
// Articles are read live from the HeyCatch API on each visit (cached for 2 minutes), never
// copied into the repo. The key lives only in the HEYCATCH_API_KEY setting on Vercel (or .env
// on your laptop). If HeyCatch is down or the key is wrong, the blog shows the last good copy
// or "No articles yet": it never breaks the site, and Tanner gets an alert.
import sanitizeHtml from 'sanitize-html';

const API = (process.env.HEYCATCH_API_BASE || 'https://api.heycatch.ai/v1').replace(/\/+$/, '');
export const SITE = (process.env.SITE_URL || 'https://rackd-demo.vercel.app').replace(/\/+$/, '');
const PAGE_SIZE = 20;            // articles per /blog page (?page=2 for more)
const lastGood = new Map();      // last good API answers, used when HeyCatch fails
const alerted = new Map();       // so one problem sends at most one alert an hour

async function warn(subject, text) {
  console.warn('BLOG: ' + subject + (text ? ' ' + text : ''));
  const last = alerted.get(subject) || 0;
  if (Date.now() - last < 3600e3) return;
  alerted.set(subject, Date.now());
  try { const { alert } = await import('../../toolbox/alerts.js'); await alert(subject, text); } catch {}
}

// One API call. Returns { ok, status, data }. Never throws.
async function api(pathAndQuery, retried = false) {
  const key = (process.env.HEYCATCH_API_KEY || '').trim();
  if (!key) { await warn('Blog: HEYCATCH_API_KEY is not set', 'Add it in Vercel > rackd-demo > Settings > Environment Variables, then redeploy.'); return { ok: false, status: 0 }; }
  const url = `${API}${pathAndQuery}${pathAndQuery.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status === 429 && !retried) {
      const wait = Math.min(Number(res.headers.get('retry-after')) || 1, 5);
      await new Promise(r => setTimeout(r, wait * 1000));
      return api(pathAndQuery, true);
    }
    if (res.status === 401) await warn('Blog: HeyCatch says the API key is wrong (401)', 'Check HEYCATCH_API_KEY in Vercel: it should start with hck_lv_.');
    if (res.status === 403) await warn('Blog: HeyCatch refused the key (403)', 'The key was revoked or the HeyCatch project was deleted. Get a new prompt from HeyCatch > Settings > Integrations > AI builder; if the project was deleted a new key will not help.');
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: 200, data: await res.json() };
  } catch (e) {
    await warn('Blog: could not reach HeyCatch', e.message);
    return { ok: false, status: 0 };
  }
}

// Remember good answers; on failure (not 404) hand back the last good one.
async function cached(cacheKey, pathAndQuery) {
  const r = await api(pathAndQuery);
  if (r.ok) { lastGood.set(cacheKey, r.data); return r; }
  if (r.status !== 404 && lastGood.has(cacheKey)) return { ok: true, status: 200, data: lastGood.get(cacheKey), stale: true };
  return r;
}

export async function listPage(offset, limit) {
  const r = await cached(`list:${offset}:${limit}`, `/articles?limit=${limit}&offset=${offset}`);
  return r.ok ? { articles: r.data.articles || [], total: r.data.total || 0 } : { articles: [], total: 0 };
}

export async function allArticles() {
  const out = [];
  for (let offset = 0; offset < 5000; offset += 50) {
    const { articles, total } = await listPage(offset, 50);
    out.push(...articles);
    if (!articles.length || out.length >= total) break;
  }
  return out;
}

export async function getArticle(slug) {
  const r = await cached(`article:${slug}`, `/articles/${encodeURIComponent(slug)}`);
  if (r.ok) return { article: r.data.article };
  return { article: null, notFound: r.status === 404 };
}

// ---------- page building ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RTL = ['ar', 'he', 'fa', 'ur'];
const fmtDate = d => { const t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); };
const meta = a => [a.published ? `<time datetime="${esc(a.published)}">${esc(fmtDate(a.published))}</time>` : '', a.read_time ? `${esc(a.read_time)} min read` : ''].filter(Boolean).join(' · ');
const image = a => { const src = a.hero_image_url || a.featured_image; return /^https:\/\//.test(src || '') ? `<img class="hero" src="${esc(src)}" alt="">` : ''; };

export function clean(html) {
  return sanitizeHtml(html || '', {
    allowedTags: ['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'a', 'blockquote', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'sup', 'sub', 'span', 'div', 'section', 'details', 'summary', 'figure', 'figcaption', 'img'],
    allowedAttributes: { '*': ['id'], a: ['href', 'title', 'rel', 'target'], img: ['src', 'alt', 'width', 'height'], th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'], ol: ['start'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
  });
}

// Table of contents: one link per <h2 id> except the FAQ, placed after the Key takeaways list.
function withToc(html) {
  const heads = [...html.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi)].filter(m => m[1].toLowerCase() !== 'faq');
  if (!heads.length) return html;
  const toc = `<nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h" class="toc-h">Table of contents</h2><ol>` +
    heads.map(m => `<li><a href="#${m[1]}">${m[2].replace(/<[^>]+>/g, '')}</a></li>`).join('') + `</ol></nav>`;
  // Key takeaways = the first <h2> without an id, followed by its list.
  const kt = html.match(/^[\s\S]*?<h2(?![^>]*\bid=)[^>]*>[\s\S]*?<\/h2>\s*<(ul|ol)\b[\s\S]*?<\/\1>/i);
  if (kt && kt.index === 0 && !/<h2\b[^>]*\bid=/i.test(kt[0])) return kt[0] + toc + html.slice(kt[0].length);
  return toc + html;
}

const CSS = `
:root{--bg:#f2f1f7;--surface:#fff;--ink:#14152a;--muted:#6b6d85;--line:#e2e1ec;--accent:#5b3df5;--tag:#ffd84d;
  --display:"Bricolage Grotesque","Arial Black",system-ui,sans-serif;--body:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1020;--surface:#1b1c33;--ink:#f1f0fa;--muted:#a3a4bf;--line:#2c2d4a;--accent:#8b74ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f1020;--surface:#1b1c33;--ink:#f1f0fa;--muted:#a3a4bf;--line:#2c2d4a;--accent:#8b74ff;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 var(--body)}
.wrap{max-width:720px;margin:0 auto;padding:max(14px,env(safe-area-inset-top,0px)) 16px 40px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0 18px}
.logo{font:800 26px/1 var(--display);letter-spacing:-.02em;color:var(--ink);text-decoration:none}.logo span{color:var(--accent)}
.navlinks{display:flex;gap:4px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:3px}
.navlinks a{color:var(--muted);font:600 13px var(--body);padding:7px 12px;border-radius:999px;text-decoration:none}
.navlinks a[aria-current]{background:var(--ink);color:var(--bg)}
h1{font:800 clamp(28px,6vw,40px)/1.1 var(--display);letter-spacing:-.02em;margin:6px 0 10px;text-wrap:balance}
.meta{color:var(--muted);font-size:14px}
.list{list-style:none;padding:0;margin:18px 0;display:flex;flex-direction:column;gap:12px}
.list li{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px 18px}
.list a{font:800 21px/1.2 var(--display);color:var(--ink);text-decoration:none;text-wrap:balance}
.list a:hover{color:var(--accent)}
.empty{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px;color:var(--muted)}
article{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px clamp(18px,4vw,34px);margin-top:16px;overflow-wrap:anywhere}
article h2{font:800 24px/1.2 var(--display);margin:30px 0 8px;scroll-margin-top:16px}
article h3{font:700 18px/1.3 var(--body);margin:22px 0 6px}
article a{color:var(--accent)}
article img,.hero{max-width:100%;height:auto;border-radius:14px}
article table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}
article th,article td{border:1px solid var(--line);padding:8px 10px;text-align:left}
article blockquote{margin:16px 0;padding:4px 16px;border-left:4px solid var(--accent);color:var(--muted)}
article pre{overflow-x:auto;background:var(--bg);padding:12px;border-radius:10px}
.toc{background:var(--bg);border-radius:14px;padding:6px 18px 10px;margin:18px 0}
.toc .toc-h{font:700 12px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:10px 0 4px}
.pager{display:flex;justify-content:space-between;margin-top:10px}.pager a{color:var(--accent);font-weight:700}
footer{color:var(--muted);font-size:13px;margin-top:28px;text-align:center}
a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}`;

function shell({ title, description, canonical, type = 'website', jsonLd, body }) {
  let ld = '';
  if (jsonLd && typeof jsonLd === 'object' && Object.keys(jsonLd).length) {
    const obj = { ...jsonLd };
    if (!obj.url) { obj.url = canonical; obj.mainEntityOfPage = canonical; }
    ld = `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14152a">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
${description ? `<meta property="og:description" content="${esc(description)}">\n<meta name="twitter:description" content="${esc(description)}">` : ''}
<meta property="og:type" content="${type}">
<meta property="og:url" content="${esc(canonical)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=DM+Sans:wght@400;500;700&display=swap">
<style>${CSS}</style>
${ld}
</head>
<body><div class="wrap">
<header><a class="logo" href="/">RACK<span>D</span></a><nav class="navlinks" aria-label="Site"><a href="/">Swipe</a><a href="/blog" aria-current="page">Blog</a></nav></header>
${body}
<footer>Articles by <a href="https://heycatch.ai">HeyCatch</a> for RACKD.</footer>
</div></body></html>`;
}

export async function renderIndex(page = 1) {
  page = Math.max(1, Math.floor(Number(page)) || 1);
  const { articles, total } = await listPage((page - 1) * PAGE_SIZE, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = articles.map(a => `<li><a href="/blog/${encodeURIComponent(a.slug)}"${a.language && a.language !== 'en' ? ` lang="${esc(a.language)}"` : ''}>${esc(a.title)}</a><div class="meta">${meta(a)}</div></li>`).join('');
  const pager = pages > 1 ? `<div class="pager">${page > 1 ? `<a href="/blog${page > 2 ? `?page=${page - 1}` : ''}">← Newer</a>` : '<span></span>'}${page < pages ? `<a href="/blog?page=${page + 1}">Older →</a>` : ''}</div>` : '';
  return shell({
    title: 'Blog · RACKD',
    description: 'Thrifting tips, style ideas and resale news from RACKD.',
    canonical: `${SITE}/blog${page > 1 ? `?page=${page}` : ''}`,
    body: `<h1>Blog</h1>${items ? `<ul class="list">${items}</ul>${pager}` : '<p class="empty">No articles yet. Check back soon.</p>'}`,
  });
}

// Returns { status, html }. Unknown slugs get a 404 page.
export async function renderPost(slug) {
  const { article } = await getArticle(slug);
  if (!article) return { status: 404, html: notFound() };
  const lang = article.language && article.language !== 'en' ? ` lang="${esc(article.language)}"` : '';
  const dir = RTL.includes((article.language || '').toLowerCase()) ? ' dir="rtl"' : '';
  const canonical = `${SITE}/blog/${encodeURIComponent(article.slug || slug)}`;
  return {
    status: 200,
    html: shell({
      title: article.title, description: article.meta_description, canonical, type: 'article', jsonLd: article.jsonLd,
      body: `<article${lang}${dir}><h1>${esc(article.title)}</h1><div class="meta">${meta(article)}</div>${image(article)}${withToc(clean(article.content_html))}</article>
<p class="meta"><a href="/blog">← All articles</a></p>`,
    }),
  };
}

export function notFound() {
  return shell({ title: 'Not found · RACKD', canonical: `${SITE}/blog`, body: '<h1>Page not found</h1><p class="empty">That article does not exist. <a href="/blog">See all articles</a>.</p>' });
}

export async function renderSitemap() {
  const arts = await allArticles();
  const url = (loc, lastmod) => `<url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : ''}</url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    url(`${SITE}/`) + url(`${SITE}/blog`) + arts.map(a => url(`${SITE}/blog/${encodeURIComponent(a.slug)}`, a.updated || a.published)).join('') + `</urlset>\n`;
}

export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
