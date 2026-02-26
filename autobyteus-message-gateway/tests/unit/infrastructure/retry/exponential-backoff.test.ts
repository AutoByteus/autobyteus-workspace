import { describe, expect, it } from "vitest";
import { nextDelayMs } from "../../../../src/infrastructure/retry/exponential-backoff.js";

describe("nextDelayMs", () => {
  it("returns exponential delays bounded by max delay", () => {
    const policy = {
      baseDelayMs: 100,
      factor: 2,
      maxDelayMs: 500,
    };

    expect(nextDelayMs(1, policy)).toBe(100);
    expect(nextDelayMs(2, policy)).toBe(200);
    expect(nextDelayMs(3, policy)).toBe(400);
    expect(nextDelayMs(4, policy)).toBe(500);
  });

  it("supports flat retry when factor=1", () => {
    const policy = {
      baseDelayMs: 75,
      factor: 1,
      maxDelayMs: 500,
    };

    expect(nextDelayMs(1, policy)).toBe(75);
    expect(nextDelayMs(5, policy)).toBe(75);
  });
});
