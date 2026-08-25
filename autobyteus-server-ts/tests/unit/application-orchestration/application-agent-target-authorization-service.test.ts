import { describe, expect, it, vi } from "vitest";
import { ApplicationRunBindingLifecycleHub } from "../../../src/application-orchestration/services/application-run-binding-lifecycle-hub.js";
import {
  ApplicationAgentTargetAuthorizationService,
} from "../../../src/application-orchestration/services/application-agent-target-authorization-service.js";

const agentBinding = {
  bindingId: "binding-1",
  applicationId: "app-1",
  launchRequestId: "launch-1",
  status: "ATTACHED",
  executionResourceRef: { source: "bundle", kind: "AGENT", localId: "agent-1" },
  runtime: {
    subject: "AGENT_RUN",
    agentRunId: "run-1",
    definitionId: "agent-1",
    members: [],
  },
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
} as const;

const createService = (binding: unknown = agentBinding, lifecycleHub = new ApplicationRunBindingLifecycleHub()) =>
  new ApplicationAgentTargetAuthorizationService({
    startupGate: { awaitReady: vi.fn(async () => undefined) } as never,
    availabilityService: { requireApplicationActive: vi.fn(async () => undefined) } as never,
    bindingStore: { getBinding: vi.fn(async () => structuredClone(binding)) } as never,
    lifecycleHub,
  });

describe("ApplicationAgentTargetAuthorizationService", () => {
  it("accepts the exact matching address and rejects extra address or target fields", async () => {
    await expect(createService().authorizeTarget("app-1", {
      bindingId: "binding-1",
      target: { kind: "AGENT_RUN" },
    })).resolves.toMatchObject({ runtimeSubject: "AGENT_RUN", runtimeRunId: "run-1" });
    await expect(createService().authorizeTarget("app-1", {
      bindingId: "binding-1",
      target: { kind: "AGENT_RUN", rawRunId: "run-1" },
    } as never)).rejects.toMatchObject({ code: "INVALID_TARGET" });
    await expect(createService().authorizeTarget("app-1", {
      bindingId: "binding-1",
      target: { kind: "AGENT_RUN" },
      applicationId: "other-app",
    } as never)).rejects.toMatchObject({ code: "TARGET_NOT_AVAILABLE" });
  });

  it("installs the terminal listener before the final binding read", async () => {
    const lifecycleHub = new ApplicationRunBindingLifecycleHub();
    const ended = vi.fn();
    const service = new ApplicationAgentTargetAuthorizationService({
      startupGate: { awaitReady: vi.fn(async () => undefined) } as never,
      availabilityService: { requireApplicationActive: vi.fn(async () => undefined) } as never,
      bindingStore: {
        getBinding: vi.fn(async () => {
          lifecycleHub.publishTerminal({ applicationId: "app-1", bindingId: "binding-1", status: "TERMINATED" });
          return structuredClone(agentBinding);
        }),
      } as never,
      lifecycleHub,
    });
    const lease = await service.openLease("app-1", {
      bindingId: "binding-1",
      target: { kind: "AGENT_RUN" },
    }, ended);
    expect(ended).toHaveBeenCalledOnce();
    lease.release();
  });
});
