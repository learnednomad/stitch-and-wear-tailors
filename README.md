# Stitch & Wear Tailors

A two-sided Nigerian custom-tailoring marketplace: customers order bespoke garments (agbada, senator, kaftan, ankara styles…), pick fabrics, share measurements and track every production stage; tailors manage a pipeline of orders, record offline payments, issue invoices and see analytics.

## Architecture

| Piece | Stack | Location |
|---|---|---|
| Mobile app (iOS/Android) | Expo SDK 52 / React Native 0.76, Ignite, MobX-State-Tree | `app/` |
| Web app | Next.js 16 (App Router), Tailwind CSS 4 | `web/` |
| Backend | Self-hosted PocketBase 0.39 (auth, DB, files, SSE realtime, JS hooks) | `pb/` |

- **Production backend**: https://api.stitchandwear.learnednomad.com (Coolify on a Hostinger VPS)
- **Production web app**: https://app.stitchandwear.learnednomad.com
- Server-side business logic lives in `pb/pb_hooks/` (order numbers, status timeline, payment reconciliation, notifications). Schema is versioned in `pb/pb_migrations/`.
- Payments are recorded manually (cash/transfer/POS) — the server reconciles order balances and invoice statuses. A gateway (Paystack/Stripe) can slot in later.

## Local development

```bash
# 1. Backend — download the PocketBase binary once into pb/ (see pb/.gitignore), then:
cd pb && ./pocketbase serve         # http://127.0.0.1:8090, migrations auto-apply

# 2. Seed demo data (accounts, catalog, orders, invoices)
yarn seed                           # demo.client@stitchandwear.ng / demo.tailor@stitchandwear.ng, password Demo12345!

# 3. Mobile
yarn install
yarn ios                            # or: yarn start (dev client)

# 4. Web
cd web && npm install && npm run dev   # http://localhost:3000
```

Useful scripts: `yarn compile` (typecheck), `yarn test` (jest), `yarn lint`, `yarn build:ios:sim` etc. (EAS local builds). The web app builds with `npm run build` in `web/` and ships via `web/Dockerfile` (standalone output).

## Deployment

Both production apps deploy from this repo via Coolify (project "Stitch and Wear Tailors"):
- `stitchandwear-pocketbase` — Dockerfile at `pb/Dockerfile`, persistent volume at `/pb/pb_data`, superuser bootstrapped from `PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD` env vars.
- `stitchandwear-web` — Dockerfile at `web/Dockerfile` (Next standalone). `web/.env.production` pins the public API URL.

> **Note:** SMTP is not yet configured on the production PocketBase — verification and password-reset emails won't send until a provider is set in the PB admin settings (Settings → Mail).

## Repo layout

```
app/           React Native app (screens, models/stores, services, navigators)
web/           Next.js web app (src/app routes, src/lib PB api modules)
pb/            PocketBase migrations, hooks, Dockerfile
scripts/       seed-pocketbase.js
docs/          product docs and epics (BMAD)
```

Built on the [Ignite](https://github.com/infinitered/ignite) boilerplate.
