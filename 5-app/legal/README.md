# Legal pages (floor 5: App)

| File | What it is | Status |
|---|---|---|
| `privacy-policy.md` | The RACKD Privacy Policy for the live app (rackd-app.fly.dev: Google sign-in, Neon database, Fly.io hosting) | Written 7 Nov 2026. Fill in the placeholders and have a lawyer check it before strangers sign up |

The text is Markdown, so the Flet app can show it as-is with `ft.Markdown`. The thread that owns the app adds the in-app page and links.

Not legal advice. This was written by Claude, not a lawyer.

## The big idea (plain English)

Tanner's rule: use people's **style data** freely, never their **account info**.

- **Account info** (Google ID, email): sign-in and account messages only. Never sold. This also keeps RACKD inside Google's sign-in rules, which ban selling data you get from Google.
- **Style data** (swipes, likes, taps, quiz, sizes, budget, brands): the policy openly says it can be used to improve RACKD, train our AI, do research, and **sell de-identified or combined insights to brands and partners**.
- Saying this openly now matters. If a use isn't in the policy and you add it later, the FTC expects you to ask permission again for data you already collected. A broad, honest policy keeps the door open; a vague one is the risky kind.

## What needs care before selling anything

1. **De-identified or combined data: no opt-out needed.** Strip email and Google ID, keep it so it can't be traced to a person, promise not to re-identify it, and put that same promise in every contract with the brand. Combined reports ("40% of members who like X also like Y") are the safest.
2. **Per-person style profiles: opt-out needed.** If you ever want to sell data about one user, even without their name (for example "user 4821 likes Vuori, size M, $40-60"), US privacy laws still count that as personal info. Then you must (a) update the policy first, (b) add a **"Do Not Sell or Share My Personal Information"** button in the app, and (c) honor the browser's Global Privacy Control signal. Some states (for example Maryland) also ban selling teens' data, which is one reason the policy says 18+.
3. **Watch the 50% rule.** California's law applies to any company, however small, that gets half or more of its revenue from selling or sharing personal info. Selling de-identified insights doesn't count, but per-person data would.
4. **eBay listing data.** The insights may also use eBay listings. eBay's API terms limit how listing data can be reused or sold, so check them before selling anything built on eBay listings. (This is about listings, not users.)

## Placeholders to fill in

Search `privacy-policy.md` for `[`.

| Placeholder | What goes there |
|---|---|
| `[OPERATOR NAME]` | Your name until a company is formed, then the company's legal name |
| `[MAILING ADDRESS]` | A real address (a virtual mailbox is fine) |
| `[PRIVACY EMAIL]` | An inbox you actually check |
| `[EFFECTIVE DATE]`, `[LAST UPDATED DATE]` | The day it goes live |
| `[SETTINGS > DELETE ACCOUNT]` | Where the delete button really is in the app |
| `[30] days` | How long Neon backups and Fly logs keep data. Check both dashboards |
| `[CHECK: ...]` | Lines to keep or delete once confirmed (name or photo from Google, analytics, affiliate links) |
| `[ANY OTHER PROVIDER]` | Any new service that touches user data. Delete the row if none |

## Must-do for Google sign-in

Put the public link to this policy in Google Cloud > **Google Auth Platform > Branding** (privacy policy link) for the RACKD project. Google requires it before the sign-in screen can be published for the public.

## Questions for a lawyer

1. Is our de-identification good enough for the brand insights we plan to sell, and what should the brand contract say?
2. Minimum age: is 18+ right? (Recommended, because we plan to sell insights.)
3. Do any affiliate links count as "sharing" under California law?
4. We still need **Terms of Service** (account rules, "purchases happen on the seller's site", affiliate disclosure, and billing once payments start).

## Keep the policy true

Update the policy (and its date and version) before any of these change:

- What the app stores about a user (today: Google ID, email, department, sizes, swipes, likes, cards shown, Shop it / See listing taps, quiz picks, style words; soon budget and brands).
- Adding payments, analytics, ads, email marketing or a new provider.
- Selling or sharing anything that is **not** de-identified (needs the opt-out button first).
- Showing anything about resale sellers or buyers (we keep item facts only).
