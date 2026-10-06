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
