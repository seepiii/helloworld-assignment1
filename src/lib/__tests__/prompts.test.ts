import { describe, expect, it } from "vitest";
import { buildPrompt } from "../prompts";

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
});
