# Earth Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let logged-in users generate alien-themed AI reports (field notes, exoplanets, photo transmissions) with Gemini, save them with their prompts, and up/down-vote them, with RLS on every table.

**Architecture:** Next.js 16 App Router. Generation is a Route Handler (`/api/generate`) that verifies the Supabase session, calls Gemini's REST API with a model-fallback chain, uploads any photo to Supabase Storage, and inserts a `reports` row. Voting is a Server Action writing to `votes`. Public reads go through an owner-run `report_feed` view that exposes vote totals and author first names without exposing private `votes`/`profiles` rows.

**Tech Stack:** Next.js 16.3, React 19, Supabase (`@supabase/ssr`, Postgres, Storage, RLS), Gemini REST API (`generateContent`), Tailwind 4, Vitest for pure-logic unit tests.

**Spec:** `docs/superpowers/specs/2026-10-06-earth-observatory-design.md`
Deviation from spec: `report_scores` + `public_profiles` are merged into a single owner-run view
`report_feed` (one query for the feed, same privacy guarantees). Photos are downscaled in the
browser to ≤1600px JPEG because Vercel caps request bodies at 4.5 MB.

---

## File map

| File | Responsibility |
|---|---|
| `supabase/migrations/20261006000000_observatory.sql` | tables, view, seeds, Storage bucket, RLS + grants (incl. `planets`) |
| `src/lib/observatory.ts` | pure: `ReportKind`, `KINDS` metadata, `FeedReport` type, `nextVote()`, `nyDate()`, `timeAgo()` |
| `src/lib/prompts.ts` | pure: `buildPrompt()` → `{ system, user, stored }` |
| `src/lib/gemini.ts` | pure-ish: `generateReport()` with model fallback; `fetch` injectable |
| `src/lib/observatory-server.ts` | server data helpers: `getTodayAnomaly`, `getFeed`, `getMyVotes`, `getReport` |
| `src/lib/__tests__/*.test.ts` | Vitest tests for the three pure modules |
| `src/app/api/generate/route.ts` | POST: auth, validate, rate-limit, Gemini, upload, insert |
| `src/app/observatory/actions.ts` | `castVote` Server Action |
| `src/app/observatory/page.tsx` | feed |
| `src/app/observatory/HowItWorks.tsx` | dismissible explainer (client) |
| `src/app/observatory/ReportCard.tsx` | one report card (server) |
| `src/app/observatory/VoteButtons.tsx` | optimistic voting (client) |
| `src/app/observatory/new/page.tsx` + `CreateReport.tsx` | create flow |
| `src/app/observatory/[id]/page.tsx` | single report + View prompt |
| `src/app/mission-control/page.tsx` | + Discovery of the Day, My reports |
| `src/components/AuthNav.tsx`, `src/app/HelloWorld.tsx` | Observatory links |
| `src/proxy.ts` | protect `/observatory/new` |

---

### Task 1: Test tooling

**Files:** Modify `package.json`; Create `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add script** — in `package.json` `"scripts"` add `"test": "vitest run"`.

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Commit** — `git add package.json package-lock.json vitest.config.ts && git commit -m "Add Vitest"`

---

### Task 2: Domain module (`observatory.ts`)

**Files:** Create `src/lib/observatory.ts`, Test `src/lib/__tests__/observatory.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { nextVote, nyDate, timeAgo, KINDS } from "../observatory";

describe("nextVote", () => {
  it("casts a new vote", () => expect(nextVote(0, 1)).toBe(1));
  it("removes a vote when the same arrow is clicked again", () =>
    expect(nextVote(1, 1)).toBe(0));
  it("switches an upvote to a downvote", () => expect(nextVote(1, -1)).toBe(-1));
});

describe("nyDate", () => {
  it("uses New York's calendar day, not UTC", () =>
    // 02:00 UTC on Oct 7 is still Oct 6 in New York
    expect(nyDate(new Date("2026-10-07T02:00:00Z"))).toBe("2026-10-06"));
});

describe("timeAgo", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  it("formats minutes", () =>
    expect(timeAgo("2026-10-06T11:55:00Z", now)).toBe("5m ago"));
  it("formats hours", () =>
    expect(timeAgo("2026-10-06T09:00:00Z", now)).toBe("3h ago"));
  it("formats days", () =>
    expect(timeAgo("2026-10-04T12:00:00Z", now)).toBe("2d ago"));
});

