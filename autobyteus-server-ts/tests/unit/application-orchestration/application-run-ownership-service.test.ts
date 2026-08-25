import { describe, expect, it, vi } from "vitest";
import type { ApplicationAgentBindingRecord } from "../../../src/application-orchestration/domain/models.js";
import { ApplicationRunOwnershipService } from "../../../src/application-orchestration/services/application-run-ownership-service.js";

const binding = (input: {
  status?: ApplicationAgentBindingRecord["status"];
  applicationId?: string;
  bindingId?: string;
  team?: boolean;
} = {}): ApplicationAgentBindingRecord => ({
  applicationId: input.applicationId ?? "app-1",
  bindingId: input.bindingId ?? "binding-1",
  launchRequestId: "launch-1",
  status: input.status ?? "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: input.team ? "AGENT_TEAM" : "AGENT",
    localId: input.team ? "team-1" : "agent-1",
  },
  runtime: input.team
    ? {
        subject: "TEAM_RUN",
        teamRunId: "team-run-1",
        definitionId: "team-def-1",
        members: [{
          memberAddress: "/worker",
          displayName: "Worker",
          agentRunId: "member-run-1",
          runtimeKind: "AGENT_TEAM_MEMBER",
        }],
      }
    : {
        subject: "AGENT_RUN",
        agentRunId: "agent-run-1",
        definitionId: "agent-def-1",
        members: [],
      },
  createdAt: "2026-08-25T10:00:00.000Z",
  updatedAt: "2026-08-25T10:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

const harness = (input: {
  lookup?: { runId: string; applicationId: string; bindingId: string } | null;
  storedBinding?: ApplicationAgentBindingRecord | null;
  awaitReady?: () => Promise<void>;
} = {}) => {
  const getLookupByRunId = vi.fn(() => input.lookup ?? null);
  const getBinding = vi.fn(async () => input.storedBinding ?? null);
  const awaitReady = vi.fn(input.awaitReady ?? (async () => undefined));
  return {
    awaitReady,
    getLookupByRunId,
    getBinding,
    service: new ApplicationRunOwnershipService({
      startupGate: { awaitReady },
      lookupStore: { getLookupByRunId },
      bindingStore: { getBinding },
    }),
  };
};

describe("ApplicationRunOwnershipService", () => {
  it("awaits startup recovery before consulting ownership evidence", async () => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    const { service, getLookupByRunId } = harness({ awaitReady: () => ready });

    const decision = service.hasLiveRunOwnership({ runId: "agent-run-1" });
    await Promise.resolve();
    expect(getLookupByRunId).not.toHaveBeenCalled();

    release();
    await expect(decision).resolves.toBe(false);
    expect(getLookupByRunId).toHaveBeenCalledWith("agent-run-1");
  });

  it("fails closed without reading ownership evidence when startup recovery fails", async () => {
    const startupError = new Error("startup recovery failed");
    const { service, getLookupByRunId, getBinding } = harness({
      awaitReady: async () => { throw startupError; },
    });

    await expect(service.hasLiveRunOwnership({ runId: "agent-run-1" }))
      .rejects.toBe(startupError);
    expect(getLookupByRunId).not.toHaveBeenCalled();
    expect(getBinding).not.toHaveBeenCalled();
  });

  it.each(["ATTACHED", "TERMINATING", "FAILED"] as const)(
    "keeps a verified %s binding Application-owned",
    async (status) => {
      const storedBinding = binding({ status });
      const { service, getBinding } = harness({
        lookup: { runId: "agent-run-1", applicationId: "app-1", bindingId: "binding-1" },
        storedBinding,
      });

      await expect(service.hasLiveRunOwnership({ runId: "agent-run-1" }))
        .resolves.toBe(true);
      expect(getBinding).toHaveBeenCalledWith("app-1", "binding-1");
    },
  );

  it.each(["TERMINATED", "ORPHANED"] as const)(
    "releases a verified %s binding even before lookup cleanup",
    async (status) => {
      const { service } = harness({
        lookup: { runId: "team-run-1", applicationId: "app-1", bindingId: "binding-1" },
        storedBinding: binding({ status, team: true }),
      });

      await expect(service.hasLiveRunOwnership({ runId: "team-run-1" }))
        .resolves.toBe(false);
    },
  );

  it("uses canonical provenance while a nonterminal Team lookup is being rebuilt", async () => {
    const { service, getBinding } = harness({
      lookup: null,
      storedBinding: binding({ team: true }),
    });

    await expect(service.hasLiveRunOwnership({
      runId: "member-run-1",
      applicationBinding: { applicationId: "app-1", bindingId: "binding-1" },
    })).resolves.toBe(true);
    expect(getBinding).toHaveBeenCalledWith("app-1", "binding-1");
  });

  it("fails closed when lookup and canonical provenance disagree", async () => {
    const { service, getBinding } = harness({
      lookup: { runId: "agent-run-1", applicationId: "other-app", bindingId: "other-binding" },
      storedBinding: binding(),
    });

    await expect(service.hasLiveRunOwnership({
      runId: "agent-run-1",
      applicationBinding: { applicationId: "app-1", bindingId: "binding-1" },
    })).rejects.toThrow("evidence disagrees");
    expect(getBinding).not.toHaveBeenCalled();
  });

  it("fails closed for a missing or identity-mismatched referenced binding", async () => {
    const missing = harness({ lookup: null, storedBinding: null });
    await expect(missing.service.hasLiveRunOwnership({
      runId: "agent-run-1",
      applicationBinding: { applicationId: "app-1", bindingId: "binding-1" },
    })).rejects.toThrow("was not found");

    const mismatch = harness({
      lookup: { runId: "unexpected-run", applicationId: "app-1", bindingId: "binding-1" },
      storedBinding: binding(),
    });
    await expect(mismatch.service.hasLiveRunOwnership({ runId: "unexpected-run" }))
      .rejects.toThrow("does not own run");
  });
});
