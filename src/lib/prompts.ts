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
