import { describe, expect, it, vi } from "vitest";

/** NA-15, design M-1: the intake takes the launch credential and removes it from the process environment at load. */

describe("launch credential intake", () => {
  it("NAS-31 reads AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL when it loads and deletes it from process.env", async () => {
    vi.resetModules();
    process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL = "own_intake_test";
    const intake = await import("../../../src/node-access/launch-credential-intake.js");
    expect(process.env.AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL).toBeUndefined();
    expect(intake.launchCredential()).toBe("own_intake_test");
  });
});
