import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { CodexTeamManager } from "../../../src/agent-team-execution/backends/codex/codex-team-manager.js";
import {
  CodexTeamMemberContext,
  CodexTeamRunContext,
} from "../../../src/agent-team-execution/backends/codex/codex-team-run-context.js";
import { ClaudeTeamManager } from "../../../src/agent-team-execution/backends/claude/claude-team-manager.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "../../../src/agent-team-execution/backends/claude/claude-team-run-context.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import {
  MixedAgentMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const teamRunId = "team-focused-interrupt-1";

const memberInputs = [
  {
    memberName: "Solution Designer",
    memberPath: ["solution_designer"],
    memberRouteKey: "solution_designer",
    memberRunId: "team-1::solution_designer",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  },
  {
    memberName: "Code Reviewer",
    memberPath: ["code_reviewer"],
    memberRouteKey: "code_reviewer",
    memberRunId: "team-1::code_reviewer",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  },
];

const createAgentRunConfig = (input: typeof memberInputs[number]) =>
  new AgentRunConfig({
    agentDefinitionId: `agent-${input.memberRouteKey}`,
    llmModelIdentifier:
      input.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "claude-sonnet" : "gpt-5.4-mini",
    autoExecuteTools: false,
    workspaceId: `workspace-${input.memberRouteKey}`,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: input.runtimeKind,
  });

const createTeamRunConfig = (teamBackendKind: TeamBackendKind) =>
  new TeamRunConfig({
    teamDefinitionId: "team-def-focused-interrupt",
    teamBackendKind,
    coordinatorMemberName: "Solution Designer",
    memberConfigs: memberInputs.map((member) => ({
      ...member,
      agentDefinitionId: `agent-${member.memberRouteKey}`,
      llmModelIdentifier:
        member.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "claude-sonnet" : "gpt-5.4-mini",
      autoExecuteTools: false,
      workspaceId: `workspace-${member.memberRouteKey}`,
      skillAccessMode: SkillAccessMode.NONE,
    })),
  });

const createFakeAgentRun = () => ({
  isActive: vi.fn(() => true),
  interrupt: vi.fn().mockResolvedValue({ accepted: true }),
  getStatusSnapshot: vi.fn(() => ({ status: "running", can_interrupt: true })),
  subscribeToEvents: vi.fn(() => () => undefined),
});

const attachMemberRuns = (manager: unknown) => {
  const solutionDesignerRun = createFakeAgentRun();
  const codeReviewerRun = createFakeAgentRun();
  const memberRuns = (manager as { memberRuns?: Map<string, unknown> }).memberRuns;

  if (memberRuns) {
    memberRuns.set("solution_designer", solutionDesignerRun);
    memberRuns.set("code_reviewer", codeReviewerRun);
    return { solutionDesignerRun, codeReviewerRun };
  }

  const mixed = manager as {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    memberRegistry: {
      handles: Map<string, unknown>;
    };
  };
  const contexts = mixed.teamContext.runtimeContext.memberContexts;
  const makeHandle = (
    context: MixedAgentMemberContext,
    run: ReturnType<typeof createFakeAgentRun>,
  ) => ({
    context,
    isActive: () => true,
    getStatusSnapshot: run.getStatusSnapshot,
    postMessage: vi.fn(),
    deliverInterMemberMessage: vi.fn(),
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(async () => run.interrupt()),
    terminate: vi.fn(),
    dispose: vi.fn(),
  });

  const solutionDesignerContext = contexts.find(
    (context) => context.memberRouteKey === "solution_designer",
  ) as MixedAgentMemberContext;
  const codeReviewerContext = contexts.find(
    (context) => context.memberRouteKey === "code_reviewer",
  ) as MixedAgentMemberContext;

  mixed.memberRegistry.handles.set(
    "solution_designer",
    makeHandle(solutionDesignerContext, solutionDesignerRun),
  );
  mixed.memberRegistry.handles.set(
    "code_reviewer",
    makeHandle(codeReviewerContext, codeReviewerRun),
  );

  return { solutionDesignerRun, codeReviewerRun };
};

const createCodexManager = () => {
  const context = new TeamRunContext({
    runId: teamRunId,
    teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
    config: createTeamRunConfig(TeamBackendKind.CODEX_APP_SERVER),
    runtimeContext: new CodexTeamRunContext({
      coordinatorMemberRouteKey: "solution_designer",
      memberContexts: memberInputs.map(
        (member) =>
          new CodexTeamMemberContext({
            memberName: member.memberName,
            memberPath: member.memberPath,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            agentRunConfig: createAgentRunConfig({
              ...member,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            }),
            threadId: null,
          }),
      ),
    }),
  });

  return new CodexTeamManager(context, {
    agentRunManager: {} as never,
    memberTeamContextBuilder: {} as never,
  });
};

const createClaudeManager = () => {
  const context = new TeamRunContext({
    runId: teamRunId,
    teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
    config: createTeamRunConfig(TeamBackendKind.CLAUDE_AGENT_SDK),
    runtimeContext: new ClaudeTeamRunContext({
      coordinatorMemberRouteKey: "solution_designer",
      memberContexts: memberInputs.map(
        (member) =>
          new ClaudeTeamMemberContext({
            memberName: member.memberName,
            memberPath: member.memberPath,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            agentRunConfig: createAgentRunConfig({
              ...member,
              runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
            }),
            sessionId: null,
          }),
      ),
    }),
  });

  return new ClaudeTeamManager(context, {
    agentRunManager: {} as never,
    agentDefinitionService: {} as never,
    memberTeamContextBuilder: {} as never,
  });
};

const createMixedManager = () => {
  const context = new TeamRunContext({
    runId: teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    config: createTeamRunConfig(TeamBackendKind.MIXED),
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: "solution_designer",
      memberContexts: memberInputs.map(
        (member) =>
          new MixedAgentMemberContext({
            memberName: member.memberName,
            memberPath: member.memberPath,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            runtimeKind: member.runtimeKind,
            platformAgentRunId: null,
          }),
      ),
    }),
  });

  return new MixedTeamManager(context);
};

describe.each([
  ["CodexTeamManager", createCodexManager],
  ["ClaudeTeamManager", createClaudeManager],
  ["MixedTeamManager", createMixedManager],
])("%s focused member interrupt routing", (_managerName, createManager) => {
  it("interrupts only the requested member route key", async () => {
    const manager = createManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager);

    await expect(
      manager.interruptMember("code_reviewer", "team-1::code_reviewer"),
    ).resolves.toEqual({ accepted: true });

    expect(codeReviewerRun.interrupt).toHaveBeenCalledTimes(1);
    expect(solutionDesignerRun.interrupt).not.toHaveBeenCalled();
  });

  it("rejects run-id guard mismatches without retargeting by run id", async () => {
    const manager = createManager();
    const { solutionDesignerRun, codeReviewerRun } = attachMemberRuns(manager);

    await expect(
      manager.interruptMember("code_reviewer", "team-1::solution_designer"),
    ).resolves.toMatchObject({
      accepted: false,
      code: "TARGET_MEMBER_RUN_MISMATCH",
    });

    expect(codeReviewerRun.interrupt).not.toHaveBeenCalled();
    expect(solutionDesignerRun.interrupt).not.toHaveBeenCalled();
  });
});
