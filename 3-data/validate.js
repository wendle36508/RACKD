// Small checker: makes sure a listing has the fields every floor relies on.
// (A light version of listing.schema.json, so it needs no extra add-ons.)
const REQUIRED = ['id', 'source', 'sourceId', 'url', 'title', 'price', 'currency', 'photoUrl', 'status', 'firstSeenAt', 'lastCheckedAt'];
const STATUS = ['active', 'sold', 'removed'];

export function problems(l) {
  const p = [];
  for (const k of REQUIRED) if (l[k] === undefined || l[k] === null || l[k] === '') p.push('missing ' + k);
  if (typeof l.price !== 'number' || !(l.price >= 0)) p.push('price is not a number');
  if (l.status && !STATUS.includes(l.status)) p.push('bad status ' + l.status);
  for (const k of ['url', 'photoUrl']) if (l[k] && !/^https?:\/\//.test(l[k])) p.push(k + ' is not a web link');
  return p;
}