describe("KINDS", () => {
  it("only transmissions require a photo", () =>
    expect(KINDS.filter((k) => k.photo === "required").map((k) => k.id)).toEqual([
      "transmission",
    ]));
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (cannot find module `../observatory`).

- [ ] **Step 3: Implement `src/lib/observatory.ts`**

```ts
export type ReportKind = "field_note" | "exoplanet" | "transmission";
export type Vote = -1 | 0 | 1;

export type KindInfo = {
  id: ReportKind;
  label: string;
  icon: string;
  blurb: string;
  example: string;
  placeholder: string;
  photo: "optional" | "required";
};

// Copy shown in the UI so people understand each report type.
export const KINDS: KindInfo[] = [
  {
    id: "field_note",
    label: "Field Note",
    icon: "◎",
    blurb: "Name something humans do. An alien anthropologist writes it up.",
    example: "“people eating lunch on the Low Steps”",
    placeholder: "e.g. bodega cats, the 1 train at 8am",
    photo: "optional",
  },
  {
    id: "exoplanet",
    label: "Exoplanet",
    icon: "◐",
    blurb: "Name a NYC place. It gets catalogued as a newly discovered planet.",
    example: "“Trader Joe's on 72nd”",
    placeholder: "e.g. Butler Library, Smorgasburg, John Jay dining hall",
    photo: "optional",
  },
  {
    id: "transmission",
    label: "Transmission",
    icon: "◉",
    blurb: "Upload a photo. A field agent radios it home to the mothership.",
    example: "a photo of your dorm room",
    placeholder: "optional note, e.g. my roommate's fridge",
    photo: "required",
  },
];

export function kindInfo(kind: ReportKind): KindInfo {
  return KINDS.find((k) => k.id === kind)!;
}

export function isReportKind(value: unknown): value is ReportKind {
  return KINDS.some((k) => k.id === value);
}

export type FeedReport = {
  id: string;
  user_id: string;
  kind: ReportKind;
  subject: string;
  body: string;
  prompt: string;
  model: string;
  image_url: string | null;
  anomaly_date: string | null;
  created_at: string;
  score: number;
  upvotes: number;
  downvotes: number;
  author_name: string | null;
  author_avatar: string | null;
};

export type Anomaly = { date: string; subject: string; blurb: string | null };

/** Clicking the arrow you already chose clears your vote; otherwise it becomes your vote. */
export function nextVote(current: Vote, clicked: 1 | -1): Vote {
  return current === clicked ? 0 : clicked;
}

/** YYYY-MM-DD in New York time — the Daily Anomaly flips at local midnight. */
export function nyDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
```

- [ ] **Step 4: Run** `npm test` — Expected: PASS (8 tests).

- [ ] **Step 5: Commit** — `git add src/lib && git commit -m "Add Observatory domain helpers"`

---

### Task 3: Prompt builder (`prompts.ts`)

**Files:** Create `src/lib/prompts.ts`, Test `src/lib/__tests__/prompts.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildPrompt } from "../prompts";

describe("buildPrompt", () => {
  it("includes the subject and kind-specific format", () => {
    const p = buildPrompt({ kind: "exoplanet", subject: "Trader Joe's on 72nd" });
    expect(p.user).toContain("Trader Joe's on 72nd");
    expect(p.system).toContain("Habitable?:");
  });

  it("mentions the daily anomaly when used", () => {
    const p = buildPrompt({
      kind: "field_note",
      subject: "the Halal cart line",
      anomaly: "the Halal cart line",
    });
    expect(p.user).toContain("Daily Anomaly");
  });

  it("tells the model about an attached photo", () => {
    const p = buildPrompt({ kind: "transmission", subject: "", hasImage: true });
    expect(p.user).toContain("photo is attached");
  });

  it("stores the full prompt (system + user) for reproducibility", () => {
    const p = buildPrompt({ kind: "field_note", subject: "bodega cats" });
    expect(p.stored).toContain(p.system);
    expect(p.stored).toContain(p.user);
  });
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/prompts.ts`**

```ts
import type { ReportKind } from "./observatory";

const BASE = `You are an alien anthropologist from the Observatory, stationed in New York City to study humans — especially Columbia University students.
Write in a deadpan, scientific tone that slowly reveals affection for the humans.
Be specific to NYC and Columbia when it fits (subway lines, bodegas, Butler Library, the Low Steps, dining halls, dorms, Morningside Heights).
Keep it funny, never mean: no insults about appearance or identity, nothing about real private individuals, no slurs, nothing sexual.
Plain text only — no markdown, no headings, no emojis. 60 to 110 words.`;

const FORMATS: Record<ReportKind, string> = {
  field_note: `Write a FIELD NOTE: an observation log entry about the phenomenon below.
Start with "FIELD NOTE #" followed by a 3-digit number and a colon. End with a single line starting "Hypothesis:".`,
  exoplanet: `Write an EXOPLANET DISCOVERY ENTRY that treats the place below as a newly discovered planet.
Use exactly these labelled lines, one per line: "Designation:", "Atmosphere:", "Gravity:", "Native life:", "Habitable?:". Keep each line short and funny.`,
  transmission: `Write an INTERCEPTED TRANSMISSION: a crackly radio message from a field agent reporting the attached photo to the mothership as a strange Earth discovery.
Start with "[TRANSMISSION INTERCEPTED]" and end with "[SIGNAL LOST]". Describe only what is actually visible in the photo.`,
};

export type PromptInput = {
  kind: ReportKind;
  subject: string;
  anomaly?: string;
  hasImage?: boolean;
};

export function buildPrompt({ kind, subject, anomaly, hasImage }: PromptInput) {
  const system = `${BASE}\n\n${FORMATS[kind]}`;
  const lines = [subject ? `Subject: ${subject}` : "Subject: (see photo)"];
  if (anomaly) lines.push(`This is for today's Daily Anomaly: "${anomaly}".`);
  if (hasImage) lines.push("A photo is attached — base the report on what you see in it.");
  const user = lines.join("\n");
  return { system, user, stored: `${system}\n\n---\n\n${user}` };
}
```

- [ ] **Step 4: Run** `npm test` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/lib && git commit -m "Add report prompt templates"`

---

### Task 4: Gemini client with fallback (`gemini.ts`)

**Files:** Create `src/lib/gemini.ts`, Test `src/lib/__tests__/gemini.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { generateReport, GenerationError } from "../gemini";

const ok = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] }));
const busy = () => new Response(JSON.stringify({ error: { code: 503 } }), { status: 503 });

const input = { system: "sys", user: "usr", apiKey: "k" };

describe("generateReport", () => {
  it("returns text and the model that answered", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("hello humans"));
    const r = await generateReport({ ...input, fetchImpl, models: ["m1"] });
    expect(r).toEqual({ text: "hello humans", model: "m1" });
  });

  it("falls back to the next model when one is busy", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(busy()).mockResolvedValueOnce(ok("hi"));
    const r = await generateReport({ ...input, fetchImpl, models: ["m1", "m2"] });
    expect(r.model).toBe("m2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("sends the image as inline data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("x"));
    await generateReport({
      ...input, fetchImpl, models: ["m1"],
      image: { mimeType: "image/jpeg", base64: "AAA" },
    });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.contents[0].parts[1]).toEqual({ inline_data: { mime_type: "image/jpeg", data: "AAA" } });
  });

  it("throws 'blocked' when safety filters stop the reply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })),
    );
    await expect(generateReport({ ...input, fetchImpl, models: ["m1"] }))
      .rejects.toMatchObject({ reason: "blocked" });
  });

  it("throws 'unavailable' when every model is busy", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => busy());
    const err = await generateReport({ ...input, fetchImpl, models: ["m1", "m2"] }).catch((e) => e);
    expect(err).toBeInstanceOf(GenerationError);
    expect(err.reason).toBe("unavailable");
  });
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/gemini.ts`**

```ts
// Best model first; fall back when Google reports high demand or rate limits.
export const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

const RETRYABLE = new Set([404, 429, 500, 503]);

export class GenerationError extends Error {
  constructor(public reason: "blocked" | "unavailable" | "empty", message: string) {
    super(message);
  }
}

type Input = {
  system: string;
  user: string;
  apiKey: string;
  image?: { mimeType: string; base64: string };
  models?: string[];
  fetchImpl?: typeof fetch;
};

export async function generateReport({
  system, user, apiKey, image, models = MODELS, fetchImpl = fetch,
}: Input): Promise<{ text: string; model: string }> {
  const parts: object[] = [{ text: user }];
  if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 1, maxOutputTokens: 400 },
  });

  let lastStatus = 0;
  for (const model of models) {
    let res: Response;
    try {
      res = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body,
          signal: AbortSignal.timeout(25_000),
        },
      );
    } catch {
      continue; // network error or timeout: try the next model
    }

    if (!res.ok) {
      lastStatus = res.status;
      if (RETRYABLE.has(res.status)) continue;
      throw new GenerationError("unavailable", `Gemini returned ${res.status}`);
    }

    const data = await res.json();
    if (data.promptFeedback?.blockReason) {
      throw new GenerationError("blocked", data.promptFeedback.blockReason);
    }
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      throw new GenerationError("blocked", "SAFETY");
    }
    const text = (candidate?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    if (!text) throw new GenerationError("empty", "Model returned no text");
    return { text, model };
  }

  throw new GenerationError("unavailable", `All models busy (last status ${lastStatus})`);
}
```

- [ ] **Step 4: Run** `npm test` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/lib && git commit -m "Add Gemini client with model fallback"`

---

### Task 5: Database migration

**Files:** Create `supabase/migrations/20261006000000_observatory.sql`

- [ ] **Step 1: List existing public tables** (Supabase SQL editor) so every one gets RLS:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
```

Expected: `planets`, `profiles` (if others exist, add an RLS block for each in Step 2).

- [ ] **Step 2: Write the migration**

```sql
-- Week 4: Earth Observatory. Additive only — Assignment 3 keeps working.

-- ── Daily anomalies ─────────────────────────────────────────────
create table if not exists public.anomalies (
  date    date primary key,
  subject text not null,
  blurb   text
);

-- Cycle 20 subjects across the rest of the term (one per New York day).
insert into public.anomalies (date, subject, blurb)
select g.d::date, s.subject, s.blurb
from generate_series('2026-10-01'::date, '2027-05-31'::date, interval '1 day') with ordinality as g(d, n)
join (values
  (1,  'the Halal cart line',            'Humans queue for an hour for rice. Investigate.'),
  (2,  'bodega cats',                    'Small furry guardians of the 24-hour stores.'),
  (3,  'the 1 train at 8am',             'A metal tube holding far more humans than physics allows.'),
  (4,  'the Low Steps at lunch',         'Hundreds of humans sit on stairs on purpose.'),
  (5,  'Butler Library at 2am',          'Lights on. Humans inside. Why?'),
  (6,  'dining hall mystery meat',       'Identify the specimen.'),
  (7,  'Central Park squirrels',         'Locals with no fear and strong opinions.'),
  (8,  'the M4 bus',                     'Slower than walking. Humans board anyway.'),
  (9,  'a Brooklyn brunch line',         'Weekend migration ritual. Two-hour wait for eggs.'),
  (10, 'Times Square costume characters','Large plush beings demanding tips.'),
  (11, 'dorm laundry rooms',             'Machines that eat single socks.'),
  (12, 'Midwest vs NYC pizza',           'A dispute older than the city itself.'),
  (13, 'subway performers',              'Showtime. Brace for impact.'),
  (14, 'the first cold day in NYC',      'Every human suddenly owns a long black coat.'),
  (15, 'Trader Joe''s on a Sunday',      'The line wraps around the planet.'),
  (16, 'rats on the subway tracks',      'The true residents of the city.'),
  (17, 'Columbia tour groups',           'Visitors following a human walking backwards.'),
  (18, 'Sweetgreen at noon',             'Salad, ordered by app, collected in silence.'),
  (19, 'the Hudson River sunset',        'Humans stop moving and point devices at the sky.'),
  (20, 'midterms week',                  'Collective stress detected across campus.')
) as s(i, subject, blurb) on s.i = ((g.n - 1) % 20) + 1
on conflict (date) do nothing;

-- ── Reports (AI generations) ───────────────────────────────────
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('field_note', 'exoplanet', 'transmission')),
  subject      text not null check (char_length(subject) <= 140),
  prompt       text not null,
  model        text not null,
  body         text not null,
  image_url    text,
  anomaly_date date references public.anomalies (date),
  created_at   timestamptz not null default now()
);
create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_user_idx on public.reports (user_id, created_at desc);

-- ── Votes ──────────────────────────────────────────────────────
create table if not exists public.votes (
  report_id  uuid not null references public.reports (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ── Public feed view ───────────────────────────────────────────
-- Runs with the owner's rights (no security_invoker) on purpose: it exposes only vote
-- totals and the author's first name/photo, while votes and profiles stay owner-only.
create or replace view public.report_feed as
select
  r.id, r.user_id, r.kind, r.subject, r.body, r.prompt, r.model, r.image_url,
  r.anomaly_date, r.created_at,
  coalesce(sum(v.value), 0)::int                          as score,
  count(*) filter (where v.value = 1)::int                as upvotes,
  count(*) filter (where v.value = -1)::int               as downvotes,
  p.first_name                                            as author_name,
  p.avatar_url                                            as author_avatar
from public.reports r
left join public.votes v on v.report_id = r.id
left join public.profiles p on p.id = r.user_id
group by r.id, p.first_name, p.avatar_url;

-- ── RLS ────────────────────────────────────────────────────────
alter table public.anomalies enable row level security;
alter table public.reports   enable row level security;
alter table public.votes     enable row level security;
alter table public.planets   enable row level security;
alter table public.profiles  enable row level security;  -- already on; kept for completeness

drop policy if exists "Anyone can read planets" on public.planets;
create policy "Anyone can read planets" on public.planets for select using (true);

drop policy if exists "Anyone can read anomalies" on public.anomalies;
create policy "Anyone can read anomalies" on public.anomalies for select using (true);

drop policy if exists "Anyone can read reports" on public.reports;
create policy "Anyone can read reports" on public.reports for select using (true);

drop policy if exists "Users create their own reports" on public.reports;
create policy "Users create their own reports" on public.reports
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users see their own votes" on public.votes;
create policy "Users see their own votes" on public.votes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users cast their own votes" on public.votes;
create policy "Users cast their own votes" on public.votes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users change their own votes" on public.votes;
create policy "Users change their own votes" on public.votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users remove their own votes" on public.votes;
create policy "Users remove their own votes" on public.votes
  for delete to authenticated using (user_id = auth.uid());

-- Table privileges (this project does not auto-grant to API roles).
grant select on public.planets, public.anomalies, public.reports, public.report_feed to anon, authenticated;
grant insert on public.reports to authenticated;
grant select, insert, update, delete on public.votes to authenticated;

-- ── Storage: report photos ─────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do nothing;

drop policy if exists "Report photos are publicly readable" on storage.objects;
create policy "Report photos are publicly readable"
  on storage.objects for select using (bucket_id = 'reports');

drop policy if exists "Users upload report photos to their folder" on storage.objects;
create policy "Users upload report photos to their folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 3: Run it** in the Supabase SQL editor (with the user's go-ahead). Expected: "Success. No rows returned."

- [ ] **Step 4: Verify RLS with the anon key** (from repo root, `set -a; source .env.local; set +a` first):

```bash
H=(-H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY")
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/report_feed?select=id&limit=1" "${H[@]}"       # → []
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/planets?select=name&limit=1" "${H[@]}"         # → [{"name":"Mercury"}]
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/anomalies?select=subject&date=eq.2026-10-06" "${H[@]}"  # → 1 row
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/votes?select=*" "${H[@]}"                      # → permission denied
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/reports" "${H[@]}" -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000","kind":"field_note","subject":"x","prompt":"x","model":"x","body":"x"}'  # → permission denied / RLS error
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles?select=*" "${H[@]}"                   # → permission denied
```

- [ ] **Step 5: Commit** — `git add supabase && git commit -m "Add Observatory tables, feed view, and RLS"`

---

### Task 6: Server data helpers

**Files:** Create `src/lib/observatory-server.ts`

- [ ] **Step 1: Implement**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { nyDate, type Anomaly, type FeedReport, type ReportKind, type Vote } from "@/lib/observatory";

export type FeedSort = "top" | "new" | "all";

/** Today's anomaly in New York; falls back to the most recent one if today has none. */
export async function getTodayAnomaly(supabase: SupabaseClient): Promise<Anomaly | null> {
  const { data } = await supabase
    .from("anomalies")
    .select("date, subject, blurb")
    .lte("date", nyDate())
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle<Anomaly>();
  return data;
}

export async function getFeed(
  supabase: SupabaseClient,
  { sort, kind, limit = 50 }: { sort: FeedSort; kind?: ReportKind; limit?: number },
) {
  let q = supabase.from("report_feed").select("*");
  if (kind) q = q.eq("kind", kind);
  if (sort === "top") {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    q = q.gte("created_at", since).order("score", { ascending: false });
  } else if (sort === "all") {
    q = q.order("score", { ascending: false });
  }
  q = q.order("created_at", { ascending: false }).limit(limit);
  return q.returns<FeedReport[]>();
}

export async function getReport(supabase: SupabaseClient, id: string) {
  return supabase.from("report_feed").select("*").eq("id", id).maybeSingle<FeedReport>();
}

/** The signed-in user's votes on the given reports, as { reportId: -1 | 1 }. */
export async function getMyVotes(
  supabase: SupabaseClient,
  userId: string | undefined,
  reportIds: string[],
): Promise<Record<string, Vote>> {
  if (!userId || reportIds.length === 0) return {};
  const { data } = await supabase
    .from("votes")
    .select("report_id, value")
    .eq("user_id", userId)
    .in("report_id", reportIds);
  return Object.fromEntries((data ?? []).map((v) => [v.report_id, v.value as Vote]));
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → no errors.

- [ ] **Step 3: Commit** — `git commit -am "Add Observatory data helpers"` (after `git add src/lib/observatory-server.ts`)

---

### Task 7: Generate endpoint

**Files:** Create `src/app/api/generate/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isReportKind } from "@/lib/observatory";
import { buildPrompt } from "@/lib/prompts";
import { generateReport, GenerationError } from "@/lib/gemini";
import { getTodayAnomaly } from "@/lib/observatory-server";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const HOURLY_LIMIT = 10;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, "Sign in to transmit reports.");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(500, "The Observatory's antenna isn't configured (missing GEMINI_API_KEY).");

  const form = await request.formData();
  const kind = form.get("kind");
  if (!isReportKind(kind)) return fail(400, "Pick a report type.");

  const useAnomaly = form.get("useAnomaly") === "true";
  let subject = String(form.get("subject") ?? "").trim().slice(0, 140);
  const file = form.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;

  if (image && !image.type.startsWith("image/")) return fail(400, "That file isn't an image.");
  if (image && image.size > MAX_IMAGE_BYTES) return fail(400, "Photos must be under 4 MB.");
  if (kind === "transmission" && !image) return fail(400, "Transmissions need a photo.");

  const anomaly = useAnomaly ? await getTodayAnomaly(supabase) : null;
  if (!subject && anomaly) subject = anomaly.subject;
  if (!subject && kind !== "transmission") return fail(400, "Tell the Observatory what to study.");

  // Rate limit: protects the free Gemini quota.
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return fail(429, "Signal jammed — you've sent 10 reports this hour. Try again later.");
  }

  const prompt = buildPrompt({ kind, subject, anomaly: anomaly?.subject, hasImage: !!image });
  const bytes = image ? Buffer.from(await image.arrayBuffer()) : null;

  let result;
  try {
    result = await generateReport({
      system: prompt.system,
      user: prompt.user,
      apiKey,
      image: bytes && image ? { mimeType: image.type, base64: bytes.toString("base64") } : undefined,
    });
  } catch (e) {
    if (e instanceof GenerationError && e.reason === "blocked") {
      return fail(422, "The mothership refused that one. Try a different subject or photo.");
    }
    return fail(503, "Transmission lost — the AI is busy. Try again in a moment.");
  }

  // Upload only after a successful generation, so failed attempts leave nothing behind.
  let imageUrl: string | null = null;
  if (bytes && image) {
    const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("reports")
      .upload(path, bytes, { contentType: image.type });
    if (error) return fail(500, `Photo upload failed: ${error.message}`);
    imageUrl = supabase.storage.from("reports").getPublicUrl(path).data.publicUrl;
  }

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      kind,
      subject: subject || "Untitled photo",
      prompt: prompt.stored,
      model: result.model,
      body: result.text,
      image_url: imageUrl,
      anomaly_date: anomaly?.date ?? null,
    })
    .select("id")
    .single();
  if (error) return fail(500, `Couldn't save the report: ${error.message}`);

  return NextResponse.json({ id: report.id, body: result.text, model: result.model, imageUrl, subject });
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`.

- [ ] **Step 3: Smoke test signed-out** — `curl -s -X POST localhost:3000/api/generate -F kind=field_note -F subject=test` → `{"error":"Sign in to transmit reports."}` (401).

- [ ] **Step 4: Commit** — `git add src/app/api && git commit -m "Add report generation endpoint"`

---

### Task 8: Voting (action + buttons)

**Files:** Create `src/app/observatory/actions.ts`, `src/app/observatory/VoteButtons.tsx`

- [ ] **Step 1: `actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase-server";
import { nextVote, type Vote } from "@/lib/observatory";

