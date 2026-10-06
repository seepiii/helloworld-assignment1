// Best model first; fall back when Google reports high demand or rate limits.
export const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

const RETRYABLE = new Set([404, 429, 500, 503]);

export class GenerationError extends Error {
  constructor(
    public reason: "blocked" | "unavailable" | "empty",
    message: string,
  ) {
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
  system,
  user,
  apiKey,
  image,
  models = MODELS,
  fetchImpl = fetch,
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
