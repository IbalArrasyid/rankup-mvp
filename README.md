# RankUp — Customer MVP + Operations + Telegram Job Pool + DOKU QRIS

RankUp is an Indonesian customer-facing MVP for Mobile Legends: Bang Bang rank boosting from Mythic through Mythical Immortal. It provides a transparent price calculator, persistent PostgreSQL orders, encrypted credential collection, and private customer order tracking.

## Scope

- Tier-aware price calculator using integer rupiah
- Persistent PostgreSQL orders, events, and encrypted credentials
- Human-readable, non-sequential public order IDs
- Manual payment-provider abstraction and pending-payment state
- Signed customer access after order creation or tracking verification
- Customer progress, status, and timeline

Phase 1.5 adds a single-owner admin operations panel for manually confirming payments, moving an order through a controlled operational flow, recording progress, and opening encrypted login data only on explicit request. Phase 2 adds Joki supply and manual assignment. Phase 3 adds an internal Job Pool and a Telegram worker interface for linked Joki. Wallets, payouts, chat automation, automatic routing, and customer credentials in Telegram remain out of scope.

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
- `/admin/jobs` — protected server-paginated Telegram Job Pool
- `/admin/joki` — protected Joki supply and Telegram connection management
- `/api/telegram/webhook` — Telegram-only webhook protected by `X-Telegram-Bot-Api-Secret-Token`

## Environment

Copy `.env.example` to `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rankup"
CREDENTIAL_ENCRYPTION_KEY="<base64 encoded random 32-byte key>"
ORDER_ACCESS_SECRET="<at least 32 random characters>"
ADMIN_PASSWORD="<strong unique production password>"
ADMIN_SESSION_SECRET="<independent random secret of at least 32 characters>"
APP_URL="http://localhost:3000"
TELEGRAM_BOT_TOKEN="<server-only Bot API token>"
TELEGRAM_WEBHOOK_SECRET="<random webhook secret>"
TELEGRAM_BOT_USERNAME="<bot username without @>"
DOKU_ENV="sandbox"
DOKU_CLIENT_ID="<DOKU server-side client ID>"
DOKU_SECRET_KEY="<DOKU server-side secret key>"
NEXT_PUBLIC_SUPPORT_WHATSAPP="62812XXXXXXXX"
```

Credential operations fail closed without a valid base64 32-byte key. `ORDER_ACCESS_SECRET` is a separate cryptographic secret and must have at least 32 random characters. `ADMIN_PASSWORD` must be a strong, unique production secret and `ADMIN_SESSION_SECRET` must be independently random; neither may use a `NEXT_PUBLIC_` prefix.

## DOKU QRIS setup

Set `APP_URL` to the public HTTPS deployment URL, then configure the DOKU QRIS notification URL as `https://your-domain/api/payments/doku/notification`. The Checkout request restricts `payment.payment_method_types` to `QRIS`; no customer-facing bank transfer, VA, cards, or payment-method picker is provided.

Use the DOKU Sandbox client ID and secret with `DOKU_ENV=sandbox` to verify checkout creation and signatures. DOKU's current documentation states that QRIS itself is not supported in Sandbox; use a DOKU environment where QRIS has been enabled to complete an end-to-end QRIS payment and webhook test. A public HTTPS endpoint is required: DOKU cannot notify localhost without a developer-provided tunnel.

Manual smoke test:

1. Check Epic V to Epic I (`Rp10.000` per gained star), Legend V to Legend I (`Rp12.000`), and Epic/Legend-to-Mythic cross-tier quotes.
2. Create an unpaid order, click **Bayar dengan QRIS**, and verify one `PaymentAttempt`, a DOKU redirect URL, and QRIS-only Checkout configuration.
3. Complete a provider-side payment and verify exactly one paid attempt, `Order.paymentStatus=PAID`, `Order.status=PAID`, and one customer event. Re-send the identical webhook and verify no duplicate event.
4. Visit the return URL without a successful webhook and verify the order remains unpaid. Expire an attempt, create another, and verify history is retained.
5. Verify the floating WhatsApp button has a generic message on public pages and contains only public Order ID on an order page.

## Prisma and commands

Use a local PostgreSQL database for development. The included `init_customer_mvp` migration is for an empty development database; never reset a database containing customer data.

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy # production only; never use migrate reset or db push in production
npm test
npm run lint
npm run typecheck
npm run build
```

For a deployed environment, apply pending migrations explicitly with `npx prisma migrate deploy`. Do not add migration deployment to Vercel builds or postinstall hooks.

## Telegram worker setup

Telegram uses immutable numeric user IDs for worker authorization. A Joki is linked only through an admin-generated, one-time, SHA-256-hashed link token; usernames are display metadata and never authorization.

Set `APP_URL`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_WEBHOOK_SECRET`, then explicitly register the deployed webhook:

```bash
npm run telegram:set-webhook
npm run telegram:webhook-info
```

To remove it, use `npm run telegram:delete-webhook`. These commands never print the bot token. Telegram cannot reach localhost without a developer-provided public tunnel; business/domain tests work locally without Telegram.

Telegram messages contain only safe job and rank information. They never include customer contact details, notes, login identifiers, passwords, or encrypted credentials. No JobOffer table is created in this MVP; notification delivery is best-effort and the JobPosting remains the source of truth.

## Security and limitations

An order view requires a signed, HttpOnly, SameSite=Lax cookie bound to that one public order ID. It is Secure in production and is issued only after an ID-plus-normalized-WhatsApp match, or after creating that same order.

Login identifiers, passwords/secrets, MLBB account/server IDs, and notes are encrypted with distinct AES-256-GCM IVs before persistence. Customer queries return only credential receipt state, never plaintext or ciphertext.

The rate limit is process-local and must be replaced by shared infrastructure before horizontal scaling, including for admin login protection. The manual payment provider models a pending state only; real payment gateway integration is intentionally deferred.

Admin sessions are signed, HttpOnly, SameSite=Lax cookies scoped to `/admin`, with a ten-hour lifetime and a secret separate from customer order access. Password comparison uses SHA-256 digests with a constant-time equality check. Admin audit records deliberately exclude passwords, session values, decrypted credentials, ciphertext, and encryption secrets. A proper identity provider and MFA are recommended future hardening before expanding beyond the single-owner MVP.

## Production migration

The initial customer migration has already been deployed and must not be edited. Phase 1.5 adds `20260903110000_add_admin_audit_log`; apply it to production manually with `npx prisma migrate deploy` during the release process. Do not add migrations to the Vercel build or `postinstall` step.
