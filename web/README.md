# Stitch & Wear web

Next.js 16 application containing three route families:

- Public luxury storefront: collections, marketplace, designers, journal,
  bespoke builder, appointments, wishlist, cart and checkout.
- Customer dashboard under `/app`.
- Tailor dashboard under `/tailor`.

## Local development

Start PocketBase from the repository root, seed it, then run Next.js:

```bash
cd pb && ./pocketbase serve
cd .. && yarn seed
cd web && npm install && npm run dev
```

The web app reads `NEXT_PUBLIC_PB_URL`, defaulting to
`http://127.0.0.1:8090`. Public pages render useful tonal fallbacks if
PocketBase is unavailable or image fields are empty.

Optional launch photography belongs in `public/storefront/seed`; its README
lists every filename and the agreed generation prompt set. Re-running
`yarn seed` uploads any files found there without duplicating content records.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright covers Chromium at desktop and mobile viewports. Install its browser
once with `npx playwright install chromium`.

PocketBase migrations define the CMS and commerce schema. The marketplace hook
re-reads seller, price, currency and stock before accepting an order; browser
cart snapshots are never authoritative.
