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
