import { describe, expect, it } from "vitest";
import { buildPrompt, splitTitle } from "../prompts";

describe("buildPrompt", () => {
  it("includes the subject and kind-specific format", () => {
    const p = buildPrompt({ kind: "exoplanet", subject: "Trader Joe's on 72nd" });
    expect(p.user).toContain("Trader Joe's on 72nd");
    expect(p.system).toContain("Habitable?:");
  });

  it("mentions the daily anomaly when used", () => {
    const p = buildPrompt({
      kind: "field_note",
      subject: "the Halal cart line",
      anomaly: "the Halal cart line",
    });
    expect(p.user).toContain("Daily Anomaly");
  });

  it("tells the model about an attached photo", () => {
    const p = buildPrompt({ kind: "transmission", subject: "", hasImage: true });
    expect(p.user).toContain("photo is attached");
  });

  it("stores the full prompt (system + user) for reproducibility", () => {
    const p = buildPrompt({ kind: "field_note", subject: "bodega cats" });
    expect(p.stored).toContain(p.system);
    expect(p.stored).toContain(p.user);
  });

  it("asks the model to title a photo-only report", () => {
    const p = buildPrompt({ kind: "field_note", subject: "", hasImage: true });
    expect(p.needsTitle).toBe(true);
    expect(p.system).toContain("TITLE:");
  });

  it("doesn't ask for a title when the user gave a subject", () => {
    const p = buildPrompt({ kind: "field_note", subject: "bodega cats", hasImage: true });
    expect(p.needsTitle).toBe(false);
    expect(p.system).not.toContain("TITLE:");
  });
});

describe("splitTitle", () => {
  it("pulls the TITLE line off the top of the reply", () =>
    expect(splitTitle("TITLE: Lawn Ritual Near Butler\n\nFIELD NOTE #412: ...")).toEqual({
      title: "Lawn Ritual Near Butler",
      body: "FIELD NOTE #412: ...",
    }));

  it("leaves replies without a TITLE line alone", () =>
    expect(splitTitle("FIELD NOTE #1: hi")).toEqual({ title: null, body: "FIELD NOTE #1: hi" }));
});
