# Floor 4: Algorithm

**FashionCLIP style AI** (`fashionclip/fingerprint.js`). FashionCLIP is a free AI trained on fashion photos. It looks at each listing photo once and saves a "style fingerprint" (512 numbers). Items that look alike get similar fingerprints. Only new listings are processed, so hourly runs are quick.

The first run downloads the AI add-on (about 200 MB) and FashionCLIP itself (about 600 MB). After that it runs offline from `fashionclip/model-cache/`.

**How taste is learned (inside the app, floor 5):** every like pulls your taste toward that look, every pass pushes it away a little, and the deck is re-sorted by how close each item is to your taste. The "Your style" tab shows which style words (boho, streetwear, y2k...) and colors fit your likes. Brand, category and price range also count.

Model: `patrickjohncyh/fashion-clip` on Hugging Face. Check its license before using it in a paid product.
