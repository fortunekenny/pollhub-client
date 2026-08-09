# PollHub Client

Web client for PollHub — creator dashboard and respondent pages.
React 18 + Vite + Tailwind v4, in **JavaScript ES modules** (no TypeScript, matching the API).

Pairs with [`temp-pollhub-api`](../temp-pollhub-api). See
[`voting-survey-system-brief.md`](../temp-pollhub-api/voting-survey-system-brief.md)
for the product brief.

## Getting started

Start the API first — it must be on `localhost:3000`:

```bash
cd ../temp-pollhub-api && npm run dev
```

Then:

```bash
npm install
npm run dev          # http://localhost:5173
```

`vite.config.js` proxies `/api` and `/ws` to the API, so the browser sees a
single origin. That matters more than convenience: the API sets **signed
cookies**, and the device-id cookie is what the default duplicate-protection
mode identifies a repeat voter by. Split the origins and dedup silently stops
working in dev.

No `.env` is needed for local development. Copy `.env.example` only to enable
web push.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built output |

## Deploying

`render.yaml` describes the whole thing — point a Render Blueprint at this repo,
or create a **Static Site** manually with:

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Rewrite rule | `/*` → `/index.html` (**Rewrite**, not Redirect) |

Three things that only bite in production:

**1. Both URL variables must be set, and set before the build.** Vite inlines
`import.meta.env` at build time, so a value edited afterwards does not reach the
served bundle until a redeploy. Left blank, `api.js` falls back to the relative
`/api/v1` and `useLiveTallies.js` derives `wss://<this host>/ws` — both of which
point at the static host, which serves neither.

**2. The rewrite is not optional.** `/p/:slug` is reached almost entirely by
shared link, and without the fallback a cold open returns 404 — no file named
`/p/abc123` exists in `dist/`.

**3. Split origins break cookie dedup.** In dev the Vite proxy keeps one origin.
In production the client and API are different sites, and the API sets its
cookies `SameSite=Lax`, which browsers do not send cross-site. Auth survives
(the token is in `localStorage` and sent as a Bearer header), but the signed
device-id cookie never comes back, so `dedupMode: "cookie_device"` — the default
for every poll — stops recognising repeat voters. The fix is `SameSite=None;
Secure` on the API side; see the API's `responses.controller.js`.

Web push is optional: leave the `VITE_FIREBASE_*` variables unset and the
notifications card reports "not configured" instead of failing.

## Layout

```
src/
├── main.jsx            Root render, router, auth provider
├── App.jsx             Route table
├── index.css           Tailwind + design tokens (light/dark)
├── lib/
│   ├── api.js          fetch wrapper + typed endpoint map
│   ├── auth.jsx        Session context
│   ├── useLiveTallies.js  WebSocket subscription with backoff
│   ├── push.js         FCM web push (lazy)
│   ├── hooks.js        useAsync / useAction / useCopy
│   └── format.js       Formatters and setting labels
├── components/
│   ├── ui.jsx          Button, Input, Field, Card, Badge, Toggle…
│   ├── Layout.jsx      App shell + chrome-free respondent shell
│   ├── QuestionEditor.jsx, ImageUploader.jsx, SharePanel.jsx
│   └── charts/         ResultBars, ShareDonut, TrendChart, ChartPanel
└── pages/              Landing, auth, Dashboard, Builder, PollDetail,
                        Respond, Discover, Settings
```

## Routes

| Path | Page | Auth |
|---|---|---|
| `/` | Landing | — |
| `/p/:slug` | **Respondent poll page** | none, ever |
| `/discover` | Public polls | — |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth | — |
| `/dashboard` | Creator poll list | required |
| `/new` | Quick Vote / Survey builder | required |
| `/polls/:id` | Results, share, analytics, invites | required |
| `/settings` | Notification preferences + web push | required |

## Four things worth knowing before you change anything

**1. The respondent page is the performance surface.** `/p/:slug` renders
through `RespondentLayout` — no nav, no auth check, no dashboard chrome. The
brief targets < 1.5 s on 3G there and treats a login wall as the main cause of
drop-off. Keep heavy imports out of its path; the Firebase SDK is dynamically
imported for exactly this reason.

**2. Charts follow a validated palette.** The colors in `index.css` came from
the data-viz reference and were run through its validator in both modes — all
adjacent-pair checks pass. Light mode carries a sub-3:1 contrast warning on
three hues, and the documented relief is visible labels **or** a table view;
`ChartPanel` ships both. If you change a `--s*` token, re-run the validator
before merging.

**3. Result bars are one hue on purpose.** Option labels sit beside every bar,
so categorical color would re-encode something already named — and it caps
cleanly at any number of options. Categorical color appears only in the donut,
where color genuinely is the identity channel, and folds to "Other" past five
slices.

**4. Settings lock after the first response.** The builder warns about it and
the API enforces it. Identity and dedup mode cannot change once a poll has
responses, because results collected under two different rules cannot be read
as one number.

## Known gaps

- **No token refresh.** The API issues a 15-minute access token with no refresh
  endpoint, so a long dashboard session ends in a redirect to `/login`. The
  client handles the 401 cleanly, but the fix belongs on the API.
- **Poll settings are create-only.** The builder writes settings on creation;
  editing an existing poll's settings needs a form against the existing
  `PATCH /polls/:id`.
- **No tests.** Vitest + Testing Library on the vote flow and the builder's
  validation branches is the obvious first addition.
- **Web push is untested end to end** — it needs real Firebase credentials,
  which this build has never had.
