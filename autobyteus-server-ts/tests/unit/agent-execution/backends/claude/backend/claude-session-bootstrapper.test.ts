import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeSessionBootstrapper } from "../../../../../../src/agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";

const WORKING_DIRECTORY = "/tmp/claude-bootstrapper-workspace";

const createMemberTeamContext = () =>
  new MemberTeamContext({
    teamRunId: "team-run-1",
    teamDefinitionId: "team-def-1",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "Professor",
    memberRouteKey: "professor",
    memberRunId: "run-claude-team",
  });

const createRunContext = (input: {
  autoExecuteTools: boolean;
  memberTeamContext?: MemberTeamContext | null;
}) =>
  new AgentRunContext({
    runId: input.memberTeamContext?.memberRunId ?? "run-claude-standalone",
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      agentDefinitionId: "agent-def-claude",
      llmModelIdentifier: "haiku",
      autoExecuteTools: input.autoExecuteTools,
      workspaceId: "workspace-claude",
      skillAccessMode: SkillAccessMode.NONE,
      memberTeamContext: input.memberTeamContext ?? null,
    }),
    runtimeContext: null,
  });

const createBootstrapper = () =>
  new ClaudeSessionBootstrapper(
    { resolveWorkingDirectory: vi.fn(async () => WORKING_DIRECTORY) } as any,
    { materializeConfiguredClaudeWorkspaceSkills: vi.fn(async () => []) } as any,
    {
      getAgentDefinitionById: vi.fn(async () => ({
        instructions: "Teach the class.",
        description: "Professor",
        skillNames: [],
        toolNames: [],
      })),
    } as any,
    { resolveConfiguredSkillsForAgent: vi.fn(() => []) } as any,
  );

describe("ClaudeSessionBootstrapper", () => {
  it("keeps team autoExecuteTools as AutoByteus approval state while using default provider permission mode", async () => {
    const memberTeamContext = createMemberTeamContext();
    const bootstrapper = createBootstrapper();

    const runContext = await bootstrapper.bootstrapForCreate(
      createRunContext({
        autoExecuteTools: true,
        memberTeamContext,
      }),
    );

    expect(runContext.runtimeContext.sessionConfig).toMatchObject({
      model: "haiku",
      workingDirectory: WORKING_DIRECTORY,
      permissionMode: "default",
      autoExecuteTools: true,
    });
    expect(runContext.runtimeContext.autoExecuteTools).toBe(true);
    expect(runContext.runtimeContext.memberTeamContext).toBe(memberTeamContext);
  });
});
