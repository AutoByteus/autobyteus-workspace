import { describe, expect, it, vi } from "vitest";
import {
  MissingRunVersionError,
  RunVersionFencingPolicy,
  StaleRunVersionError,
} from "../../../src/distributed/policies/run-version-fencing-policy.js";

describe("RunVersionFencingPolicy", () => {
  it("asserts successfully when incoming runVersion matches current value", async () => {
    const resolver = vi.fn(async () => "3");
    const policy = new RunVersionFencingPolicy(resolver);

    await expect(policy.assertCurrentRunVersion("team-run-1", 3)).resolves.toBeUndefined();
    expect(resolver).toHaveBeenCalledWith("team-run-1");
  });

  it("throws stale error when incoming runVersion does not match current value", async () => {
    const resolver = vi.fn(async () => 8);
    const policy = new RunVersionFencingPolicy(resolver);

    await expect(policy.assertCurrentRunVersion("team-run-1", 7)).rejects.toBeInstanceOf(StaleRunVersionError);
  });

  it("throws missing error when current runVersion cannot be resolved", async () => {
    const resolver = vi.fn(async () => null);
    const policy = new RunVersionFencingPolicy(resolver);

    await expect(policy.assertCurrentRunVersion("team-run-1", 7)).rejects.toBeInstanceOf(MissingRunVersionError);
  });

  it("dropIfStale returns false when runVersion matches current", async () => {
    const resolver = vi.fn(async () => "10");
    const policy = new RunVersionFencingPolicy(resolver);

    await expect(policy.dropIfStale("team-run-1", 10)).resolves.toBe(false);
  });

  it("dropIfStale returns true when runVersion mismatches or resolver is missing", async () => {
    const stalePolicy = new RunVersionFencingPolicy(async () => "2");
    await expect(stalePolicy.dropIfStale("team-run-1", "3")).resolves.toBe(true);

    const missingPolicy = new RunVersionFencingPolicy(async () => undefined);
    await expect(missingPolicy.dropIfStale("team-run-1", "3")).resolves.toBe(true);
  });
});
