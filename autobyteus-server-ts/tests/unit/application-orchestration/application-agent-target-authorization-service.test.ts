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

const teamBinding = {
  ...agentBinding,
  executionResourceRef: { source: "bundle", kind: "AGENT_TEAM", localId: "team-1" },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-1",
    definitionId: "team-1",
    members: [
      { memberAddress: "/research/reviewer", displayName: "Reviewer", agentRunId: "reviewer-run-1" },
      { memberAddress: "/writer", displayName: "Writer", agentRunId: "writer-run-1" },
    ],
  },
} as const;

const createService = (binding: unknown = agentBinding, lifecycleHub = new ApplicationRunBindingLifecycleHub()) =>
  new ApplicationAgentTargetAuthorizationService({
    startupGate: { awaitReady: vi.fn(async () => undefined) } as never,
    availabilityService: { requireApplicationActive: vi.fn(async () => undefined) } as never,
    bindingStore: { getBinding: vi.fn(async () => structuredClone(binding)) } as never,
    lifecycleHub,
  });

describe("ApplicationAgentTargetAuthorizationService", () => {
  it("resolves one frozen Agent root descriptor and rejects non-exact public addresses", async () => {
    const descriptor = await createService().authorizeTarget("app-1", {
      bindingId: "binding-1",
      memberAddress: null,
    });
    expect(descriptor).toEqual({
      applicationId: "app-1",
      address: { bindingId: "binding-1", memberAddress: null },
      binding: agentBinding,
      runtime: {
        subject: "AGENT_RUN",
        agentRunId: "run-1",
        producer: { agentRunId: "run-1", displayName: null },
      },
    });
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.binding.runtime)).toBe(true);
    expect(Object.isFrozen(descriptor.runtime)).toBe(true);

    for (const address of [
      { bindingId: "binding-1", memberAddress: null, applicationId: "other-app" },
      { bindingId: "binding-1", memberAddress: null, target: { kind: "AGENT_RUN" } },
      { bindingId: "binding-1", target: { kind: "AGENT_RUN" } },
    ]) {
      await expect(createService().authorizeTarget("app-1", address as never))
        .rejects.toMatchObject({ code: "INVALID_TARGET" });
    }
  });

  it("derives Team root and exact nested-member runtime projections from one binding read", async () => {
    const service = createService(teamBinding);
    await expect(service.authorizeTarget("app-1", {
      bindingId: "binding-1",
      memberAddress: null,
    })).resolves.toMatchObject({
      runtime: {
        subject: "TEAM_RUN",
        teamRunId: "team-run-1",
        targetAgentRunId: null,
        producers: [
          { agentRunId: "reviewer-run-1", displayName: "Reviewer" },
          { agentRunId: "writer-run-1", displayName: "Writer" },
        ],
      },
    });
    await expect(createService(teamBinding).authorizeTarget("app-1", {
      bindingId: "binding-1",
      memberAddress: "/research/reviewer",
    })).resolves.toMatchObject({
      runtime: {
        subject: "TEAM_RUN",
        teamRunId: "team-run-1",
        targetAgentRunId: "reviewer-run-1",
        producers: [{ agentRunId: "reviewer-run-1", displayName: "Reviewer" }],
      },
    });
    for (const memberAddress of ["/missing", "/reviewer-run-1", "reviewer-run-1"]) {
      await expect(createService(teamBinding).authorizeTarget("app-1", {
        bindingId: "binding-1",
        memberAddress,
      } as never)).rejects.toMatchObject({ code: "INVALID_TARGET" });
    }
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
      memberAddress: null,
    }, ended);
    expect(ended).toHaveBeenCalledOnce();
    lease.release();
  });
});