export async function castVote(reportId: string, clicked: 1 | -1) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to vote." };

  const { data: existing } = await supabase
    .from("votes")
    .select("value")
    .eq("report_id", reportId)
    .eq("user_id", user.id)
    .maybeSingle<{ value: Vote }>();

  const next = nextVote(existing?.value ?? 0, clicked);
  const { error } =
    next === 0
      ? await supabase.from("votes").delete().eq("report_id", reportId).eq("user_id", user.id)
      : await supabase
          .from("votes")
          .upsert({ report_id: reportId, user_id: user.id, value: next });
  if (error) return { error: error.message };

  const { data: row } = await supabase
    .from("report_feed")
    .select("score")
    .eq("id", reportId)
    .single<{ score: number }>();

  revalidatePath("/observatory");
  revalidatePath("/mission-control");
  return { score: row?.score ?? 0, myVote: next };
}
```

- [ ] **Step 2: `VoteButtons.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { nextVote, type Vote } from "@/lib/observatory";
import { castVote } from "./actions";

export default function VoteButtons({
  reportId, score, myVote, signedIn,
}: { reportId: string; score: number; myVote: Vote; signedIn: boolean }) {
  const [state, setState] = useState({ score, myVote });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="flex items-center gap-3 font-mono text-xs">
        <span className="text-white/70 tabular-nums">{score > 0 ? `+${score}` : score}</span>
        <Link href="/login" className="rounded-full border border-[#e9c46a]/40 px-3 py-1 tracking-[0.15em] text-[#f4dfa6] uppercase hover:bg-[#e9c46a]/10">
          Sign in to vote
        </Link>
      </div>
    );
  }

  function vote(clicked: 1 | -1) {
    const prev = state;
    const mine = nextVote(prev.myVote, clicked);
    setState({ score: prev.score - prev.myVote + mine, myVote: mine }); // optimistic
    setError(null);
    startTransition(async () => {
      const res = await castVote(reportId, clicked);
      if ("error" in res) {
        setState(prev);
        setError(res.error ?? "Vote failed");
      } else {
        setState({ score: res.score, myVote: res.myVote });
      }
    });
  }

  const btn = (active: boolean, color: string) =>
    `flex h-8 w-8 items-center justify-center rounded-full border text-sm transition disabled:opacity-60 ${
      active ? `${color} text-[#050505]` : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
    }`;

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <button aria-label="Upvote" aria-pressed={state.myVote === 1} disabled={pending}
        onClick={() => vote(1)} className={btn(state.myVote === 1, "border-[#7ee2a8] bg-[#7ee2a8]")}>▲</button>
      <span className="w-8 text-center text-white tabular-nums">
        {state.score > 0 ? `+${state.score}` : state.score}
      </span>
      <button aria-label="Downvote" aria-pressed={state.myVote === -1} disabled={pending}
        onClick={() => vote(-1)} className={btn(state.myVote === -1, "border-[#e98a6a] bg-[#e98a6a]")}>▼</button>
      {error && <span className="text-red-300">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint** — `npx tsc --noEmit && npm run lint`.

- [ ] **Step 4: Commit** — `git add src/app/observatory && git commit -m "Add voting"`

---

### Task 9: Feed page

**Files:** Create `src/app/observatory/ReportCard.tsx`, `src/app/observatory/HowItWorks.tsx`, `src/app/observatory/page.tsx`

- [ ] **Step 1: `ReportCard.tsx`**

```tsx
import Link from "next/link";
import { kindInfo, timeAgo, type FeedReport, type Vote } from "@/lib/observatory";
import VoteButtons from "./VoteButtons";

