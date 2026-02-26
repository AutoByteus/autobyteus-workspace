import { describe, expect, it } from "vitest";
import {
  MissingInvocationVersionError,
  StaleInvocationVersionError,
  ToolApprovalConcurrencyPolicy,
} from "../../../src/distributed/policies/tool-approval-concurrency-policy.js";

describe("ToolApprovalConcurrencyPolicy", () => {
  it("accepts matching invocation version for registered pending invocation", () => {
    const policy = new ToolApprovalConcurrencyPolicy();
    policy.registerPendingInvocation("run-1", "inv-1", 2);

    expect(() => policy.validateInvocationVersion("run-1", "inv-1", 2)).not.toThrow();
  });

  it("rejects stale invocation versions", () => {
    const policy = new ToolApprovalConcurrencyPolicy();
    policy.registerPendingInvocation("run-1", "inv-2", 3);

    expect(() => policy.validateInvocationVersion("run-1", "inv-2", 2)).toThrow(
      StaleInvocationVersionError,
    );
  });

  it("rejects missing invocation state", () => {
    const policy = new ToolApprovalConcurrencyPolicy();
    expect(() => policy.validateInvocationVersion("run-1", "missing", 1)).toThrow(
      MissingInvocationVersionError,
    );
  });

  it("clears invocation state after completion", () => {
    const policy = new ToolApprovalConcurrencyPolicy();
    policy.registerPendingInvocation("run-1", "inv-3", 1);
    policy.completeInvocation("run-1", "inv-3");

    expect(() => policy.validateInvocationVersion("run-1", "inv-3", 1)).toThrow(
      MissingInvocationVersionError,
    );
  });

  it("isolates the same invocation id across different team runs", () => {
    const policy = new ToolApprovalConcurrencyPolicy();
    policy.registerPendingInvocation("run-1", "inv-shared", 2);
    policy.registerPendingInvocation("run-2", "inv-shared", 1);

    expect(() => policy.validateInvocationVersion("run-1", "inv-shared", 2)).not.toThrow();
    expect(() => policy.validateInvocationVersion("run-2", "inv-shared", 1)).not.toThrow();
    expect(() => policy.validateInvocationVersion("run-2", "inv-shared", 2)).toThrow(
      StaleInvocationVersionError,
    );
  });
});
