import { describe, expect, it } from "vitest";
import { evaluateCommandCapability } from "../../../src/runtime-execution/runtime-capability-policy.js";

describe("runtime-capability-policy", () => {
  const unavailableCodex = {
    runtimeKind: "codex_app_server" as const,
    enabled: false,
    reason: "Codex CLI is not available on PATH.",
  };

  it("fails fast for send/approve operations when runtime is unavailable", () => {
    const sendDecision = evaluateCommandCapability(unavailableCodex, "send_turn");
    const approveDecision = evaluateCommandCapability(unavailableCodex, "approve_tool");

    expect(sendDecision.allowed).toBe(false);
    expect(sendDecision.code).toBe("RUNTIME_UNAVAILABLE");
    expect(approveDecision.allowed).toBe(false);
    expect(approveDecision.code).toBe("RUNTIME_UNAVAILABLE");
  });

  it("allows safety operations when runtime is unavailable", () => {
    expect(evaluateCommandCapability(unavailableCodex, "interrupt_run").allowed).toBe(true);
    expect(evaluateCommandCapability(unavailableCodex, "terminate_run").allowed).toBe(true);
  });
});
