// Loads secrets from the .env file at the top of the repo (if it exists) and
// gives every script the same paths and a simple logger.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

export const LOG_DIR = process.env.RACKD_LOG_DIR || path.join(ROOT, 'logs');

export function need(name) {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`${name} is missing. Copy .env.example to .env and fill in ${name}.`);
  return v;
}

export function logger(name) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const file = path.join(LOG_DIR, name + '.log');
  return (...a) => {
    const line = a.join(' ');
    console.log(line);
    fs.appendFileSync(file, new Date().toISOString() + ' ' + line + '\n');
  };
}
