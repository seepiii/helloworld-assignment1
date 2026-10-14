export type ReportKind = "field_note" | "exoplanet" | "transmission" | "postcard";
/** Report types written as text by /api/generate (postcards come from the Teleporter). */
export type TextReportKind = Exclude<ReportKind, "postcard">;
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
  {
    id: "postcard",
    label: "Postcard",
    icon: "✉",
    blurb: "Pick a planet. The alien artist paints your subject there.",
    example: "“my dorm room” → Saturn",
    placeholder: "e.g. my dorm room, the Halal cart line",
    photo: "optional",
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
  planet: string | null;
  image_prompt: string | null;
  user_prompt: string | null;
  source_image_url: string | null;
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
