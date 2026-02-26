import { describe, expect, it } from "vitest";
import { EnvelopeBuilder } from "../../../src/distributed/envelope/envelope-builder.js";
import { RunVersionFencingPolicy, StaleRunVersionError } from "../../../src/distributed/policies/run-version-fencing-policy.js";
import { TeamRunRepository } from "../../../src/distributed/team-run-orchestrator/team-run-repository.js";

describe("Run-version fencing integration", () => {
  it("drops stale envelopes and accepts current run version", async () => {
    const repository = new TeamRunRepository();
    repository.createRunRecord({
      teamRunId: "run-1",
      teamDefinitionId: "def-1",
      coordinatorMemberName: "leader",
      runVersion: 2,
      hostNodeId: "node-host",
      placementByMember: {},
      status: "running",
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    });

    const fencingPolicy = new RunVersionFencingPolicy((teamRunId) =>
      repository.resolveCurrentRunVersion(teamRunId)
    );
    const envelopeBuilder = new EnvelopeBuilder();
    const staleEnvelope = envelopeBuilder.buildEnvelope({
      teamRunId: "run-1",
      runVersion: 1,
      kind: "TOOL_APPROVAL",
      payload: { toolInvocationId: "tool-1", isApproved: true },
    });
    const currentEnvelope = envelopeBuilder.buildEnvelope({
      teamRunId: "run-1",
      runVersion: 2,
      kind: "TOOL_APPROVAL",
      payload: { toolInvocationId: "tool-2", isApproved: true },
    });

    await expect(
      fencingPolicy.assertCurrentRunVersion(staleEnvelope.teamRunId, staleEnvelope.runVersion)
    ).rejects.toBeInstanceOf(StaleRunVersionError);
    await expect(
      fencingPolicy.dropIfStale(staleEnvelope.teamRunId, staleEnvelope.runVersion)
    ).resolves.toBe(true);

    await expect(
      fencingPolicy.assertCurrentRunVersion(currentEnvelope.teamRunId, currentEnvelope.runVersion)
    ).resolves.toBeUndefined();
    await expect(
      fencingPolicy.dropIfStale(currentEnvelope.teamRunId, currentEnvelope.runVersion)
    ).resolves.toBe(false);
  });
});
