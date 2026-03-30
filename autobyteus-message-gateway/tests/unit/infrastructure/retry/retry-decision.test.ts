import { describe, expect, it } from "vitest";
import { isTerminalRetryFailure } from "../../../../src/infrastructure/retry/retry-decision.js";

describe("isTerminalRetryFailure", () => {
  it("treats explicit retryable errors as non-terminal", () => {
    expect(
      isTerminalRetryFailure(Object.assign(new Error("timeout"), { retryable: true })),
    ).toBe(false);
  });

  it("treats explicit non-retryable errors as terminal", () => {
    expect(
      isTerminalRetryFailure(Object.assign(new Error("bad request"), { retryable: false })),
    ).toBe(true);
  });

  it("treats 4xx status errors as terminal", () => {
    expect(
      isTerminalRetryFailure(Object.assign(new Error("forbidden"), { status: 403 })),
    ).toBe(true);
  });

  it("treats 5xx status errors as non-terminal by default", () => {
    expect(
      isTerminalRetryFailure(Object.assign(new Error("upstream down"), { status: 503 })),
    ).toBe(false);
  });
});
