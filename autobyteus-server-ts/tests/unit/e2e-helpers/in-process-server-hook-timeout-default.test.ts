import { describe, expect, it } from "vitest";

/** autobyteus-561 AC-007: a file that does not import the in-process server helper keeps vitest's 10 s hook timeout. */
describe("a file that does not import the in-process server helper", () => {
  it("keeps the default hook timeout", () => {
    const config = (globalThis as unknown as { __vitest_worker__?: { config?: { hookTimeout?: number } } }).__vitest_worker__?.config;
    expect(config?.hookTimeout).toBe(10_000);
  });
});
