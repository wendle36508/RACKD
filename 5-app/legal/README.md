# Legal pages (floor 5: App)

| File | What it is | Status |
|---|---|---|
| `privacy-policy.md` | The full RACKD Privacy Policy, shown at sign-up | **Draft.** Needs a lawyer's review and the placeholders filled in before launch |

There is no sign-up screen yet (today the app gives each visitor a cookie id, see `5-app/server.js`). When sign-up is built (planned: Supabase logins, see `docs/rackd-plan.html`), the sign-up screen should:

1. Link to the privacy policy (and the Terms of Service, once written).
2. Show this line next to the sign-up button, with both links:
   > By creating an account and starting your subscription, you agree to RACKD's Terms of Service and confirm you have read our Privacy Policy.
   (Add the minimum age once the lawyer confirms it.)
3. Send the user to Stripe checkout to start their paid subscription. RACKD is paid-only (Tanner, 4 Nov 2026): no free version. The price and billing period must be shown before they pay.
4. Have a separate, **unticked** box for marketing emails: "Send me RACKD news and style tips (optional)."
5. Save the date and the policy version each user agreed to (for example `user.policyAcceptedAt` and `user.policyVersion`), and log it with `activity('policy-accepted', ...)`.
6. Put a link to the policy in the app's settings and footer, so users can find it later.

## Before launch: fill in the placeholders

Search `privacy-policy.md` for `[` to find every one.

| Placeholder | What goes there |
|---|---|
| `[COMPANY LEGAL NAME]`, `[STATE OF FORMATION]`, `[ENTITY TYPE]` | The registered company (for example "RACKD Technologies LLC, a Massachusetts limited liability company"). Form the company first |
| `[COMPANY MAILING ADDRESS]` | A real mailing address. A registered agent or virtual mailbox is fine |
| `[PRIVACY CONTACT EMAIL]` | A dedicated inbox, for example privacy@ your domain. Someone must actually check it |
| `[EFFECTIVE DATE]`, `[LAST UPDATED DATE]` | The day the policy goes live |
| `[HOSTING PROVIDER]`, `[DATABASE PROVIDER]`, `[AUTHENTICATION PROVIDER]`, `[EMAIL PROVIDER]`, analytics, support tool | The real providers you use at launch. Delete any row you don't use |
| `[Apple / Google]` | Only if you offer "Sign in with Apple/Google". Otherwise remove |
| `[IN-APP ...]` paths | Where the settings, delete-account and support buttons are in the app |
| Numbers in `[brackets]` in section 9 | Retention periods. The suggested numbers are common choices; confirm with the lawyer |
| EU and UK representative | Only needed if you offer RACKD in Europe or the UK. If RACKD is US-only at launch, the lawyer can trim sections 4, 11 and 15 |

## Questions for the lawyer

These are the points where the right answer depends on RACKD's exact setup. They are also marked `[CONFIRM WITH COUNSEL]` in the policy.

1. **Minimum age:** 13, 16 or 18? (Depop and Vinted allow some under-18s; eBay requires 18. Since every user pays at sign-up, 18+, or under-18s with a parent's permission, is likely.)
2. **Affiliate links:** do eBay Partner Network (and later Etsy or Skimlinks) tracking cookies count as "sharing" under California law? If yes, sections 6, 7 and 13 change and the app needs a "Do Not Sell or Share" link.
3. **Which US state laws apply** at launch, given most have user or revenue thresholds.
4. **Europe and UK:** is RACKD offered there at launch? If yes, appoint representatives and add a cookie banner for any non-essential cookies.
5. **Scraped listings:** is the wording in section 2.6 (listing facts only, no seller usernames or ids, removal on request) enough for listing photos that might show a seller?
6. **Terms of Service:** RACKD also needs Terms of Service (account rules, subscription billing, auto-renewal and cancellation, affiliate disclosure, "purchases happen on the seller's site"). The FTC also requires a clear affiliate disclosure near "Buy" buttons, not only in the policy.

## Keep the policy true

The policy describes what the code does today. If any of these change, update the policy (and the "Last updated" date):

- What `3-data/store.js` keeps about a user (today: id, plan, likes, passes, cards shown up to 20,000, refresh history, search cursor).
- What is sent to Apify (`1-sources/`): today only search terms built from a user's style, never their name, email or id.
- The cookie in `5-app/server.js` (`rackd_uid`, 1 year, HttpOnly).
- Any new analytics, email, sign-in or hosting provider.
- Any new resale platform (add its privacy link to section 7).