export default function ReportCard({
  report, myVote, signedIn, linkToDetail = true,
}: { report: FeedReport; myVote: Vote; signedIn: boolean; linkToDetail?: boolean }) {
  const kind = kindInfo(report.kind);
  return (
    <article className="hud-panel flex flex-col gap-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.2em] uppercase">
        <span className="text-[#e9c46a]/80">{kind.icon} {kind.label}</span>
        {report.anomaly_date && <span className="rounded-full border border-[#7ee2a8]/40 px-2 py-0.5 text-[#7ee2a8]">Daily anomaly</span>}
      </header>

      <h2 className="text-lg font-bold text-white">{report.subject}</h2>

      {report.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={report.image_url} alt={`Photo for ${report.subject}`} className="max-h-80 w-full rounded-lg border border-white/10 object-cover" />
      )}

      <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/80">{report.body}</p>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 text-xs text-white/40">
          {report.author_avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.author_avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
          )}
          <span>Agent {report.author_name ?? "Unknown"}</span>
          <span>·</span>
          {linkToDetail ? (
            <Link href={`/observatory/${report.id}`} className="hover:text-white/70">{timeAgo(report.created_at)}</Link>
          ) : (
            <span>{timeAgo(report.created_at)}</span>
          )}
        </div>
        <VoteButtons reportId={report.id} score={report.score} myVote={myVote} signedIn={signedIn} />
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: `HowItWorks.tsx`**

