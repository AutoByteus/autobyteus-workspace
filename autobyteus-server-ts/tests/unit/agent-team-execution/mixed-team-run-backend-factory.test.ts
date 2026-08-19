import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import type { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

describe("MixedTeamRunBackendFactory", () => {
  it("materializes exact configured AgentRun bindings without route or path identities", async () => {
    const captured: TeamRunContext[] = [];
    const config = testTeamRunConfig({
      rootTeamRunId: "team_support_00000000000000000000000000000001",
      coordinatorAddress: "/Coordinator",
      children: [
        testAgentNode("/Coordinator", {
          agentRunId: "coordinator_00000000000000000000000000000001",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
        }),
        testAgentNode("/Specialist", {
          agentRunId: "specialist_00000000000000000000000000000002",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        }),
      ],
    });
    const factory = new MixedTeamRunBackendFactory({
      createTeamManager: (context) => {
        captured.push(context);
        return {
          isActive: () => true,
          getLeafAgentStatusSnapshots: () => [],
          hasOpenExecutionWork: () => false,
        } as never;
      },
    });

    const backend = await factory.createBackend(config, config.rootTeam.teamRunId);

    expect(backend.teamRunId).toBe(config.rootTeam.teamRunId);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.runtimeContext?.configuredMemberActivationMode).toBe("fresh");
    expect(captured[0]?.runtimeContext?.memberContexts).toEqual([
      expect.objectContaining({
        kind: "agent",
        address: "/Coordinator",
        agentRunId: "coordinator_00000000000000000000000000000001",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      expect.objectContaining({
        kind: "agent",
        address: "/Specialist",
        agentRunId: "specialist_00000000000000000000000000000002",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      }),
    ]);
    expect(captured[0]).not.toHaveProperty("memberRouteKey");
    expect(captured[0]).not.toHaveProperty("memberPath");
  });

  it("marks restored configured members for restoration and ignores legacy native self-bindings", async () => {
    const captured: TeamRunContext[] = [];
    const config = testTeamRunConfig({
      rootTeamRunId: "team-native-restore",
      coordinatorAddress: "/Coordinator",
      children: [
        testAgentNode("/Coordinator", {
          agentRunId: "native-run",
          platformAgentRunId: "native-run",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
        }),
      ],
    });
    const factory = new MixedTeamRunBackendFactory({
      createTeamManager: (context) => {
        captured.push(context);
        return {
          isActive: () => true,
          getLeafAgentStatusSnapshots: () => [],
          hasOpenExecutionWork: () => false,
        } as never;
      },
    });

    await factory.restoreBackend(config, config.rootTeam.teamRunId);

    expect(captured[0]?.runtimeContext?.configuredMemberActivationMode).toBe("restore");
    const native = captured[0]?.runtimeContext?.memberContexts[0];
    expect(native?.kind).toBe("agent");
    expect(native?.getPlatformAgentRunId()).toBeNull();
  });
});
