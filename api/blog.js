// Vercel runs this file for /blog, /blog/<slug>, /sitemap.xml and /robots.txt (see vercel.json).
// The real work is in 6-hosting/blog/blog.js.
import { renderIndex, renderPost, renderSitemap, robots } from '../6-hosting/blog/blog.js';

const CACHE = 'public, max-age=0, s-maxage=120, stale-while-revalidate=600'; // fresh every 2 minutes

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const route = q.get('route');
  try {
    if (route === 'robots') return send(res, 200, 'text/plain; charset=utf-8', robots());
    if (route === 'sitemap') return send(res, 200, 'application/xml; charset=utf-8', await renderSitemap());
    const slug = q.get('slug');
    if (slug) { const { status, html } = await renderPost(slug); return send(res, status, 'text/html; charset=utf-8', html); }
    return send(res, 200, 'text/html; charset=utf-8', await renderIndex(q.get('page')));
  } catch (e) {
    console.error('BLOG: page failed: ' + e.message);
    return send(res, 500, 'text/plain; charset=utf-8', 'The blog is having a moment. Please try again shortly.');
  }
}

function send(res, status, type, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', status === 200 || status === 404 ? CACHE : 'no-store');
  res.end(body);
}
