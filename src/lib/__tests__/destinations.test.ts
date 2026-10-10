import { describe, expect, it } from "vitest";
import { DESTINATIONS, getDestination } from "../destinations";

describe("destinations", () => {
  it("has the 8 planets plus the alien homeworld", () => {
    expect(DESTINATIONS).toHaveLength(9);
    expect(DESTINATIONS.filter((d) => d.fictional).map((d) => d.id)).toEqual(["xylo-7"]);
  });
  it("has unique ids", () =>
    expect(new Set(DESTINATIONS.map((d) => d.id)).size).toBe(DESTINATIONS.length));
  it("looks destinations up by id", () => {
    expect(getDestination("mars")?.name).toBe("Mars");
    expect(getDestination("pluto")).toBeNull();
  });
});
