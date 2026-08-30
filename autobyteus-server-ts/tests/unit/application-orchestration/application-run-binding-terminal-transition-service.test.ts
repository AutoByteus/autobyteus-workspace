import { describe, expect, it, vi } from "vitest";
import type { ApplicationAgentBindingRecord } from "../../../src/application-orchestration/domain/models.js";
import { ApplicationRunBindingTerminalTransitionService } from "../../../src/application-orchestration/services/application-run-binding-terminal-transition-service.js";

const binding: ApplicationAgentBindingRecord = {
  applicationId: "app-1",
  bindingId: "binding-1",
  launchRequestId: "launch-1",
  status: "ATTACHED",
  executionResourceRef: { source: "bundle", kind: "AGENT", localId: "agent-1" },
  runtime: {
    subject: "AGENT_RUN",
    agentRunId: "agent-run-1",
    definitionId: "agent-def-1",
    members: [],
  },
  createdAt: "2026-08-25T10:00:00.000Z",
  updatedAt: "2026-08-25T10:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
};

describe("ApplicationRunBindingTerminalTransitionService ownership release", () => {
  it("durably persists terminal status before removing the run lookup", async () => {
    const order: string[] = [];
    const persistBinding = vi.fn(async (next: ApplicationAgentBindingRecord) => {
      order.push(`persist:${next.status}`);
      return structuredClone(next);
    });
    const removeBindingLookups = vi.fn(() => { order.push("release-lookup"); });
    const service = new ApplicationRunBindingTerminalTransitionService({
      bindingStore: {
        getBinding: vi.fn(async () => structuredClone(binding)),
        persistBinding,
      } as never,
      lookupStore: { removeBindingLookups } as never,
      ingressService: { appendBindingLifecycleEvent: vi.fn(async () => undefined) } as never,
      lifecycleHub: { publishTerminal: vi.fn() } as never,
    });

    await expect(service.transition({
      applicationId: "app-1",
      bindingId: "binding-1",
      status: "TERMINATED",
      occurredAt: "2026-08-25T10:05:00.000Z",
      reason: "test",
    })).resolves.toMatchObject({
      status: "TERMINATED",
      terminatedAt: "2026-08-25T10:05:00.000Z",
    });
    expect(order).toEqual(["persist:TERMINATED", "release-lookup"]);
  });

  it("does not release lookup ownership when terminal persistence fails", async () => {
    const removeBindingLookups = vi.fn();
    const service = new ApplicationRunBindingTerminalTransitionService({
      bindingStore: {
        getBinding: vi.fn(async () => structuredClone(binding)),
        persistBinding: vi.fn(async () => { throw new Error("persistence unavailable"); }),
      } as never,
      lookupStore: { removeBindingLookups } as never,
      ingressService: { appendBindingLifecycleEvent: vi.fn() } as never,
      lifecycleHub: { publishTerminal: vi.fn() } as never,
    });

    await expect(service.transition({
      applicationId: "app-1",
      bindingId: "binding-1",
      status: "ORPHANED",
      reason: "test",
    })).rejects.toThrow("persistence unavailable");
    expect(removeBindingLookups).not.toHaveBeenCalled();
  });
});
