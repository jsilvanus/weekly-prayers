# Weekly prayer email (spec)

Admins create **mailings**: a weekly prayer email sent to a **recipient list**. A mailing is either for one specific week or recurring (every week). Creating a mailing **requires send dates**. Delivery goes through the Tunnus mail relay using the npm package `@tunnus/notify` (`sendRelayEmail`, add to `backend/package.json`; bearer `TUNNUS_MAIL_RELAY_TOKEN`). Known gap: `@tunnus/notify@0.1.0` does not send `from`, which the relay requires (400). Work around it by passing a `fetchImpl` that parses the JSON body, adds `from: MAIL_FROM` and calls global fetch; remove when the package is fixed. No SMTP in this app.

## Lists and consent (GDPR; recipients are church members, so the list itself hints at religious affiliation)

- Lists are managed in the app (tenant-scoped). Tunnus groups are not used.
- Subscriber status: `pending` | `active` | `unsubscribed`. Only `active` receives mail.
- Two ways in: (1) public self-signup with double opt-in (confirmation mail, link with HMAC token; `consent_source='self_signup'`), (2) staff adds addresses and ticks "recipient has given consent" (stored as `consent_source='admin_attested'`, `consent_at`, `added_by`). Adding without ticking is rejected.
- Every mail has an unsubscribe link (one click, no login) and the sender/controller name. Unsubscribing sets `unsubscribed`, keeps the row (suppression) so it is not re-added by import. Staff can delete a subscriber (hard delete = erasure).
- Tokens: `HMAC-SHA256(JWT_SECRET, "<purpose>:<subscriber_id>")` hex, compared with `timingSafeEqual`. Purposes: `confirm`, `unsubscribe`.
- Never log recipient addresses or mail bodies.
- Default content excludes parishioner-submitted public prayer requests (may name sick people). Mailing option `include_public` (default false).

## Schema (migration `023_weekly_prayer_email.sql`, idempotent)

- `mailing_lists(id uuid pk, tenant_id uuid null→tenants, name varchar(120) not null, description text, created_by uuid, created_at, updated_at)`
- `mailing_subscribers(id uuid pk, list_id→mailing_lists on delete cascade, email varchar(255) not null (stored lowercased), name varchar(120), status varchar(16) not null default 'pending', consent_source varchar(20) not null, consent_at timestamptz, added_by uuid, created_at, updated_at, unique(list_id,email))`
- `prayer_mailings(id uuid pk, tenant_id uuid null, list_id→mailing_lists, name varchar(120) not null, kind varchar(12) not null check in ('week','recurring'), week int null, year int null, send_dates date[] null, send_weekday smallint null (0-6, 0=Sunday), start_date date null, end_date date null, send_hour smallint not null default 8 (Europe/Helsinki), subject varchar(200) null, include_public boolean not null default false, enabled boolean not null default true, created_by uuid, created_at, updated_at)`
  - Required schedule (validated in service AND a CHECK): `kind='week'` → `week`, `year` and non-empty `send_dates`. `kind='recurring'` → `send_weekday` and `start_date` (`end_date` optional, ≥ start). Creation without them → 400.
- `mailing_sends(id uuid pk, mailing_id→prayer_mailings on delete cascade, send_date date not null, status varchar(12) not null ('sending'|'sent'|'failed'|'skipped'), recipients int default 0, failed int default 0, started_at, finished_at, unique(mailing_id, send_date))` – the unique key is the idempotency claim.

## Backend (`backend/src`)

- `services/mailingService.js`: CRUD for lists/subscribers/mailings with validation (`validateMailingInput(input)` exported and unit-tested), token helpers, `computeDueMailings(now, mailings, sentKeys)` pure function (Helsinki time: date + hour ≥ send_hour; week kind: today ∈ send_dates; recurring: weekday matches, start ≤ today ≤ end; week used for recurring = `getCurrentWeekInfoForTenant` for that day), `renderMailing({week,year,prayers,tenant,subscriber})` returns `{subject,text,html}` (Finnish; escape HTML; footer with unsubscribe URL and parish name from settings), `deliverViaTunnus({to,subject,text,html,fetchImpl?})` wrapping `sendRelayEmail` as above (one mail per recipient, concurrency ≤5, `from`=`MAIL_FROM`).
- Prayers via existing `getPrayersForWeek(week, year, {includeUnapproved:false, tenantId})`; drop `public` group unless `include_public`.
- `services/mailingScheduler.js`: `startMailingScheduler()` called from `index.js` after the server listens; every 10 min. Does nothing unless `TUNNUS_MAIL_URL`, `TUNNUS_MAIL_RELAY_TOKEN`, `MAIL_FROM` are set (log one line "mailing disabled"). Claim a send by `INSERT … ON CONFLICT DO NOTHING RETURNING`; skip if no row. If the week has no prayers, status `skipped`. Disable with `MAILING_SCHEDULER=false`.
- `routes/mailings.js` mounted at `/api/mailings` (`requireAuth`; staff = `requireCoordinator`, tenant scoping like other routes):
  - `GET/POST /lists`, `PUT/DELETE /lists/:id`
  - `GET /lists/:id/subscribers`, `POST /lists/:id/subscribers` (body `{emails|email, name?, consentConfirmed:true}`), `DELETE /subscribers/:id`
  - `GET/POST /` , `PUT/DELETE /:id`, `GET /:id/sends`
  - `POST /:id/preview` → `{subject,html,text,recipientCount}`; `POST /:id/test` → sends to the caller's email only.
  - Public (no auth, rate-limited in memory 10/min/IP): `POST /public/lists/:id/subscribe` `{email}` (always answers 202 to avoid enumeration), `GET /public/confirm?s=&t=`, `GET|POST /public/unsubscribe?s=&t=` (HTML confirmation page).
  - Public subscribe only for lists with `allow_public_signup` (add boolean column to `mailing_lists`, default false).
- Config in `.env.example`: `TUNNUS_MAIL_URL`, `TUNNUS_MAIL_RELAY_TOKEN`, `MAIL_FROM`, `MAILING_SCHEDULER`. Document in README.
- Tests (`backend/test/mailings.test.js`, `node --test`, no DB): validation (missing dates rejected for both kinds), token roundtrip/tamper, `computeDueMailings` cases, render escaping + unsubscribe link, `deliverViaTunnus` with injected fetch.

## Frontend (`frontend/src`)

- `components/admin/MailingManager.jsx` added as a tab in `AdminPanel.jsx` (visible to coordinator+): lists (create, public-signup toggle), subscribers (add with required consent checkbox, remove), mailings (form where send dates are required: week kind = week/year picker + one or more dates; recurring = weekday + start date + optional end date; list, enable toggle, preview, send test, send history).
- API calls in `services/` following the existing pattern; fi/sv/en strings in `locales/*`.
- A small public subscribe form is out of scope for the UI (endpoint only).
