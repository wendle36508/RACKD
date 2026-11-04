# Toolbox

| File | What it is |
|---|---|
| `env.js` | Loads secrets from `.env` and keeps logs in `logs/` |
| `check.js` | Self-test with a fake Apify, no money spent: `npm run check` (RACKD.bat option 6) |
| `alerts.js` | Activity log + alerts (logs/ALERTS.txt, and email if set up) |
| `daily-summary.js` | Yesterday in plain words: `npm run summary` |
| `health.js` | A light for every floor: `npm run health` or /api/health |
| `windows/get-node.ps1` | Downloads a private copy of Node.js if the laptop doesn't have it (checked against the official checksum) |

Also used: **Claude Code** with **gstack** on Tanner's laptop. Open Claude Code inside the `rackd` folder.