```tsx
"use client";

import { useSyncExternalStore } from "react";

const KEY = "observatory:how-it-works-dismissed";
const listeners = new Set<() => void>();

function read() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export default function HowItWorks() {
  const dismissed = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => false,
  );
  if (dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch {}
    listeners.forEach((l) => l());
  }

  const steps = [
    ["1 · Pick a report", "Field Note (something humans do), Exoplanet (a NYC place), or Transmission (a photo)."],
    ["2 · Transmit", "Our AI alien researcher writes it up. Every report and the exact prompt are saved."],
    ["3 · Vote", "Upvote the reports that make you laugh. The best one on today's anomaly becomes Discovery of the Day."],
  ];

  return (
    <section className="hud-panel flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
        <span>How the Observatory works</span>
        <button onClick={dismiss} className="hover:text-white/80">Dismiss ✕</button>
      </header>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map(([title, text]) => (
          <li key={title} className="flex flex-col gap-1">
            <span className="text-sm font-bold text-[#f4dfa6]">{title}</span>
            <span className="text-sm text-white/60">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 3: `page.tsx`**

```tsx
import Link from "next/link";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { KINDS, isReportKind } from "@/lib/observatory";
import { getFeed, getMyVotes, getTodayAnomaly, type FeedSort } from "@/lib/observatory-server";
import HowItWorks from "./HowItWorks";
import ReportCard from "./ReportCard";

