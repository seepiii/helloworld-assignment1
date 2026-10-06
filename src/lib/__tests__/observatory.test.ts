import { describe, expect, it } from "vitest";
import { nextVote, nyDate, timeAgo, KINDS } from "../observatory";

describe("nextVote", () => {
  it("casts a new vote", () => expect(nextVote(0, 1)).toBe(1));
  it("removes a vote when the same arrow is clicked again", () =>
    expect(nextVote(1, 1)).toBe(0));
  it("switches an upvote to a downvote", () => expect(nextVote(1, -1)).toBe(-1));
});

describe("nyDate", () => {
  it("uses New York's calendar day, not UTC", () =>
    // 02:00 UTC on Oct 7 is still Oct 6 in New York
    expect(nyDate(new Date("2026-10-07T02:00:00Z"))).toBe("2026-10-06"));
});

describe("timeAgo", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  it("formats minutes", () =>
    expect(timeAgo("2026-10-06T11:55:00Z", now)).toBe("5m ago"));
  it("formats hours", () =>
    expect(timeAgo("2026-10-06T09:00:00Z", now)).toBe("3h ago"));
  it("formats days", () =>
    expect(timeAgo("2026-10-04T12:00:00Z", now)).toBe("2d ago"));
});

describe("KINDS", () => {
  it("only transmissions require a photo", () =>
    expect(KINDS.filter((k) => k.photo === "required").map((k) => k.id)).toEqual([
      "transmission",
    ]));
});
