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
