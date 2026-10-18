import { describe, it, expect } from "vitest";
import { judgeAnswer, resolveRecited } from "./judge";

describe("judgeAnswer", () => {
  it("passes when the required word is present", () => {
    expect(judgeAnswer("No, only A's own rows.", [["no"]])).toBe(true);
  });
  it("matches whole words only: 'no' does not match 'note'", () => {
    expect(judgeAnswer("Take a note", [["no"]])).toBe(false);
  });
  it("needs one word from each list", () => {
    expect(judgeAnswer("server", [["server"], ["key"]])).toBe(false);
    expect(judgeAnswer("server key", [["server"], ["key"]])).toBe(true);
  });
  it("matches multi-word phrases", () => {
    expect(judgeAnswer("Add a NEW ROW each time", [["new row"]])).toBe(true);
  });
});

describe("resolveRecited", () => {
  const triggers = [{ id: "C9-2", phrase: "encrypted" }];
  const text = "You need a password. Each account is private, and the emails are encrypted. It's for privacy.";
  it("falls back to the first sentence with a trigger when AI sentence is not verbatim", () => {
    expect(resolveRecited(text, "made up", triggers)).toEqual({
      sentence: "Each account is private, and the emails are encrypted.",
      triggerId: "C9-2",
    });
  });
  it("falls back to the last sentence when no trigger matches", () => {
    expect(resolveRecited("One. Two.", null, triggers).sentence).toBe("Two.");
  });
});
