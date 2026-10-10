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
