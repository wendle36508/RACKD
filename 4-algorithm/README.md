# Floor 4: Algorithm

| File | What it does |
|---|---|
| `taste.js` | Reads a user's style from their likes and passes (brands, styles, categories, size, price range, and how their likes look). Turns that into **their own scraper searches** (a different slice each refresh), and scores how well any listing fits them, 0 to 1 |
| `deck.js` | Picks a user's next cards: their own finds first, best match first, and **never a card they've been shown before**. **Light sharing:** other people's finds only if they score 0.6 or higher for this user, and at most 20% of the deck |
| `taste.config.js` | Starter searches for brand-new users (until 3 likes) and the sharing rules |
| `fashionclip/fingerprint.js` | FashionCLIP looks at each new listing photo once and saves a "style fingerprint" (512 numbers). Items that look alike get similar fingerprints, so matching is based on looks, not only words. The server runs it after each refresh once it's installed (RACKD.bat option 1: about 200 MB add-on + 600 MB model, first time only) |

Inside the app, every like pulls the deck toward that look and every pass pushes it away. The "Your style" tab shows the style words and colors that fit your likes.

Model: `patrickjohncyh/fashion-clip` on Hugging Face. Check its license before using it in a paid product.
