# Earth Observatory — Week 4 Rating App

## Goal

Extend the Assignment 3 app so logged-in users can **generate** AI media and **vote** on it,
with RLS enabled on every table. Assignment 3 must keep working at its commit-specific URL
(tagged `assignment-3`), so all database changes are additive.

## Concept

You are an alien researcher studying Earth — specifically Columbia and New York City.
Built for the persona **Sam**: a chronically online Columbia junior from the Midwest who is new
to NYC. Sam is, in effect, an alien observing the locals; the joke is about their own life.

Users create one of three **report types**:

| Kind | User provides | AI writes |
|---|---|---|
| `field_note` | a phenomenon ("bodega cats") + optional photo | a deadpan alien-anthropologist report |
| `exoplanet` | a place ("Trader Joe's on 72nd") + optional photo | a planet discovery entry: atmosphere, gravity, habitability |
| `transmission` | a **required** photo + optional note | an intercepted space radio transmission describing the photo |

All reports land in one public feed where logged-in users upvote/downvote.

**Daily hook — the Daily Anomaly:** one shared subject per day (e.g. "the Halal cart line").
Users can write about it in any report type. The top-voted anomaly report of the day is shown as
**Discovery of the Day** on Mission Control.

## Explaining the features (requirement from the user)

Graders and new users must understand the app without guidance:
- A dismissible **"How it works"** banner on the feed (3 steps: pick a type → transmit → vote).
- Each report-type card shows a one-line explanation and an example.
- Empty states say what to do next ("No reports yet — be the first to transmit").
- Logged-out visitors see vote buttons labelled "Sign in to vote", linking to `/login`.
- The report page has a **"View prompt"** toggle showing the exact prompt sent to the AI.

## Pages

| Route | Access | Purpose |
|---|---|---|
| `/observatory` | public | Feed: How-it-works banner, Daily Anomaly card, sort tabs (Today's top / New / All-time), kind filter, report cards with votes |
| `/observatory/new` | logged in | Create: choose kind, subject, optional photo, "use today's anomaly" toggle, Transmit, see result |
| `/observatory/[id]` | public | Single report: body, photo, votes, author first name, View prompt |
| `/mission-control` | logged in | Adds **Discovery of the Day** and **My reports** panels |

Header and home page gain an **Observatory** link. `/observatory/new` is added to the proxy's
protected list.

## Data model (Supabase)

```
anomalies    (date date pk, subject text not null, blurb text)
reports      (id uuid pk default gen_random_uuid(),
              user_id uuid not null references auth.users on delete cascade,
              kind text not null check (kind in ('field_note','exoplanet','transmission')),
              subject text not null,
              prompt text not null,          -- full prompt sent to the model
              model text not null,           -- e.g. the Gemini model id
              body text not null,            -- AI output
              image_url text,                -- public Storage URL, never binary
              anomaly_date date references anomalies(date),
              created_at timestamptz default now())
votes        (report_id uuid references reports on delete cascade,
              user_id uuid references auth.users on delete cascade,
              value smallint not null check (value in (-1, 1)),
              created_at timestamptz default now(),
              primary key (report_id, user_id))
report_scores (view: report_id, score, upvotes, downvotes) — runs as owner; exposes aggregates only
```

- Seed ~14 days of NYC/Columbia anomalies. If today has no row, use the most recent past one.
- Photos go to a new public Storage bucket `reports`, under `<user_id>/…`.
- Author display name comes from `profiles.first_name` via a `public_profiles` view exposing only
  `id, first_name, avatar_url` (so `profiles` RLS can stay owner-only).

## Voting semantics

One vote per user per report (primary key). Clicking the same arrow again removes the vote;
clicking the other arrow switches it. Every vote action inserts/updates/deletes a row in `votes`.
UI updates optimistically and reconciles with the server response.

## RLS (strictest that still works)

| Table / object | select | insert | update | delete |
|---|---|---|---|---|
| `planets` | anyone | — | — | — |
| `profiles` | own row | own row | own row | — |
| `public_profiles` (view) | anyone (id, first_name, avatar_url only) | — | — | — |
| `anomalies` | anyone | — | — | — |
| `reports` | anyone | authenticated, `user_id = auth.uid()` | — | — |
| `votes` | own rows | authenticated, `user_id = auth.uid()` | own rows | own rows |
| `report_scores` (view) | anyone (aggregates only) | — | — | — |
| storage `avatars` | (unchanged from A3) | | | |
| storage `reports` | anyone | own folder | — | — |

`report_scores` and `public_profiles` must expose aggregates/safe columns even though the
underlying `votes`/`profiles` rows are owner-only, so both are owner-run views (Postgres default,
not `security_invoker`) with explicit column lists, granted `select` to `anon, authenticated`.

## Generation flow

1. Client posts `kind`, `subject`, optional photo, `useAnomaly` to a Server Action /
   Route Handler (`/api/generate`).
2. Server verifies the user (`auth.getUser()`); rejects if logged out.
3. Rate limit: count the user's reports in the last hour; reject above 10.
4. If a photo is included: validate type/size (≤5 MB), upload to `reports` bucket.
5. Build the prompt from a per-kind template (in `src/lib/prompts.ts`), including today's
   anomaly when chosen.
6. Call Gemini (free tier, model chosen at implementation time by listing available models)
   with text + image when present. `GEMINI_API_KEY` is server-only.
7. Insert the `reports` row with prompt, model, body, image_url, anomaly_date.
8. Return the saved report; client shows it with a link to the feed.

Errors: Gemini failure or safety block → "Transmission lost — try again", nothing saved
(uploaded photo is removed). Rate limit → "Signal jammed — try again in N minutes".

## Prompt style

System-level instructions per kind: deadpan, specific to NYC/Columbia, 60–110 words,
affectionate not mean, no slurs or attacks on real private individuals, no markdown headings.
The stored `prompt` is the full text sent (instructions + user input), so it is reproducible.

## Out of scope (YAGNI)

Comments, editing/deleting reports, following users, notifications, image generation,
moderation dashboard.

## Testing

- Typecheck, lint, build.
- Manual in Chrome (signed in and out): generate each kind, vote/switch/unvote, sorting,
  logged-out read-only, protected `/observatory/new`, View prompt.
- RLS checks with the anon key via REST: can read reports/scores; cannot insert votes or reports;
  cannot read other users' votes or profiles.
- Assignment 3 commit URL still loads planets, profile, and mission control.
