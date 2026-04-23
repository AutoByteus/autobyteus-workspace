import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import type { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

describe("MixedTeamRunBackendFactory", () => {
  it("attaches memberRunId and memoryDir for created mixed-runtime members", async () => {
    const capturedContexts: Array<TeamRunContext> = [];
    const factory = new MixedTeamRunBackendFactory({
      memberLayout: new TeamMemberMemoryLayout("/tmp/mixed-team-factory-test-memory"),
      createTeamManager: (context) => {
        capturedContexts.push(context);
        return {
          hasActiveMembers: () => true,
          postMessage: async () => ({ accepted: true }),
          deliverInterAgentMessage: async () => ({ accepted: true }),
          approveToolInvocation: async () => ({ accepted: true }),
          interrupt: async () => ({ accepted: true }),
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
            agentDefinitionId: "agent-coordinator",
            llmModelIdentifier: "local-qwen",
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.AUTOBYTEUS,
          },
          {
            memberName: "Specialist",
            agentDefinitionId: "agent-specialist",
            llmModelIdentifier: "gpt-5.4-mini",
            autoExecuteTools: true,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          },
        ],
      }),
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
      memberRunId: expect.any(String),
      memoryDir: expect.stringContaining(`/agent_teams/${backend.runId}/`),
    });
    expect(specialist).toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberRouteKey: "Specialist",
      memberRunId: expect.any(String),
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
