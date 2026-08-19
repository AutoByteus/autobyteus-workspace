import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeSessionBootstrapper } from "../../../../../../src/agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberTeamContext } from "../../../../../fixtures/current-team-run-fixtures.js";

const WORKING_DIRECTORY = "/tmp/claude-bootstrapper-workspace";

const createMemberTeamContext = () =>
  testMemberTeamContext({
    teamRunId: "team-run-1",
    rootTeamRunId: "team-run-1",
    teamDefinitionId: "team-def-1",
    memberAddress: "/Professor",
    coordinatorAddress: "/Professor",
    agentRunId: "run-claude-team",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    deliverInterAgentMessage: vi.fn(async () => undefined) as any,
  });

const createRunContext = (input: {
  autoExecuteTools: boolean;
  memberTeamContext?: MemberTeamContext | null;
}) =>
  new AgentRunContext({
    runId: input.memberTeamContext?.agentRunId ?? "run-claude-standalone",
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
        name: "Professor agent",
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
    expect(runContext.config.memberTeamContext).toBe(memberTeamContext);
    expect(runContext.runtimeContext.carpenterSystemPrompt).toContain("## Agent Identity");
    expect(runContext.runtimeContext.carpenterSystemPrompt).toContain("## AgentTeam Addressing");
    expect(runContext.runtimeContext.carpenterSystemPrompt).toContain("## AgentTeam Collaboration");
    expect(runContext.runtimeContext.carpenterSystemPrompt).not.toContain("## Team Runtime");
    expect(runContext.runtimeContext.carpenterSystemPrompt).not.toContain("## Working Environment");
    expect(runContext.runtimeContext.carpenterSystemPrompt).not.toContain("## Bash Operating Practice");
    expect(runContext.runtimeContext.carpenterSystemPrompt).not.toContain("## File And Directory Practice");
  });
});
