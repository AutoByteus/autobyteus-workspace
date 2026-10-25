import { describe, expect, it, vi } from "vitest";
import { withClaudeControlQuery } from "../../../../../src/runtime-management/claude/client/claude-sdk-control-query.js";
import { ClaudeSdkClient } from "../../../../../src/runtime-management/claude/client/claude-sdk-client.js";
import { createReadDeadline, ReadDeadlineExceededError } from "../../../../../src/runtime-management/read-deadline.js";

/** A fake SDK `query()` that records what it was opened with and offers the given control requests. */
const fakeSdk = (control: Record<string, unknown>) => {
  const calls: Array<{ prompt: unknown; options: Record<string, unknown> }> = [];
  const close = vi.fn();
  const queryFn = vi.fn((input: { prompt: unknown; options: Record<string, unknown> }) => {
    calls.push(input);
    return { ...control, close };
  });
  return { calls, close, queryFn: queryFn as (...args: unknown[]) => unknown };
};

/** Whether the input yields within `ms` (it must not: the CLI would get a user turn). */
const yieldsWithin = async (prompt: unknown, ms: number): Promise<boolean> => {
  const iterator = (prompt as AsyncIterable<unknown>)[Symbol.asyncIterator]();
  const next = iterator.next().then((result) => !result.done);
  return Promise.race([next, new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms))]);
};

describe("withClaudeControlQuery", () => {
  it("opens the CLI with an input that never yields a message, and closes it after use (AR-001)", async () => {
    const sdk = fakeSdk({ supportedModels: async () => ["sonnet"] });
    const rows = await withClaudeControlQuery({ queryFn: sdk.queryFn }, async (control) =>
      (control.supportedModels as () => Promise<unknown>)());
    expect(rows).toEqual(["sonnet"]);
    const { prompt, options } = sdk.calls[0]!;
    expect(typeof prompt).not.toBe("string");
    expect(options).toMatchObject({ permissionMode: "plan", settingSources: ["user"] });
    expect(options).not.toHaveProperty("maxTurns");
    expect(sdk.close).toHaveBeenCalledOnce();
  });

  it("never yields while the control request runs", async () => {
    let yielded: boolean | null = null;
    const sdk = fakeSdk({});
    await withClaudeControlQuery({ queryFn: sdk.queryFn }, async () => {
      yielded = await yieldsWithin(sdk.calls[0]!.prompt, 50);
    });
    expect(yielded).toBe(false);
  });

  it("closes the CLI at the deadline when the control request does not answer (AC-011)", async () => {
    const sdk = fakeSdk({ usage: () => new Promise(() => undefined) });
    const startedAt = Date.now();
    await expect(withClaudeControlQuery({ queryFn: sdk.queryFn, deadline: createReadDeadline(100) }, async (control) =>
      (control.usage as () => Promise<unknown>)())).rejects.toBeInstanceOf(ReadDeadlineExceededError);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(sdk.close).toHaveBeenCalledOnce();
  });

  it("closes a query that opens only after the deadline", async () => {
    const close = vi.fn();
    const queryFn = () => new Promise((resolve) => setTimeout(() => resolve({ close }), 150));
    await expect(withClaudeControlQuery({ queryFn, deadline: createReadDeadline(30) }, async () => "never"))
      .rejects.toBeInstanceOf(ReadDeadlineExceededError);
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
});

describe("ClaudeSdkClient.readUsage", () => {
  it("asks the SDK's usage control request with behaviors skipped, on a query that sends no message", async () => {
    const usage = vi.fn(async () => ({ rate_limits_available: false, rate_limits: null }));
    const sdk = fakeSdk({ usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET: usage });
    const client = new ClaudeSdkClient();
    client.setCachedModuleForTesting({ query: sdk.queryFn });
    await expect(client.readUsage({ deadline: createReadDeadline(5_000) }))
      .resolves.toEqual({ rate_limits_available: false, rate_limits: null });
    expect(usage).toHaveBeenCalledWith({ skipBehaviors: true });
    expect(typeof sdk.calls[0]!.prompt).not.toBe("string");
    expect(sdk.close).toHaveBeenCalledOnce();
  });

  it("throws when the SDK has no usage request", async () => {
    const sdk = fakeSdk({});
    const client = new ClaudeSdkClient();
    client.setCachedModuleForTesting({ query: sdk.queryFn });
    await expect(client.readUsage({ deadline: createReadDeadline(5_000) })).rejects.toThrow("usage request is unavailable");
    expect(sdk.close).toHaveBeenCalledOnce();
  });
});
