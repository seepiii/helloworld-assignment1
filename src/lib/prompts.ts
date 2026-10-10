import type { TextReportKind } from "./observatory";

const BASE = `You are an alien anthropologist from the Observatory, stationed in New York City to study humans — especially Columbia University students.
Write in a deadpan, scientific tone that slowly reveals affection for the humans.
Be specific to NYC and Columbia when it fits (subway lines, bodegas, Butler Library, the Low Steps, dining halls, dorms, Morningside Heights).
Keep it funny, never mean: no insults about appearance or identity, nothing about real private individuals, no slurs, nothing sexual.
Plain text only — no markdown, no headings, no emojis. 60 to 110 words.`;

const FORMATS: Record<TextReportKind, string> = {
  field_note: `Write a FIELD NOTE: an observation log entry about the phenomenon below.
Start with "FIELD NOTE #" followed by a 3-digit number and a colon. End with a single line starting "Hypothesis:".`,
  exoplanet: `Write an EXOPLANET DISCOVERY ENTRY that treats the place below as a newly discovered planet.
Use exactly these labelled lines, one per line: "Designation:", "Atmosphere:", "Gravity:", "Native life:", "Habitable?:". Keep each line short and funny.`,
  transmission: `Write an INTERCEPTED TRANSMISSION: a crackly radio message from a field agent reporting the attached photo to the mothership as a strange Earth discovery.
Start with "[TRANSMISSION INTERCEPTED]" and end with "[SIGNAL LOST]". Describe only what is actually visible in the photo.`,
};

export type PromptInput = {
  kind: TextReportKind;
  subject: string;
  anomaly?: string;
  hasImage?: boolean;
};

const TITLE_RULE = `The user gave no subject, so work it out from the photo.
Begin your reply with a line "TITLE: " followed by a 3 to 8 word title for what the photo shows, then a blank line, then the report.`;

export function buildPrompt({ kind, subject, anomaly, hasImage }: PromptInput) {
  const needsTitle = !subject && !!hasImage;
  const system = `${BASE}\n\n${FORMATS[kind]}${needsTitle ? `\n\n${TITLE_RULE}` : ""}`;
  const lines = [subject ? `Subject: ${subject}` : "Subject: (see photo)"];
  if (anomaly) lines.push(`This is for today's Daily Anomaly: "${anomaly}".`);
  if (hasImage) lines.push("A photo is attached — base the report on what you see in it.");
  const user = lines.join("\n");
  return { system, user, stored: `${system}\n\n---\n\n${user}`, needsTitle };
}

/** Separates a leading "TITLE: …" line (requested for photo-only reports) from the report body. */
export function splitTitle(text: string): { title: string | null; body: string } {
  const match = text.match(/^\s*TITLE:\s*(.+?)\s*(?:\n|$)/i);
  if (!match) return { title: null, body: text };
  return { title: match[1].slice(0, 140), body: text.slice(match[0].length).trim() };
}
