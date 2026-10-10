import { describe, expect, it } from "vitest";
import { buildPostcardPrompt, parsePostcard } from "../postcards";
import { getDestination } from "../destinations";

const jupiter = getDestination("jupiter")!;

describe("buildPostcardPrompt", () => {
  it("includes the destination, its real gravity, and its look", () => {
    const p = buildPostcardPrompt({ subject: "bodega cat", destination: jupiter, facts: { gravity: 2.53 } });
    expect(p.user).toContain("Jupiter");
    expect(p.user).toContain("2.53");
    expect(p.user).toContain("Great Red Spot");
    expect(p.user).toContain("bodega cat");
    expect(p.stored).toContain(p.system);
  });
  it("notes the fictional homeworld", () => {
    const p = buildPostcardPrompt({ subject: "x", destination: getDestination("xylo-7")!, facts: { gravity: 0.7 } });
    expect(p.user).toContain("fictional");
  });
  it("asks the model to describe an attached photo", () => {
    const p = buildPostcardPrompt({ subject: "", destination: jupiter, facts: { gravity: 2.53 }, hasImage: true });
    expect(p.user).toContain("photo");
  });
});

describe("parsePostcard", () => {
  it("parses the JSON reply", () =>
    expect(parsePostcard('{"title":"Cat in Orbit","caption":"Dear Earthling, ...","image_prompt":"a cat on Jupiter"}'))
      .toEqual({ title: "Cat in Orbit", caption: "Dear Earthling, ...", imagePrompt: "a cat on Jupiter" }));
  it("tolerates code fences around the JSON", () => {
    const fence = "`".repeat(3);
    const reply = `${fence}json\n{"title":"t","caption":"c","image_prompt":"i"}\n${fence}`;
    expect(parsePostcard(reply)?.caption).toBe("c");
  });
  it("rejects replies without a caption or image prompt", () => {
    expect(parsePostcard('{"title":"t","caption":"","image_prompt":"i"}')).toBeNull();
    expect(parsePostcard("not json")).toBeNull();
  });
});
