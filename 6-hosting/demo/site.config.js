// Floor 6: the words and links on the public demo site (rackd-demo.vercel.app).
// Change things here, not in site.js. Anything marked TANNER is waiting on you.

export const SITE = {
  url: 'https://rackd-demo.vercel.app',

  // TANNER: where the "Get the 3-day free trial first" email form sends emails.
  // Make a free form (Tally, Formspree or similar) that accepts a field called "email",
  // then put its submit address in Vercel > rackd-demo > Settings > Environment Variables
  // as WAITLIST_FORM_URL. Until then the form tells visitors the list isn't open yet
  // (nothing is collected), and every build warns about it.
  waitlistFormUrl: (process.env.WAITLIST_FORM_URL || '').trim(),

  founder: {
    name: 'Tanner',
    line: 'Built by Tanner, a Babson sophomore and thrifter. Building in public - follow along.',
    // TANNER: a real photo of you (square, about 200x200). Save it as 6-hosting/demo/founder.jpg
    // and set photo: 'founder.jpg'. Until then a "T" circle shows instead.
    photo: null,
    // TANNER: your public profiles, e.g. { label: 'LinkedIn', url: 'https://www.linkedin.com/in/...' }.
    // They also go into the page's search-engine data (sameAs).
    links: [],
  },

  incubator: 'Part of the Babson Ignite incubator',

  // TANNER: real one-line quotes from people who tried the demo, with their OK to post them.
  // e.g. { quote: '...', name: 'Maya', context: 'college junior, thrifts Depop weekly', photo: null }
  // The quote strip only appears once there is at least one. Never make these up.
  quotes: [],

  // Build-in-public log, newest first. Keep it to things that really happened.
  changelog: [
    {
      date: '2026-11-04',
      items: [
        ['shipped', 'This site now says what RACKD is, who it is for, and how buying works, plus a sign-up list for the 3-day free trial.'],
        ['shipped', 'The demo deck went online, so anyone can try the swiping on their phone. The items are made-up examples for now.'],
        ['decided', 'One membership: $9.99 a month, with a 3-day free trial first. No free tier, so the deck works for members.'],
        ['decided', 'Finds come from Vinted, Depop and eBay, in one deck.'],
        ['built', 'The check that pulls sold listings right before you see them, and the rule that you never see the same card twice. Both go live with real listings.'],
      ],
    },
  ],
  next: [
    'Real Depop, Vinted and eBay listings in the deck',
    'Sign-up with the 3-day free trial',
    'Filtering out junk and fake listings before they reach your deck',
  ],
};
