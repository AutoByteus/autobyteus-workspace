import { describe, expect, it, vi } from "vitest";
import { CommandRetryPolicy } from "../../../src/distributed/policies/command-retry-policy.js";

describe("CommandRetryPolicy", () => {
  it("retries transient failures and succeeds within max attempts", async () => {
    const sleep = vi.fn(async () => undefined);
    const policy = new CommandRetryPolicy({
      maxAttempts: 3,
      jitterRatio: 0,
      sleep,
    });

    const work = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("timeout-1"))
      .mockRejectedValueOnce(new Error("timeout-2"))
      .mockResolvedValue("ok");

    await expect(
      policy.retryWithBackoff(async () => work()),
    ).resolves.toBe("ok");
    expect(work).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 200);
    expect(sleep).toHaveBeenNthCalledWith(2, 800);
  });

  it("stops retrying when classifier marks error as non-retryable", async () => {
    const sleep = vi.fn(async () => undefined);
    const policy = new CommandRetryPolicy({
      maxAttempts: 4,
      retryClassifier: () => false,
      sleep,
    });
    const work = vi.fn(async () => {
      throw new Error("non-retryable");
    });

    await expect(policy.retryWithBackoff(async () => work())).rejects.toThrow("non-retryable");
    expect(work).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
