# RankUp — Customer MVP Phase 1.5

RankUp is an Indonesian customer-facing MVP for Mobile Legends: Bang Bang rank boosting from Mythic through Mythical Immortal. It provides a transparent price calculator, persistent PostgreSQL orders, encrypted credential collection, and private customer order tracking.

## Scope

- Tier-aware price calculator using integer rupiah
- Persistent PostgreSQL orders, events, and encrypted credentials
- Human-readable, non-sequential public order IDs
- Manual payment-provider abstraction and pending-payment state
- Signed customer access after order creation or tracking verification
- Customer progress, status, and timeline

Phase 1.5 adds a single-owner admin operations panel for manually confirming payments, moving an order through a controlled operational flow, recording progress, and opening encrypted login data only on explicit request. Joki registration, job assignment, wallets, payouts, real payment gateways, chat automation, and marketplace features remain out of scope.

## Architecture

- `src/config/business.ts`: centralized brand, currency, rank tiers, and pricing
- `src/domain/`: pure pricing, rank, WhatsApp, public-ID, progress, and status rules
- `src/validation/`: Zod schemas
- `src/server/`: order persistence and server-only authorization
- `src/lib/`: Prisma, AES-256-GCM encryption, signed access tokens, and payment boundary
- `src/components/`: responsive calculator and customer forms
- `src/app/`: App Router pages and server actions

The browser supplies selection and contact inputs. The server validates them, recalculates the quote itself, and persists only authoritative integer-rupiah amounts. Browser-submitted price fields are not trusted.

## Customer routes

- `/` — indexable homepage and calculator
- `/order/new` — noindex order creation
- `/track` — noindex tracking verification
- `/order/[publicId]` — noindex authorized customer detail
- `/order/[publicId]/credentials` — noindex encrypted credential submission
- `/admin/login` — noindex owner login
- `/admin` — protected operations dashboard
- `/admin/orders` — protected, server-paginated order list
- `/admin/orders/[publicId]` — protected operational order detail

## Environment

Copy `.env.example` to `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rankup"
CREDENTIAL_ENCRYPTION_KEY="<base64 encoded random 32-byte key>"
ORDER_ACCESS_SECRET="<at least 32 random characters>"
ADMIN_PASSWORD="<strong unique production password>"
ADMIN_SESSION_SECRET="<independent random secret of at least 32 characters>"
APP_URL="http://localhost:3000"
```

Credential operations fail closed without a valid base64 32-byte key. `ORDER_ACCESS_SECRET` is a separate cryptographic secret and must have at least 32 random characters. `ADMIN_PASSWORD` must be a strong, unique production secret and `ADMIN_SESSION_SECRET` must be independently random; neither may use a `NEXT_PUBLIC_` prefix.

## Prisma and commands

Use a local PostgreSQL database for development. The included `init_customer_mvp` migration is for an empty development database; never reset a database containing customer data.

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

## Security and limitations

An order view requires a signed, HttpOnly, SameSite=Lax cookie bound to that one public order ID. It is Secure in production and is issued only after an ID-plus-normalized-WhatsApp match, or after creating that same order.

Login identifiers, passwords/secrets, MLBB account/server IDs, and notes are encrypted with distinct AES-256-GCM IVs before persistence. Customer queries return only credential receipt state, never plaintext or ciphertext.

The rate limit is process-local and must be replaced by shared infrastructure before horizontal scaling, including for admin login protection. The manual payment provider models a pending state only; real payment gateway integration is intentionally deferred.

Admin sessions are signed, HttpOnly, SameSite=Lax cookies scoped to `/admin`, with a ten-hour lifetime and a secret separate from customer order access. Password comparison uses SHA-256 digests with a constant-time equality check. Admin audit records deliberately exclude passwords, session values, decrypted credentials, ciphertext, and encryption secrets. A proper identity provider and MFA are recommended future hardening before expanding beyond the single-owner MVP.

## Production migration

The initial customer migration has already been deployed and must not be edited. Phase 1.5 adds `20260903110000_add_admin_audit_log`; apply it to production manually with `npx prisma migrate deploy` during the release process. Do not add migrations to the Vercel build or `postinstall` step.
