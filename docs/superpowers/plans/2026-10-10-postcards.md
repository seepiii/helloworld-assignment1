# Postcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `postcard` report type: a subject (text/photo) teleported to a planet, rendered as an image by Pollinations from a Gemini-written prompt, saved and voteable, with a passport on Mission Control.

**Architecture:** New Route Handler `/api/teleport` mirrors `/api/generate`; shared request guards move to `src/lib/report-guard.ts`. Gemini runs in JSON mode to return `{title, caption, image_prompt}`; `src/lib/pollinations.ts` fetches the image; bytes go to the existing `reports` Storage bucket. DB change is additive (new kind, two columns, view recreated).

**Tech Stack:** Next.js 16, Supabase, Gemini REST (JSON mode), Pollinations.ai, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-postcards-design.md`

---

### Task 1: Destinations

**Files:** Create `src/lib/destinations.ts`; Test `src/lib/__tests__/destinations.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { DESTINATIONS, getDestination } from "../destinations";

describe("destinations", () => {
  it("has the 8 planets plus the alien homeworld", () => {
    expect(DESTINATIONS).toHaveLength(9);
    expect(DESTINATIONS.filter((d) => d.fictional).map((d) => d.id)).toEqual(["xylo-7"]);
  });
  it("has unique ids", () =>
    expect(new Set(DESTINATIONS.map((d) => d.id)).size).toBe(DESTINATIONS.length));
  it("looks destinations up by id", () => {
    expect(getDestination("mars")?.name).toBe("Mars");
    expect(getDestination("pluto")).toBeNull();
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
export type Destination = {
  id: string;
  name: string;
  gravity: number; // × Earth; real planets are refreshed from the planets table at request time
  color: string;
  blurb: string; // shown on the destination button
  look: string; // fed to the image prompt
  fictional?: boolean;
};

export const DESTINATIONS: Destination[] = [
  { id: "mercury", name: "Mercury", gravity: 0.38, color: "#b8b2a7",
    blurb: "Scorching days, freezing nights, no air.",
    look: "a scorched grey cratered plain under a black sky, an enormous blinding Sun filling the horizon" },
  { id: "venus", name: "Venus", gravity: 0.91, color: "#e8cf9a",
    blurb: "Hot enough to melt lead, under acid clouds.",
    look: "a glowing volcanic plain under thick yellow-orange sulfuric clouds, heavy orange haze, everything slightly melting" },
  { id: "earth", name: "Earth", gravity: 1, color: "#6fa8dc",
    blurb: "Earth, as the aliens imagine it.",
    look: "Earth as imagined by an alien who has only seen postcards: oversaturated colors, slightly wrong proportions, too many pigeons" },
  { id: "mars", name: "Mars", gravity: 0.38, color: "#d7735a",
    blurb: "Red dust everywhere. Two tiny moons.",
    look: "a rust-red dusty desert under a pale butterscotch sky, a small distant Sun, two tiny moons, low-gravity dust drifting" },
  { id: "jupiter", name: "Jupiter", gravity: 2.53, color: "#d9b38c",
    blurb: "No ground, crushing gravity, a giant storm.",
    look: "floating among swirling orange and cream cloud bands, the Great Red Spot looming enormous in the sky, everything squashed by heavy gravity" },
  { id: "saturn", name: "Saturn", gravity: 1.06, color: "#e9c46a",
    blurb: "The rings fill the whole sky.",
    look: "a pale golden haze with Saturn's gigantic rings arching across the entire sky, glittering ice particles drifting" },
  { id: "uranus", name: "Uranus", gravity: 0.92, color: "#9fd9d9",
    blurb: "Tipped on its side. Smells like rotten eggs.",
    look: "pale cyan icy fog, faint vertical rings, the whole horizon tilted sideways, frost on everything" },
  { id: "neptune", name: "Neptune", gravity: 1.19, color: "#6d8fe0",
    blurb: "Deep blue, freezing, the fastest winds.",
    look: "a deep cobalt-blue frozen world, supersonic winds whipping white methane clouds, a dark storm spiral overhead" },
  { id: "xylo-7", name: "Xylo-7", gravity: 0.7, color: "#c08cff", fictional: true,
    blurb: "The aliens' homeworld. They'd love a visit.",
    look: "the alien homeworld: bioluminescent purple jungles, three suns of different colors, floating crystal towers, curious tentacled locals" },
];

export function getDestination(id: unknown): Destination | null {
  return DESTINATIONS.find((d) => d.id === id) ?? null;
}
```

- [ ] **Step 4:** `npm test` → PASS. **Step 5:** commit "Add teleport destinations".

---

### Task 2: Postcard prompt + parser

**Files:** Create `src/lib/postcards.ts`; Test `src/lib/__tests__/postcards.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildPostcardPrompt, parsePostcard } from "../postcards";
import { getDestination } from "../destinations";

const jupiter = getDestination("jupiter")!;

describe("buildPostcardPrompt", () => {
  it("includes the destination, its real gravity, and its look", () => {
    const p = buildPostcardPrompt({ subject: "bodega cat", destination: jupiter, facts: { gravity: 2.53 } });
    expect(p.user).toContain("Jupiter");
    expect(p.user).toContain("2.53");
    expect(p.user).toContain("Great Red Spot");
    expect(p.user).toContain("bodega cat");
    expect(p.stored).toContain(p.system);
  });
  it("notes the fictional homeworld", () => {
    const p = buildPostcardPrompt({ subject: "x", destination: getDestination("xylo-7")!, facts: { gravity: 0.7 } });
    expect(p.user).toContain("fictional");
  });
  it("asks the model to describe an attached photo", () => {
    const p = buildPostcardPrompt({ subject: "", destination: jupiter, facts: { gravity: 2.53 }, hasImage: true });
    expect(p.user).toContain("photo");
  });
});

describe("parsePostcard", () => {
  it("parses the JSON reply", () =>
    expect(parsePostcard('{"title":"Cat in Orbit","caption":"Dear Earthling, ...","image_prompt":"a cat on Jupiter"}'))
      .toEqual({ title: "Cat in Orbit", caption: "Dear Earthling, ...", imagePrompt: "a cat on Jupiter" }));
  it("tolerates code fences around the JSON", () =>
    expect(parsePostcard('```json\n{"title":"t","caption":"c","image_prompt":"i"}\n```')?.caption).toBe("c"));
  it("rejects replies without a caption or image prompt", () => {
    expect(parsePostcard('{"title":"t","caption":"","image_prompt":"i"}')).toBeNull();
    expect(parsePostcard("not json")).toBeNull();
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Implement**

```ts
import type { Destination } from "./destinations";

export type PlanetFacts = { gravity: number; distance?: string | null; description?: string | null };

const SYSTEM = `You are the art department of an alien research crew studying New York City and Columbia University.
A human wants to see something from Earth "teleported" to another world. Produce:
1. image_prompt: a vivid visual description (40 to 80 words) for an image generator showing the subject relocated to the destination, using the destination's look. Style: a slightly surreal retro sci-fi postcard painting by an alien artist. No words, letters or text in the image. Nothing scary or gory.
2. caption: a deadpan postcard message (25 to 60 words) from the alien, starting "Dear Earthling," that uses at least one of the real facts given (for example the gravity number) to explain what happens to the subject there. Funny, never mean, nothing about real private individuals.
3. title: 3 to 8 words.
Reply with JSON only: {"title": string, "caption": string, "image_prompt": string}`;

export type PostcardInput = {
  subject: string;
  destination: Destination;
  facts: PlanetFacts;
  anomaly?: string;
  hasImage?: boolean;
};

export function buildPostcardPrompt({ subject, destination, facts, anomaly, hasImage }: PostcardInput) {
  const factLine = [
    `gravity is ${facts.gravity}× Earth's`,
    facts.distance ? `${facts.distance} from the Sun` : null,
    facts.description ?? null,
  ].filter(Boolean).join("; ");
  const lines = [
    `Destination: ${destination.name}${destination.fictional ? " (the aliens' fictional homeworld)" : ""}`,
    `Facts: ${factLine}`,
    `Look: ${destination.look}`,
    subject ? `Subject: ${subject}` : "Subject: whatever is in the attached photo",
  ];
  if (anomaly) lines.push(`This is for today's Daily Anomaly: "${anomaly}".`);
  if (hasImage) lines.push("A photo of the subject is attached — describe what is actually in it so the artist can paint it.");
  const user = lines.join("\n");
  return { system: SYSTEM, user, stored: `${SYSTEM}\n\n---\n\n${user}` };
}

export type Postcard = { title: string; caption: string; imagePrompt: string };

export function parsePostcard(text: string): Postcard | null {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const d = JSON.parse(json);
    const caption = String(d.caption ?? "").trim();
    const imagePrompt = String(d.image_prompt ?? "").trim();
    if (!caption || !imagePrompt) return null;
    return { title: String(d.title ?? "").trim().slice(0, 140), caption, imagePrompt: imagePrompt.slice(0, 1200) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4:** PASS. **Step 5:** commit "Add postcard prompt and parser".

---

### Task 3: Pollinations client

**Files:** Create `src/lib/pollinations.ts`; Test `src/lib/__tests__/pollinations.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { pollinationsUrl, renderImage, RenderError } from "../pollinations";

const jpeg = () =>
  new Response(new Uint8Array(5000), { headers: { "content-type": "image/jpeg" } });

describe("pollinationsUrl", () => {
  it("encodes the prompt and pins the seed", () => {
    const url = pollinationsUrl("cat & dog on Mars", 42);
    expect(url).toContain("cat%20%26%20dog%20on%20Mars");
    expect(url).toContain("seed=42");
  });
});

describe("renderImage", () => {
  it("returns the image bytes and type", async () => {
    const r = await renderImage("x", { seed: 1, fetchImpl: vi.fn().mockResolvedValue(jpeg()) });
    expect(r.contentType).toBe("image/jpeg");
    expect(r.bytes.length).toBe(5000);
  });
  it("rejects non-image responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("oops", { headers: { "content-type": "text/html" } }));
    await expect(renderImage("x", { fetchImpl })).rejects.toBeInstanceOf(RenderError);
  });
  it("turns timeouts into RenderError", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(renderImage("x", { fetchImpl })).rejects.toBeInstanceOf(RenderError);
  });
});
```

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Implement**

```ts
// Free text-to-image service (no key). Its rough style is framed as "the alien artist's rendition".
const STYLE = "retro sci-fi postcard painting by an alien artist, dreamlike, vivid colors";

export class RenderError extends Error {}

export function pollinationsUrl(prompt: string, seed: number) {
  const params = new URLSearchParams({ width: "1024", height: "768", seed: String(seed), nologo: "true" });
  const text = `${prompt}. ${STYLE}`.slice(0, 1500);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?${params}`;
}

export async function renderImage(
  prompt: string,
  {
    seed = Math.floor(Math.random() * 1_000_000_000),
    fetchImpl = fetch,
    timeoutMs = 45_000,
  }: { seed?: number; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
) {
  let res: Response;
  try {
    res = await fetchImpl(pollinationsUrl(prompt, seed), { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new RenderError("Image service timed out");
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) {
    throw new RenderError(`Image service returned ${res.status} ${type}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 1000) throw new RenderError("Image was empty");
  return { bytes, contentType: type.split(";")[0].trim(), seed };
}
```

- [ ] **Step 4:** PASS. **Step 5:** commit "Add Pollinations image client".

---

### Task 4: Gemini JSON mode

**Files:** Modify `src/lib/gemini.ts`; Test `src/lib/__tests__/gemini.test.ts`

- [ ] **Step 1: Failing test** (append inside `describe("generateReport")`)

```ts
  it("asks for JSON when json mode is on", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("{}"));
    await generateReport({ ...input, fetchImpl, models: ["m1"], json: true });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });
```

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Implement** — add `json?: boolean;` to `Input`, destructure `json = false`, and replace the
  `generationConfig` line with:

```ts
    generationConfig: {
      temperature: 1,
      maxOutputTokens: json ? 800 : 400,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
```

- [ ] **Step 4:** PASS. **Step 5:** commit "Add JSON mode to Gemini client".

---

### Task 5: Shared request guards + refactor `/api/generate`

**Files:** Create `src/lib/report-guard.ts`; Modify `src/app/api/generate/route.ts`

- [ ] **Step 1: Create `report-guard.ts`**

```ts
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const HOURLY_LIMIT = 10;
export const RATE_LIMIT_MESSAGE = "Signal jammed — you've sent 10 reports this hour. Try again later.";

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** The optional uploaded photo, or an error message if it isn't a usable image. */
export function readImage(form: FormData): { image: File | null; error?: string } {
  const file = form.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;
  if (image && !image.type.startsWith("image/")) return { image: null, error: "That file isn't an image." };
  if (image && image.size > MAX_IMAGE_BYTES) return { image: null, error: "Photos must be under 4 MB." };
  return { image };
}

/** Protects the free AI quotas: every report type counts toward one hourly limit. */
export async function overHourlyLimit(supabase: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return (count ?? 0) >= HOURLY_LIMIT;
}

export async function uploadReportImage(
  supabase: SupabaseClient,
  userId: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ url: string } | { error: string }> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("reports").upload(path, bytes, { contentType });
  if (error) return { error: error.message };
  return { url: supabase.storage.from("reports").getPublicUrl(path).data.publicUrl };
}
```

- [ ] **Step 2: Refactor `/api/generate/route.ts`** to import `fail, readImage, overHourlyLimit,
  RATE_LIMIT_MESSAGE, uploadReportImage` from `@/lib/report-guard`, delete its local copies, reject
  `kind === "postcard"` with `fail(400, "Postcards are sent from the Teleporter.")`, and pass the
  narrowed kind to `buildPrompt`. (Full file shown in the implementation commit.)

- [ ] **Step 3:** `npx tsc --noEmit && npm test` → pass. **Step 4:** commit "Share report request guards".

---

### Task 6: Migration

**Files:** Create `supabase/migrations/20261010000000_postcards.sql`

- [ ] **Step 1: Write**

```sql
-- Week 5: postcards. Additive only — weeks 3 and 4 keep working.
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check
  check (kind in ('field_note', 'exoplanet', 'transmission', 'postcard'));

alter table public.reports add column if not exists planet text;
alter table public.reports add column if not exists image_prompt text;

-- Same view as week 4 with the two new columns appended (create or replace allows adding at the end).
create or replace view public.report_feed as
select
  r.id, r.user_id, r.kind, r.subject, r.body, r.prompt, r.model, r.image_url,
  r.anomaly_date, r.created_at,
  coalesce(sum(v.value), 0)::int                          as score,
  count(*) filter (where v.value = 1)::int                as upvotes,
  count(*) filter (where v.value = -1)::int               as downvotes,
  p.first_name                                            as author_name,
  p.avatar_url                                            as author_avatar,
  r.planet,
  r.image_prompt
from public.reports r
left join public.votes v on v.report_id = r.id
left join public.profiles p on p.id = r.user_id
group by r.id, p.first_name, p.avatar_url;
```

- [ ] **Step 2:** Run in Supabase SQL editor (user approved running migrations via Chrome).
- [ ] **Step 3:** Verify with anon key: `report_feed?select=planet,image_prompt&limit=1` → `[]`; inserting a report as anon still denied.
- [ ] **Step 4:** commit "Add postcard columns".

---

### Task 7: Domain types

**Files:** Modify `src/lib/observatory.ts`, `src/lib/prompts.ts`

- [ ] **Step 1:** In `observatory.ts`: `ReportKind` gains `"postcard"`; export
  `type TextReportKind = Exclude<ReportKind, "postcard">`; append to `KINDS`:

```ts
  {
    id: "postcard",
    label: "Postcard",
    icon: "✉",
    blurb: "Pick a planet. The alien artist paints your subject there.",
    example: "“my dorm room” → Saturn",
    placeholder: "e.g. my dorm room, the Halal cart line",
    photo: "optional",
  },
```

  and add `planet: string | null; image_prompt: string | null;` to `FeedReport`.

- [ ] **Step 2:** In `prompts.ts`: `FORMATS: Record<TextReportKind, string>` and `PromptInput.kind: TextReportKind`.
- [ ] **Step 3:** `npx tsc --noEmit && npm test`. **Step 4:** commit "Add postcard report kind".

---

### Task 8: `/api/teleport`

**Files:** Create `src/app/api/teleport/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getDestination } from "@/lib/destinations";
import { buildPostcardPrompt, parsePostcard } from "@/lib/postcards";
import { generateReport, GenerationError } from "@/lib/gemini";
import { renderImage } from "@/lib/pollinations";
import { getTodayAnomaly } from "@/lib/observatory-server";
import { fail, overHourlyLimit, RATE_LIMIT_MESSAGE, readImage, uploadReportImage } from "@/lib/report-guard";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, "Sign in to use the Teleporter.");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(500, "The Teleporter isn't configured (missing GEMINI_API_KEY).");

  const form = await request.formData();
  const destination = getDestination(form.get("destination"));
  if (!destination) return fail(400, "Pick a destination.");

  const { image, error: imageError } = readImage(form);
  if (imageError) return fail(400, imageError);

  const useAnomaly = form.get("useAnomaly") === "true";
  let subject = String(form.get("subject") ?? "").trim().slice(0, 140);
  const anomaly = useAnomaly ? await getTodayAnomaly(supabase) : null;
  if (!subject && anomaly) subject = anomaly.subject;
  if (!subject && !image) return fail(400, "Tell the alien what to teleport, or add a photo.");

  if (await overHourlyLimit(supabase, user.id)) return fail(429, RATE_LIMIT_MESSAGE);

  // Real planet facts come from the planets table; Xylo-7 is fictional and uses built-in numbers.
  const { data: planet } = destination.fictional
    ? { data: null }
    : await supabase
        .from("planets")
        .select("gravity_vs_earth, distance_from_sun, description")
        .ilike("name", destination.name)
        .maybeSingle<{ gravity_vs_earth: number; distance_from_sun: string; description: string }>();
  const facts = {
    gravity: planet?.gravity_vs_earth ?? destination.gravity,
    distance: planet?.distance_from_sun ?? null,
    description: planet?.description ?? null,
  };

  const prompt = buildPostcardPrompt({
    subject, destination, facts, anomaly: anomaly?.subject, hasImage: !!image,
  });
  const photo = image
    ? { mimeType: image.type, base64: Buffer.from(await image.arrayBuffer()).toString("base64") }
    : undefined;

  let written;
  try {
    written = await generateReport({ system: prompt.system, user: prompt.user, apiKey, image: photo, json: true });
  } catch (e) {
    if (e instanceof GenerationError && e.reason === "blocked") {
      return fail(422, "The mothership refused that one. Try a different subject or photo.");
    }
    return fail(503, "Transmission lost — the AI is busy. Try again in a moment.");
  }
  const postcard = parsePostcard(written.text);
  if (!postcard) return fail(502, "The alien's notes came back scrambled — try again.");

  let rendered;
  try {
    rendered = await renderImage(postcard.imagePrompt);
  } catch {
    return fail(503, "The alien artist dropped their brush — try again in a moment.");
  }

  const upload = await uploadReportImage(supabase, user.id, rendered.bytes, rendered.contentType);
  if ("error" in upload) return fail(500, `Couldn't store the rendition: ${upload.error}`);

  const title = postcard.title || subject || `Postcard from ${destination.name}`;
  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      kind: "postcard",
      subject: title,
      prompt: prompt.stored,
      image_prompt: postcard.imagePrompt,
      model: `${written.model} + pollinations`,
      body: postcard.caption,
      image_url: upload.url,
      planet: destination.id,
      anomaly_date: anomaly?.date ?? null,
    })
    .select("id")
    .single();
  if (error) return fail(500, `Couldn't save the postcard: ${error.message}`);

  return NextResponse.json({
    id: report.id,
    title,
    caption: postcard.caption,
    imageUrl: upload.url,
    destination: destination.id,
    gravity: facts.gravity,
  });
}
```

- [ ] **Step 2:** `npx tsc --noEmit`; signed-out curl → 401. **Step 3:** commit "Add teleport endpoint".

---

### Task 9: Teleporter page

**Files:** Create `src/lib/shrink-image.ts`, `src/app/observatory/teleport/page.tsx`, `src/app/observatory/teleport/Teleporter.tsx`; Modify `src/app/observatory/new/CreateReport.tsx` (import shared `shrink`), `src/proxy.ts`

- [ ] **Step 1: `shrink-image.ts`** (moved from `CreateReport.tsx`)

```ts
// Shrink photos in the browser: faster uploads and under Vercel's 4.5 MB request limit.
export async function shrink(file: File): Promise<Blob> {
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
```

- [ ] **Step 2: `teleport/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import SpaceBackground from "@/components/SpaceBackground";
import { getUserAndProfile } from "@/lib/supabase-server";
import { needsName } from "@/lib/supabase";
import { DESTINATIONS } from "@/lib/destinations";
import { getTodayAnomaly } from "@/lib/observatory-server";
import Teleporter from "./Teleporter";

export const maxDuration = 60;

export default async function TeleportPage({ searchParams }: PageProps<"/observatory/teleport">) {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (needsName(profile)) redirect("/welcome");

  const [anomaly, { data: planets }] = await Promise.all([
    getTodayAnomaly(supabase),
    supabase.from("planets").select("name, gravity_vs_earth"),
  ]);
  // Show the planets table's gravity numbers on the buttons.
  const destinations = DESTINATIONS.map((d) => ({
    ...d,
    gravity: planets?.find((p) => p.name.toLowerCase() === d.name.toLowerCase())?.gravity_vs_earth ?? d.gravity,
  }));
  const { to } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-20 pb-12 sm:px-8">
      <SpaceBackground count={80} />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#7ee2a8] uppercase">Teleporter · Agent {profile?.first_name}</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl" style={{ textShadow: "0 0 22px rgba(233, 196, 106, 0.3)" }}>
            Send a postcard from the solar system
          </h1>
          <p className="text-sm text-white/60">
            Pick a planet, tell the aliens what to teleport there (or upload a photo), and their artist paints it on arrival.
            The painting and a postcard note using that planet&apos;s real gravity are posted to the Observatory for voting.
            Every planet you visit earns a stamp in your passport on Mission Control.
          </p>
        </div>
        <Teleporter destinations={destinations} anomaly={anomaly} initialDestination={typeof to === "string" ? to : undefined} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `teleport/Teleporter.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Destination } from "@/lib/destinations";
import type { Anomaly } from "@/lib/observatory";
import { shrink } from "@/lib/shrink-image";

type Result = { id: string; title: string; caption: string; imageUrl: string; destination: string; gravity: number };

const STAGES = ["Folding space…", "Teleporting your subject…", "The alien artist is painting…", "Adding finishing tentacle-strokes…"];

export default function Teleporter({
  destinations, anomaly, initialDestination,
}: { destinations: Destination[]; anomaly: Anomaly | null; initialDestination?: string }) {
  const [dest, setDest] = useState(destinations.find((d) => d.id === initialDestination)?.id ?? "jupiter");
  const [subject, setSubject] = useState("");
  const [useAnomaly, setUseAnomaly] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chosen = destinations.find((d) => d.id === dest)!;

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000);
    return () => clearInterval(id);
  }, [busy]);

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

  async function teleport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!subject.trim() && !photo) return setError("Tell the alien what to teleport, or add a photo.");
    setStage(0);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("destination", dest);
      form.set("subject", subject);
      form.set("useAnomaly", String(useAnomaly));
      if (photo) form.set("image", await shrink(photo), "photo.jpg");
      const res = await fetch("/api/teleport", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Teleport failed — try again.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Teleport failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const where = destinations.find((d) => d.id === result.destination)!;
    return (
      <section className="hud-panel flex flex-col gap-4 p-6">
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: where.color }}>
          ✉ Postcard received from {where.name} · {result.gravity}× Earth gravity
        </span>
        <h2 className="text-2xl font-bold text-white">{result.title}</h2>
        <figure className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.imageUrl} alt={`Alien artist's rendition: ${result.title}`} className="w-full rounded-lg border border-white/10" />
          <figcaption className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">Alien artist rendition · Pollinations</figcaption>
        </figure>
        <p className="font-mono text-sm leading-relaxed whitespace-pre-line text-white/85">{result.caption}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/observatory/${result.id}`} className="rounded-full bg-[#f4dfa6] px-5 py-2 text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-white">View & share</Link>
          <Link href="/observatory?sort=new&kind=postcard" className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">See all postcards</Link>
          <button onClick={() => { setResult(null); setSubject(""); setPhoto(null); setPreview(null); setUseAnomaly(false); }}
            className="rounded-full border border-white/20 px-5 py-2 text-xs tracking-[0.15em] text-white/70 uppercase hover:text-white">
            Teleport again
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={teleport} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">1 · Destination</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {destinations.map((d) => (
            <label key={d.id} className={`hud-panel flex cursor-pointer flex-col gap-1 p-4 transition ${dest === d.id ? "border-[#e9c46a]/60 bg-[#e9c46a]/10" : "hover:bg-white/5"}`}>
              <input type="radio" name="destination" value={d.id} checked={dest === d.id} onChange={() => setDest(d.id)} className="sr-only" />
              <span className="flex items-center gap-2 text-base font-bold text-white">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}` }} />
                {d.name}
              </span>
              <span className="font-mono text-[10px] tracking-[0.15em] text-[#e9c46a]/70 uppercase">{d.gravity}× gravity{d.fictional ? " · fictional" : ""}</span>
              <span className="text-xs text-white/55">{d.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="hud-panel flex flex-col gap-4 p-5">
        <span className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">2 · What should we teleport to {chosen.name}?</span>
        <span className="-mt-2 text-xs text-white/45">Type a thing or place, add a photo, or both. With a photo, the alien paints what&apos;s in it.</span>
        {anomaly && (
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={useAnomaly} onChange={(e) => toggleAnomaly(e.target.checked)} className="h-4 w-4 accent-[#7ee2a8]" />
            Use today&apos;s anomaly: <strong className="text-white">{anomaly.subject}</strong>
          </label>
        )}
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140}
          placeholder={photo ? "optional with a photo" : "e.g. my dorm room, a bodega cat, the Low Steps"}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#e9c46a]/60" />
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-dashed border-white/25 px-4 py-2 text-xs tracking-[0.1em] text-white/60 uppercase hover:border-white/50 hover:text-white">
            {photo ? "Change photo" : "Add photo (optional)"}
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
        {busy ? `${STAGES[stage]} (up to 45s)` : `3 · Teleport to ${chosen.name}`}
      </button>
    </form>
  );
}
```

- [ ] **Step 4:** In `CreateReport.tsx` delete the local `shrink` and `import { shrink } from "@/lib/shrink-image";`;
  render only `KINDS.filter((k) => k.id !== "postcard")` as radio cards; after the fieldset add:

```tsx
      <Link href="/observatory/teleport" className="hud-panel flex items-center justify-between gap-4 p-4 hover:bg-white/5">
        <span className="flex flex-col gap-1">
          <span className="text-base font-bold text-white">✉ Want a picture instead? Send a Postcard</span>
          <span className="text-xs text-white/60">The Teleporter sends your subject to another planet and the alien artist paints it.</span>
        </span>
        <span className="font-mono text-xs tracking-[0.2em] text-[#f4dfa6] uppercase">Teleporter →</span>
      </Link>
```

- [ ] **Step 5:** `src/proxy.ts`: add `"/observatory/teleport"` to `PROTECTED`.
- [ ] **Step 6:** `npm run build && npm run lint`. **Step 7:** commit "Add Teleporter page".

---

### Task 10: Show postcards everywhere

**Files:** Modify `ReportCard.tsx`, `observatory/[id]/page.tsx`, `observatory/page.tsx`, `HowItWorks.tsx`, `HelloWorld.tsx`, `mission-control/page.tsx`

- [ ] **Step 1: `ReportCard.tsx`** — import `getDestination`; in the header, after the kind label, add
  for postcards a badge `→ {destination.name}` coloured with `destination.color`; wrap postcard images in a
  `<figure>` with caption "Alien artist rendition".
- [ ] **Step 2: Detail page** — inside `<details>`, when `report.image_prompt` exists add a second block
  "Image prompt sent to the alien artist (Pollinations)" with `<pre>{report.image_prompt}</pre>`, and label the
  first block "Prompt sent to Gemini".
- [ ] **Step 3: Feed** — next to "+ New report" add a "✉ Teleport" link to `/observatory/teleport`.
- [ ] **Step 4: HowItWorks** — step 1 text: "Field Note (something humans do), Exoplanet (a NYC place), Transmission (a photo), or a Postcard: your subject painted on another planet by the Teleporter."
- [ ] **Step 5: Home** — link text "✦ the earth observatory: alien reports & postcards from other planets →".
- [ ] **Step 6: Mission Control passport** — query
  `report_feed.select("planet").eq("user_id", user.id).eq("kind", "postcard")`, build `visited = new Set(planets)`,
  and render a full-width `HudPanel label="Passport" code={`${visited.size}/9 visited`}` listing every destination
  as a stamp (filled colour + glow if visited, dashed outline otherwise, each linking to
  `/observatory/teleport?to=<id>`), plus a "Teleporter →" link.
- [ ] **Step 7:** build + lint + tests. **Step 8:** commit "Show postcards in feed, detail, and passport".

---

### Task 11: Verify and ship

- [ ] `npm test && npm run lint && npm run build`.
- [ ] Chrome (signed in, localhost): teleport text-only to Saturn; photo-only to Xylo-7; anomaly to Mars; vote on a postcard; passport shows 3/9; View prompt shows both prompts.
- [ ] Signed out: feed shows postcards; `/observatory/teleport` redirects to login; `POST /api/teleport` → 401.
- [ ] Push `week5-postcards`; wait for the Vercel deployment; probe it; confirm week 3/4 URLs still load; hand over the commit-specific URL.
