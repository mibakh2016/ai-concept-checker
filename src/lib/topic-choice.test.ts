import { describe, expect, it } from "vitest";
import { resolveTopicChoice } from "./topic-choice";

describe("remembered topic", () => {
  it("restores Zoology after refresh", () => {
    expect(resolveTopicChoice("ZOO", ["M2", "ZOO"])).toBe("ZOO");
  });
  it("defaults to Gen AI Apps for an unknown saved choice", () => {
    expect(resolveTopicChoice("unknown", ["M2", "ZOO"])).toBe("M2");
  });
  it("maps the earlier Zoology choice to the supplied topic", () => {
    expect(resolveTopicChoice("Z1", ["M2", "ZOO"])).toBe("ZOO");
  });
});