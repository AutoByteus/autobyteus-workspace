import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import type { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { testAgentNode, testMemberTaskRootResolver, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";
import { createNoopAgentToolMcpRunSessionReleaser } from "../../fixtures/agent-tool-mcp-run-session-releaser-fixtures.js";

const callbacks = () => ({
  taskRootResolver: testMemberTaskRootResolver(),
  publish: () => undefined,
  deliverInterAgentMessage: async () => ({ accepted: true as const }),
  acceptPlatformBinding: async () => undefined,
});

const createManagerStub = () => ({
  isActive: () => true,
  getLeafAgentStatusSnapshots: () => [],
  hasOpenExecutionWork: () => false,
}) as never;

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
    const releaser = createNoopAgentToolMcpRunSessionReleaser();
    const managerInputs: unknown[] = [];
    const factory = new MixedTeamRunBackendFactory({
      agentToolMcpRunSessionReleaser: releaser,
      createTeamManager: (input) => {
        managerInputs.push(input);
        captured.push(input.context);
        return createManagerStub();
      },
    });

    const backend = await factory.createBackend(config, config.rootTeam.teamRunId, callbacks());

    expect(backend.teamRunId).toBe(config.rootTeam.teamRunId);
    expect(captured).toHaveLength(1);
    expect(managerInputs[0]).toEqual(expect.objectContaining({
      agentToolMcpRunSessionReleaser: releaser,
      context: captured[0],
    }));
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
    const releaser = createNoopAgentToolMcpRunSessionReleaser();
    const managerInputs: unknown[] = [];
    const factory = new MixedTeamRunBackendFactory({
      agentToolMcpRunSessionReleaser: releaser,
      createTeamManager: (input) => {
        managerInputs.push(input);
        captured.push(input.context);
        return createManagerStub();
      },
    });

    await factory.restoreBackend(config, config.rootTeam.teamRunId, callbacks());

    expect(captured[0]?.runtimeContext?.configuredMemberActivationMode).toBe("restore");
    const native = captured[0]?.runtimeContext?.memberContexts[0];
    expect(native?.kind).toBe("agent");
    expect(native?.getPlatformAgentRunId()).toBeNull();
    expect(managerInputs[0]).toEqual(expect.objectContaining({
      agentToolMcpRunSessionReleaser: releaser,
      context: captured[0],
    }));
    for (const value of [undefined, null]) {
      await expect(factory.createBackend(
        config,
        config.rootTeam.teamRunId,
        value as never,
      )).rejects.toThrow("Complete MixedTeamRunCallbacks are required");
    }
  });

  it("requires both the exact run-session releaser and manager construction capability", () => {
    const valid = {
      agentToolMcpRunSessionReleaser:
        createNoopAgentToolMcpRunSessionReleaser(),
      createTeamManager: () => createManagerStub(),
    };
    for (const property of [
      "agentToolMcpRunSessionReleaser",
      "createTeamManager",
    ] as const) {
      for (const value of ["omitted", null, undefined] as const) {
        const options = { ...valid } as Record<string, unknown>;
        if (value === "omitted") delete options[property];
        else options[property] = value;
        expect(
          () => Reflect.construct(MixedTeamRunBackendFactory, [options]),
          `${property}:${String(value)}`,
        ).toThrow("Complete MixedTeamRunBackendFactory options are required.");
      }
    }
  });
});
