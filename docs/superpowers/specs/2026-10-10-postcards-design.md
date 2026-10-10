# Postcards from the Solar System — Week 5

## Goal

Iterate on the Week 4 Earth Observatory by adding AI-generated **images**: users "teleport" a
subject (text and/or photo) to a planet and get back an alien artist's rendition plus a postcard
caption. Postcards are voted on like every other report. Week 3/4 commit URLs must keep working,
so database changes are additive.

## Why (persona: Sam, Columbia junior new to NYC)

- New media type (images) on top of text reports.
- Collecting: a 9-stamp **passport** on Mission Control gives a reason to return.
- Uses the app's existing planets data, so the dashboard and the Observatory connect.

## Image provider

Gemini image models have a free-tier quota of 0 (verified 2026-10-10), so images come from
**Pollinations.ai** (free, no key). Its rougher style is framed as "the alien artist's rendition".
Its small watermark is kept (attribution). Gemini (free text + vision) writes the image prompt and
the caption; Pollinations only paints.

## Destinations

The 8 planets (gravity/distance/description read from the `planets` table at request time) plus a
fictional alien homeworld **Xylo-7** (gravity 0.7×). Each destination has a visual "look" used in
the image prompt and a one-line blurb shown on its button. Defined in `src/lib/destinations.ts`.

## Flow (`/observatory/teleport`, logged in)

1. Pick a destination (9 buttons, each showing gravity + blurb).
2. Enter a subject, a photo, or both; optional "use today's anomaly".
3. Teleport → `POST /api/teleport`:
   auth → validate → rate limit (shared 10/hour with all reports) → Gemini (JSON mode) returns
   `{ title, caption, image_prompt }` using real planet facts → Pollinations renders
   `image_prompt` (≤45 s) → image bytes uploaded to Storage bucket `reports` → `reports` row
   inserted (`kind='postcard'`, `planet`, `prompt` = Gemini prompt, `image_prompt`,
   `body` = caption, `image_url` = rendition).
4. Result shows in an "ALIEN ARTIST RENDITION" frame with caption, destination, gravity.

Errors: Gemini busy → "Transmission lost"; Pollinations fails/times out → "The alien artist
dropped their brush — try again". Nothing is saved on failure.

## UI changes

- Feed: Postcard filter (via `KINDS`), planet badge on postcard cards, "Teleport" button.
- `/observatory/new`: a fourth card linking to the Teleporter.
- Detail page: "View prompt" also shows the image prompt.
- Mission Control: **Passport** panel — 9 stamps, lit for planets the user has sent postcards to.
- How-it-works banner and home link mention the Teleporter.

## Data model (additive)

```sql
alter table reports drop constraint reports_kind_check;
alter table reports add constraint reports_kind_check
  check (kind in ('field_note','exoplanet','transmission','postcard'));
alter table reports add column planet text;        -- destination id, postcards only
alter table reports add column image_prompt text;  -- prompt sent to the image model
-- report_feed view recreated with planet, image_prompt appended at the end
```

RLS is unchanged (postcards are reports).

## Out of scope

Per-planet pages (fallback option B), editing the user's actual photo, paid image models.

## Testing

Vitest for pure units (destinations, postcard prompt/parse, Pollinations URL + content-type check,
Gemini JSON mode). Manual in Chrome: teleport with text, with photo only, with anomaly; vote;
passport lights up; logged-out read-only. Week 3/4 commit URLs still load.