const SORTS: { id: FeedSort; label: string }[] = [
  { id: "top", label: "Today's top" },
  { id: "new", label: "New" },
  { id: "all", label: "All-time" },
];

export default async function ObservatoryPage({ searchParams }: PageProps<"/observatory">) {
  const params = await searchParams;
  const sort = (SORTS.find((s) => s.id === params.sort)?.id ?? "top") as FeedSort;
  const kind = isReportKind(params.kind) ? params.kind : undefined;

  const { supabase, user } = await getUserAndProfile();
  const [anomaly, { data: reports, error }] = await Promise.all([
    getTodayAnomaly(supabase),
    getFeed(supabase, { sort, kind }),
  ]);
  const myVotes = await getMyVotes(supabase, user?.id, (reports ?? []).map((r) => r.id));

  const href = (next: { sort?: string; kind?: string | null }) => {
    const q = new URLSearchParams();
    const s = next.sort ?? sort;
    const k = next.kind === null ? undefined : (next.kind ?? kind);
    if (s !== "top") q.set("sort", s);
    if (k) q.set("kind", k);
    const str = q.toString();
    return `/observatory${str ? `?${str}` : ""}`;
  };

  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 font-mono text-[11px] tracking-[0.15em] uppercase transition ${
      active ? "bg-[#e9c46a]/20 text-[#f4dfa6] border border-[#e9c46a]/50" : "border border-white/10 text-white/50 hover:text-white/80"
    }`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={70} />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#7ee2a8] uppercase">Studying Earth since 2026</p>
          <h1 className="text-3xl font-bold tracking-wide text-white sm:text-4xl" style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}>
            The Earth Observatory
          </h1>
          <p className="text-sm text-white/60">
            Alien researchers file reports on New York and Columbia. You decide which ones are true science.
          </p>
        </div>

        <HowItWorks />

        {anomaly && (
          <section className="hud-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.25em] text-[#7ee2a8] uppercase">Today&apos;s anomaly</span>
              <span className="text-xl font-bold text-white">{anomaly.subject}</span>
              {anomaly.blurb && <span className="text-sm text-white/50">{anomaly.blurb}</span>}
            </div>
            <Link
              href={user ? "/observatory/new?anomaly=1" : "/login"}
              className="cta-glow shrink-0 rounded-full border border-[#e9c46a]/70 bg-[#e9c46a]/15 px-6 py-2.5 text-center text-xs font-bold tracking-[0.2em] text-[#f4dfa6] uppercase hover:bg-[#e9c46a]/25"
            >
              {user ? "Investigate it →" : "Sign in to investigate"}
            </Link>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <Link key={s.id} href={href({ sort: s.id })} className={tab(s.id === sort)}>{s.label}</Link>
            ))}
          </nav>
          {user ? (
            <Link href="/observatory/new" className="rounded-full bg-[#f4dfa6] px-5 py-2 text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-white">
              + New report
            </Link>
          ) : null}
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link href={href({ kind: null })} className={tab(!kind)}>All types</Link>
          {KINDS.map((k) => (
            <Link key={k.id} href={href({ kind: k.id })} className={tab(kind === k.id)} title={k.blurb}>
              {k.icon} {k.label}
            </Link>
          ))}
        </nav>

        {error && <p className="text-sm text-red-300">Couldn&apos;t load reports: {error.message}</p>}

        {reports && reports.length === 0 && (
          <div className="hud-panel flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-white/70">
              {sort === "top" ? "No reports in the last 24 hours." : "No reports yet."} Be the first to transmit.
            </p>
            <Link href={user ? "/observatory/new" : "/login"} className="font-mono text-xs tracking-[0.2em] text-[#f4dfa6] uppercase hover:text-white">
              {user ? "Write a report →" : "Sign in to write one →"}
            </Link>
          </div>
        )}

        {reports?.map((r) => (
          <ReportCard key={r.id} report={r} myVote={myVotes[r.id] ?? 0} signedIn={!!user} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Build** — `npm run build` (generates `PageProps<"/observatory">` types) → succeeds.

- [ ] **Step 5: Commit** — `git add src/app/observatory && git commit -m "Add Observatory feed"`

---

### Task 10: Create page

**Files:** Create `src/app/observatory/new/page.tsx`, `src/app/observatory/new/CreateReport.tsx`; Modify `src/proxy.ts`

- [ ] **Step 1: Protect the route** — in `src/proxy.ts` change
  `const PROTECTED = ["/mission-control", "/profile", "/welcome"];` to
  `const PROTECTED = ["/mission-control", "/profile", "/welcome", "/observatory/new"];`

- [ ] **Step 2: `new/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { needsName } from "@/lib/supabase";
import { getTodayAnomaly } from "@/lib/observatory-server";
import CreateReport from "./CreateReport";

export const maxDuration = 60;

export default async function NewReportPage({ searchParams }: PageProps<"/observatory/new">) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (needsName(profile)) redirect("/welcome");
  const anomaly = await getTodayAnomaly(supabase);
  const { anomaly: fromAnomaly } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={60} />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#7ee2a8] uppercase">New report · Agent {profile?.first_name}</p>
          <h1 className="text-3xl font-bold text-white">File a report</h1>
          <p className="text-sm text-white/60">
            Choose what kind of report to file, tell the alien researcher what to study, and hit Transmit.
            Gemini writes it; it&apos;s saved with the exact prompt and posted to the Observatory for voting.
          </p>
        </div>
        <CreateReport anomaly={anomaly} startWithAnomaly={fromAnomaly === "1"} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `new/CreateReport.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { KINDS, kindInfo, type Anomaly, type ReportKind } from "@/lib/observatory";

type Result = { id: string; body: string; model: string; imageUrl: string | null; subject: string };

// Shrink photos in the browser: faster uploads and under Vercel's 4.5 MB request limit.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read image"))), "image/jpeg", 0.85),
  );
}

export default function CreateReport({ anomaly, startWithAnomaly }: { anomaly: Anomaly | null; startWithAnomaly: boolean }) {
  const [kind, setKind] = useState<ReportKind>("field_note");
  const [useAnomaly, setUseAnomaly] = useState(startWithAnomaly && !!anomaly);
  const [subject, setSubject] = useState(startWithAnomaly && anomaly ? anomaly.subject : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const info = kindInfo(kind);

  function toggleAnomaly(on: boolean) {
    setUseAnomaly(on);
    if (on && anomaly) setSubject(anomaly.subject);
    if (!on && anomaly && subject === anomaly.subject) setSubject("");
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Please choose an image file.");
    setError(null);
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  async function transmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (info.photo === "required" && !photo) return setError("Transmissions need a photo.");
    if (!subject.trim() && kind !== "transmission") return setError("Tell the Observatory what to study.");

    setBusy(true);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("subject", subject);
      form.set("useAnomaly", String(useAnomaly));
      if (photo) form.set("image", await shrink(photo), "photo.jpg");
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transmission lost — try again.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transmission lost — try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setSubject("");
    setPhoto(null);
    setPreview(null);
    setUseAnomaly(false);
  }

  if (result) {
    return (
      <section className="hud-panel flex flex-col gap-4 p-6">
        <span className="font-mono text-[10px] tracking-[0.25em] text-[#7ee2a8] uppercase">Report received · {info.label}</span>
        <h2 className="text-xl font-bold text-white">{result.subject}</h2>
        {result.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.imageUrl} alt="" className="max-h-80 w-full rounded-lg object-cover" />
        )}
        <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/85">{result.body}</p>
        <p className="font-mono text-[10px] text-white/30">Written by {result.model} · saved with its prompt</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/observatory/${result.id}`} className="rounded-full bg-[#f4dfa6] px-5 py-2 text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-white">View & share</Link>
          <Link href="/observatory?sort=new" className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">See it in the feed</Link>
          <button onClick={reset} className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">File another</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={transmit} className="flex flex-col gap-5">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">1 · Report type</legend>
        {KINDS.map((k) => (
          <label key={k.id} className={`hud-panel flex cursor-pointer flex-col gap-1.5 p-4 transition ${kind === k.id ? "border-[#e9c46a]/60 bg-[#e9c46a]/10" : "hover:bg-white/5"}`}>
            <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
            <span className="text-base font-bold text-white">{k.icon} {k.label}</span>
            <span className="text-xs text-white/60">{k.blurb}</span>
            <span className="text-xs text-white/35 italic">e.g. {k.example}</span>
            <span className="mt-1 font-mono text-[10px] tracking-[0.15em] text-[#e9c46a]/70 uppercase">Photo {k.photo}</span>
          </label>
        ))}
      </fieldset>

      <div className="hud-panel flex flex-col gap-4 p-5">
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">2 · What should the alien study?</span>
        {anomaly && (
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={useAnomaly} onChange={(e) => toggleAnomaly(e.target.checked)} className="h-4 w-4 accent-[#7ee2a8]" />
            Use today&apos;s anomaly: <strong className="text-white">{anomaly.subject}</strong>
          </label>
        )}
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder={info.placeholder}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#e9c46a]/60" />
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-dashed border-white/25 px-4 py-2 text-xs tracking-[0.1em] text-white/60 uppercase hover:border-white/50 hover:text-white">
            {photo ? "Change photo" : `Add photo (${info.photo})`}
          </button>
          {preview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="text-xs text-white/40 hover:text-white">Remove</button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <button type="submit" disabled={busy}
        className="cta-glow rounded-full bg-[#f4dfa6] px-8 py-4 text-sm font-bold tracking-[0.3em] text-[#1a1408] uppercase transition hover:bg-white disabled:opacity-60">
        {busy ? "Transmitting… (up to 30s)" : "3 · Transmit"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Build** — `npm run build` → succeeds.

- [ ] **Step 5: Commit** — `git add src && git commit -m "Add report creation page"`

---

### Task 11: Report detail page

**Files:** Create `src/app/observatory/[id]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { getMyVotes, getReport } from "@/lib/observatory-server";
import ReportCard from "../ReportCard";

export default async function ReportPage({ params }: PageProps<"/observatory/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user } = await getUserAndProfile();
  const { data: report } = await getReport(supabase, id);
  if (!report) notFound();
  const myVotes = await getMyVotes(supabase, user?.id, [report.id]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={60} />
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
        <Link href="/observatory" className="font-mono text-xs tracking-[0.2em] text-white/40 uppercase hover:text-white/70">&larr; Observatory</Link>
        <ReportCard report={report} myVote={myVotes[report.id] ?? 0} signedIn={!!user} linkToDetail={false} />
        <details className="hud-panel p-5">
          <summary className="cursor-pointer font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase hover:text-white">
            View the prompt sent to the AI
          </summary>
          <p className="mt-4 font-mono text-[10px] tracking-[0.15em] text-[#e9c46a]/70 uppercase">Model: {report.model}</p>
          <pre className="mt-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-white/60">{report.prompt}</pre>
        </details>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build** — `npm run build`.

- [ ] **Step 3: Commit** — `git add src/app/observatory && git commit -m "Add report detail page with prompt viewer"`

---

### Task 12: Mission Control panels + navigation

**Files:** Modify `src/app/mission-control/page.tsx`, `src/components/AuthNav.tsx`, `src/app/HelloWorld.tsx`

- [ ] **Step 1: Mission Control data** — in `page.tsx`, after the planets query add:

```tsx
  const anomaly = await getTodayAnomaly(supabase);
  const [{ data: discovery }, { data: myReports }] = await Promise.all([
    anomaly
      ? supabase.from("report_feed").select("*").eq("anomaly_date", anomaly.date)
          .order("score", { ascending: false }).order("created_at", { ascending: true })
          .limit(1).maybeSingle<FeedReport>()
      : Promise.resolve({ data: null }),
    supabase.from("report_feed").select("id, subject, kind, score, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(4)
      .returns<Pick<FeedReport, "id" | "subject" | "kind" | "score" | "created_at">[]>(),
  ]);
```

with imports `import { getTodayAnomaly } from "@/lib/observatory-server";` and
`import { kindInfo, type FeedReport } from "@/lib/observatory";`.

- [ ] **Step 2: Mission Control panels** — inside the grid, before the Orbital tracking panel, add:

```tsx
          <HudPanel label="Discovery of the day" code={anomaly ? anomaly.date : "—"} className="lg:col-span-2">
            {anomaly && (
              <p className="font-mono text-xs text-white/50">
                Today&apos;s anomaly: <span className="text-white">{anomaly.subject}</span>
              </p>
            )}
            {discovery ? (
              <Link href={`/observatory/${discovery.id}`} className="group flex flex-col gap-2">
                <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/80 line-clamp-5 group-hover:text-white">{discovery.body}</p>
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#e9c46a]/70 uppercase">
                  {kindInfo(discovery.kind).label} · Agent {discovery.author_name ?? "Unknown"} · {discovery.score > 0 ? `+${discovery.score}` : discovery.score} votes
                </p>
              </Link>
            ) : (
              <p className="text-sm text-white/50">No one has investigated today&apos;s anomaly yet. Be the first.</p>
            )}
            <Link href="/observatory/new?anomaly=1" className="mt-auto font-mono text-[10px] tracking-[0.25em] text-[#f4dfa6] uppercase hover:text-white">
              Investigate the anomaly &rarr;
            </Link>
          </HudPanel>

          <HudPanel label="My reports" code={`${myReports?.length ?? 0} recent`}>
            {myReports && myReports.length > 0 ? (
              <ul className="flex flex-col gap-2 font-mono text-xs">
                {myReports.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <Link href={`/observatory/${r.id}`} className="truncate text-white/70 hover:text-white">{kindInfo(r.kind).icon} {r.subject}</Link>
                    <span className="shrink-0 text-white/50 tabular-nums">{r.score > 0 ? `+${r.score}` : r.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/50">You haven&apos;t filed any reports yet.</p>
            )}
            <Link href="/observatory" className="mt-auto font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase hover:text-white/70">
              Open the Observatory &rarr;
            </Link>
          </HudPanel>
```

Also add a line to the mission log array: `` `Observatory online — today's anomaly: ${anomaly?.subject ?? "none"}`, `` before the welcome line.

- [ ] **Step 3: Header link** — in `AuthNav.tsx`, render
  `<Link href="/observatory" className={linkClass}>observatory</Link>` as the first child of
  `<nav>` (both signed-in and signed-out states).

- [ ] **Step 4: Home link** — in `HelloWorld.tsx`, add before the "view the planets" link:

```tsx
        <Link
          href="/observatory"
          className="text-xs tracking-[0.2em] text-[#f4dfa6]/70 uppercase transition hover:text-[#f4dfa6]"
        >
          ✦ the earth observatory: rate alien reports on nyc &rarr;
        </Link>
```

- [ ] **Step 5: Build + lint** — `npm run lint && npm run build`.

- [ ] **Step 6: Commit** — `git add src && git commit -m "Link the Observatory from Mission Control, header, and home"`

---

### Task 13: End-to-end verification

- [ ] **Step 1:** `npm test && npm run lint && npm run build` — all pass.
- [ ] **Step 2:** Run Task 5 Step 4 RLS curl checks again — same expected results.
- [ ] **Step 3:** In Chrome on `localhost:3000`, signed in: create a Field Note, an Exoplanet with the anomaly toggle, and a Transmission with a photo; each shows a result and appears under "New".
- [ ] **Step 4:** Vote ▲ on a report → score +1 and button lit; click ▲ again → back to 0; click ▼ → −1. Reload → state persists.
- [ ] **Step 5:** Detail page → "View the prompt" shows system + user prompt and model.
- [ ] **Step 6:** Sign out → feed readable, buttons read "Sign in to vote", `/observatory/new` redirects to `/login`.
- [ ] **Step 7:** Mission Control shows Discovery of the Day and My reports.
- [ ] **Step 8:** Push; confirm Vercel has `GEMINI_API_KEY`; on the new commit URL, generate one report. Confirm the Assignment 3 commit URL still loads planets.
