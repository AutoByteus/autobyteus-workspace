import { describe, expect, it } from "vitest";
import { ChannelBindingTargetOptionsService } from "../../../../src/external-channel/services/channel-binding-target-options-service.js";

describe("ChannelBindingTargetOptionsService", () => {
  it("lists active target options, filters stale entries, and sorts output", async () => {
    const service = new ChannelBindingTargetOptionsService({
      agentManager: {
        listActiveRuns: () => ["agent-2", "agent-1", "agent-stale"],
        getAgentRun: (id: string) => {
          if (id === "agent-1") {
            return {
              agentRunId: "agent-1",
              context: { config: { name: "Alpha Agent" } },
              currentStatus: "IDLE",
            };
          }
          if (id === "agent-2") {
            return {
              agentRunId: "agent-2",
              context: { config: { name: "Beta Agent" } },
              currentStatus: "RUNNING",
            };
          }
          return null;
        },
      },
      teamManager: {
        listActiveRuns: () => ["team-1"],
        getTeamRun: (id: string) =>
          id === "team-1"
            ? {
                teamRunId: "team-1",
                name: "Primary Team",
                currentStatus: "IDLE",
              }
            : null,
      },
    });

    const result = await service.listActiveTargetOptions();

    expect(result).toEqual([
      {
        targetType: "AGENT",
        targetId: "agent-1",
        displayName: "Alpha Agent",
        status: "IDLE",
      },
      {
        targetType: "AGENT",
        targetId: "agent-2",
        displayName: "Beta Agent",
        status: "RUNNING",
      },
      {
        targetType: "TEAM",
        targetId: "team-1",
        displayName: "Primary Team",
        status: "IDLE",
      },
    ]);
  });

  it("validates whether selected target is active", async () => {
    const service = new ChannelBindingTargetOptionsService({
      agentManager: {
        listActiveRuns: () => ["agent-1"],
        getAgentRun: (id: string) => (id === "agent-1" ? { agentRunId: id } : null),
      },
      teamManager: {
        listActiveRuns: () => ["team-1"],
        getTeamRun: (id: string) => (id === "team-1" ? { teamRunId: id } : null),
      },
    });

    await expect(service.isActiveTarget("AGENT", "agent-1")).resolves.toBe(true);
    await expect(service.isActiveTarget("TEAM", "team-1")).resolves.toBe(true);
    await expect(service.isActiveTarget("AGENT", "agent-2")).resolves.toBe(false);
    await expect(service.isActiveTarget("TEAM", "team-2")).resolves.toBe(false);
  });
});
