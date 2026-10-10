import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isReportKind } from "@/lib/observatory";
import { buildPrompt, splitTitle } from "@/lib/prompts";
import { generateReport, GenerationError } from "@/lib/gemini";
import { getTodayAnomaly } from "@/lib/observatory-server";
import { fail, overHourlyLimit, RATE_LIMIT_MESSAGE, readImage, uploadReportImage } from "@/lib/report-guard";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, "Sign in to transmit reports.");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail(500, "The Observatory's antenna isn't configured (missing GEMINI_API_KEY).");

  const form = await request.formData();
  const kind = form.get("kind");
  if (!isReportKind(kind)) return fail(400, "Pick a report type.");
  if (kind === "postcard") return fail(400, "Postcards are sent from the Teleporter.");

  const useAnomaly = form.get("useAnomaly") === "true";
  let subject = String(form.get("subject") ?? "").trim().slice(0, 140);
  const { image, error: imageError } = readImage(form);
  if (imageError) return fail(400, imageError);
  if (kind === "transmission" && !image) return fail(400, "Transmissions need a photo.");

  const anomaly = useAnomaly ? await getTodayAnomaly(supabase) : null;
  if (!subject && anomaly) subject = anomaly.subject;
  if (!subject && !image) return fail(400, "Tell the Observatory what to study, or add a photo.");

  if (await overHourlyLimit(supabase, user.id)) return fail(429, RATE_LIMIT_MESSAGE);

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

  // Photo-only reports come back with a "TITLE:" line we use as the subject.
  const { title, body } = prompt.needsTitle
    ? splitTitle(result.text)
    : { title: null, body: result.text };
  const finalSubject = subject || title || "Untitled photo";

  // Upload only after a successful generation, so failed attempts leave nothing behind.
  let imageUrl: string | null = null;
  if (bytes && image) {
    const upload = await uploadReportImage(supabase, user.id, bytes, image.type);
    if ("error" in upload) return fail(500, `Photo upload failed: ${upload.error}`);
    imageUrl = upload.url;
  }

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      kind,
      subject: finalSubject,
      prompt: prompt.stored,
      model: result.model,
      body,
      image_url: imageUrl,
      anomaly_date: anomaly?.date ?? null,
    })
    .select("id")
    .single();
  if (error) return fail(500, `Couldn't save the report: ${error.message}`);

  return NextResponse.json({ id: report.id, body, model: result.model, imageUrl, subject: finalSubject });
}
