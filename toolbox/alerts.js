// Safety rails: activity log + alerts.
//
// activity(type, details) records everything that happens (every scrape, skipped refresh,
// sold check, plan change, Stripe event) in 3-data/local/activity.jsonl, so nothing can
// fire, or fail to fire, without leaving a trace.
//
// alert(subject, text) is for things Tanner must know about: it is logged, written to
// logs/ALERTS.txt, and emailed if email is set up in .env (RESEND_API_KEY + ALERT_EMAIL_TO,
// free at resend.com). Without email, alerts still show in logs/ALERTS.txt and /api/health.
import fs from 'node:fs';
import path from 'node:path';
import { LOG_DIR } from './env.js';
import { appendActivity } from '../3-data/store.js';

export function activity(type, details = {}) {
  try { appendActivity({ type, ...details }); } catch (e) { console.error('Could not write activity log: ' + e.message); }
}

export async function alert(subject, text = '') {
  const line = `${new Date().toISOString()}  ${subject}${text ? '\n    ' + text.replace(/\n/g, '\n    ') : ''}\n`;
  console.warn('ALERT: ' + subject);
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); fs.appendFileSync(path.join(LOG_DIR, 'ALERTS.txt'), line); } catch {}
  activity('alert', { subject, text });
  return sendEmail(`RACKD: ${subject}`, text || subject);
}

export async function sendEmail(subject, text) {
  const key = (process.env.RESEND_API_KEY || '').trim(), to = (process.env.ALERT_EMAIL_TO || '').trim();
  if (!key || !to) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: (process.env.ALERT_EMAIL_FROM || 'RACKD <onboarding@resend.dev>').trim(), to: [to], subject, text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`email service said ${res.status}`);
    return true;
  } catch (e) {
    console.error('Alert email failed: ' + e.message);
    try { fs.appendFileSync(path.join(LOG_DIR, 'ALERTS.txt'), `${new Date().toISOString()}  (email could not be sent: ${e.message})\n`); } catch {}
    return false;
  }
}
