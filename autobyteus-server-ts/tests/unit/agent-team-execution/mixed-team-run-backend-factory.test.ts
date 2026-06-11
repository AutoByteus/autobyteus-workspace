import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import type { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

describe("MixedTeamRunBackendFactory", () => {
  it("uses preassigned memberRunId and attaches memoryDir for created mixed-runtime members", async () => {
    const capturedContexts: Array<TeamRunContext> = [];
    const factory = new MixedTeamRunBackendFactory({
      memoryLocationService: new AgentMemoryLocationService({ memoryDir: "/tmp/mixed-team-factory-test-memory" }),
      createTeamManager: (context) => {
        capturedContexts.push(context);
        return {
          hasActiveMembers: () => true,
          postMessage: async () => ({ accepted: true }),
          deliverInterAgentMessage: async () => ({ accepted: true }),
          approveToolInvocation: async () => ({ accepted: true }),
          interruptMember: async () => ({ accepted: true }),
          terminate: async () => ({ accepted: true }),
          subscribeToEvents: () => () => undefined,
        };
      },
    });

    const backend = await factory.createBackend(
      new TeamRunConfig({
        teamDefinitionId: "team-def-mixed",
        teamBackendKind: TeamBackendKind.MIXED,
        memberConfigs: [
          {
            memberName: "Coordinator",
            memberRunId: "coordinator_00000000000000000000000000000001",
            agentDefinitionId: "agent-coordinator",
            llmModelIdentifier: "local-qwen",
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.AUTOBYTEUS,
          },
          {
            memberName: "Specialist",
            memberRunId: "specialist_00000000000000000000000000000002",
            agentDefinitionId: "agent-specialist",
            llmModelIdentifier: "gpt-5.4-mini",
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          },
        ],
      }),
      "team_support_00000000000000000000000000000001",
    );

    expect(backend.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(capturedContexts).toHaveLength(1);

    const context = capturedContexts[0]!;
    expect(context.config?.memberConfigs).toHaveLength(2);

    const coordinator = context.config?.memberConfigs.find((member) => member.memberName === "Coordinator");
    const specialist = context.config?.memberConfigs.find((member) => member.memberName === "Specialist");

    expect(coordinator).toMatchObject({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      memberRouteKey: "Coordinator",
      memberRunId: "coordinator_00000000000000000000000000000001",
      memoryDir: expect.stringContaining(`/agent_teams/${backend.runId}/`),
    });
    expect(specialist).toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberRouteKey: "Specialist",
      memberRunId: "specialist_00000000000000000000000000000002",
      memoryDir: expect.stringContaining(`/agent_teams/${backend.runId}/`),
    });

    expect(context.runtimeContext.memberContexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: "Coordinator",
          memberRunId: coordinator?.memberRunId,
          runtimeKind: RuntimeKind.AUTOBYTEUS,
        }),
        expect.objectContaining({
          memberName: "Specialist",
          memberRunId: specialist?.memberRunId,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        }),
      ]),
    );
  });
});
