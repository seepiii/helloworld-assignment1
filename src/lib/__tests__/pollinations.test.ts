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
    await expect(renderImage("x", { fetchImpl, sleep: async () => {} })).rejects.toBeInstanceOf(RenderError);
  });
  it("turns timeouts into RenderError", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(renderImage("x", { fetchImpl, sleep: async () => {} })).rejects.toBeInstanceOf(RenderError);
  });

  it("retries when the free tier is rate limited (402/429)", async () => {
    const limited = () => new Response("{}", { status: 402, headers: { "content-type": "application/json" } });
    const fetchImpl = vi.fn().mockResolvedValueOnce(limited()).mockResolvedValueOnce(limited()).mockResolvedValueOnce(jpeg());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const r = await renderImage("x", { fetchImpl, sleep });
    expect(r.bytes.length).toBe(5000);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("gives up after its retries", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response("{}", { status: 402 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(renderImage("x", { fetchImpl, sleep })).rejects.toBeInstanceOf(RenderError);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});
