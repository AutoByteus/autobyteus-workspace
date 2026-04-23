import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { ClaudeTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/claude/claude-team-run-backend-factory.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "../../../src/agent-team-execution/backends/claude/claude-team-run-context.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { buildTeamMemberRunId } from "../../../src/run-history/utils/team-member-run-id.js";

const createTeamManagerStub = () => ({
  hasActiveMembers: vi.fn(() => true),
  postMessage: vi.fn().mockResolvedValue({ accepted: true }),
  deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
  interrupt: vi.fn().mockResolvedValue({ accepted: true }),
  terminate: vi.fn().mockResolvedValue({ accepted: true }),
  subscribeToEvents: vi.fn(() => () => {}),
});

const createAgentDefinitionServiceStub = () => ({
  getAgentDefinitionById: vi.fn().mockResolvedValue({
    toolNames: [],
  }),
});

const createConfig = () =>
  new TeamRunConfig({
    teamDefinitionId: "team-def-claude-1",
    teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
    memberConfigs: [
      {
        memberName: "Coordinator",
        memberRouteKey: "coord-route",
        memberRunId: "coord-run",
        agentDefinitionId: "agent-coordinator",
        llmModelIdentifier: "haiku",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        workspaceId: "workspace-coordinator",
        llmConfig: { reasoning_effort: "medium" },
      } satisfies TeamMemberRunConfig,
      {
        memberName: "Researcher",
        agentDefinitionId: "agent-researcher",
        llmModelIdentifier: "haiku",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.WORKSPACE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        workspaceId: "workspace-researcher",
        llmConfig: { reasoning_effort: "high" },
      } satisfies TeamMemberRunConfig,
    ],
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe("ClaudeTeamRunBackendFactory integration", () => {
  it("creates a backend with hydrated member runtime context from TeamRunConfig", async () => {
    const createdContexts: Array<TeamRunContext<ClaudeTeamRunContext>> = [];
    const createdManagers: ReturnType<typeof createTeamManagerStub>[] = [];
    const agentDefinitionService = createAgentDefinitionServiceStub();
    const factory = new ClaudeTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<ClaudeTeamRunContext>) => {
        createdContexts.push(context);
        const manager = createTeamManagerStub();
        createdManagers.push(manager);
        return manager as any;
      }) as any,
      agentDefinitionService: agentDefinitionService as any,
    });

    const backend = await factory.createBackend(createConfig());

    expect(createdContexts).toHaveLength(1);
    expect(createdManagers).toHaveLength(1);
    expect(agentDefinitionService.getAgentDefinitionById).toHaveBeenCalledTimes(2);

    const context = createdContexts[0];
    expect(context.runId).toBeTruthy();
    expect(context.teamBackendKind).toBe(TeamBackendKind.CLAUDE_AGENT_SDK);
    expect(context.config?.teamDefinitionId).toBe("team-def-claude-1");
    expect(context.runtimeContext.coordinatorMemberRouteKey).toBeNull();
    expect(context.runtimeContext.memberContexts).toHaveLength(2);

    const coordinatorContext = context.runtimeContext.memberContexts[0];
    expect(coordinatorContext).toBeInstanceOf(ClaudeTeamMemberContext);
    expect(coordinatorContext.memberName).toBe("Coordinator");
    expect(coordinatorContext.memberRouteKey).toBe("coord-route");
    expect(coordinatorContext.memberRunId).toBe("coord-run");
    expect(coordinatorContext.sessionId).toBeNull();
    expect(coordinatorContext.agentRunConfig.workspaceId).toBe("workspace-coordinator");
    expect(coordinatorContext.agentRunConfig.llmConfig).toEqual({
      reasoning_effort: "medium",
    });

    const researcherContext = context.runtimeContext.memberContexts[1];
    expect(researcherContext.memberName).toBe("Researcher");
    expect(researcherContext.memberRouteKey).toBe("Researcher");
    expect(researcherContext.memberRunId).toBe(
      buildTeamMemberRunId(context.runId, researcherContext.memberRouteKey),
    );
    expect(researcherContext.agentRunConfig.workspaceId).toBe("workspace-researcher");
    expect(researcherContext.agentRunConfig.autoExecuteTools).toBe(true);
    expect(researcherContext.agentRunConfig.skillAccessMode).toBe(SkillAccessMode.WORKSPACE);
    expect(researcherContext.agentRunConfig.llmConfig).toEqual({
      reasoning_effort: "high",
    });

    expect(backend.runId).toBe(context.runId);
    expect(backend.teamBackendKind).toBe(TeamBackendKind.CLAUDE_AGENT_SDK);
    expect(backend.getRuntimeContext()).toBe(context.runtimeContext);
    expect(backend.isActive()).toBe(true);
  });

  it("restores a backend from the provided runtime context", async () => {
    const createdContexts: Array<TeamRunContext<ClaudeTeamRunContext>> = [];
    const manager = createTeamManagerStub();
    const agentDefinitionService = createAgentDefinitionServiceStub();
    const factory = new ClaudeTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<ClaudeTeamRunContext>) => {
        createdContexts.push(context);
        return manager as any;
      }) as any,
      agentDefinitionService: agentDefinitionService as any,
    });

    const restoreContext = new TeamRunContext({
      runId: "team-claude-restore-1",
      teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
      config: createConfig(),
      runtimeContext: new ClaudeTeamRunContext({
        coordinatorMemberRouteKey: "coord-route",
        memberContexts: [
          new ClaudeTeamMemberContext({
            memberName: "Coordinator",
            memberRouteKey: "coord-route",
            memberRunId: "coord-run",
            sessionId: "session-coord-1",
            agentRunConfig: {
              agentDefinitionId: "agent-coordinator",
              llmModelIdentifier: "haiku",
              autoExecuteTools: false,
              workspaceId: "workspace-coordinator",
              llmConfig: { reasoning_effort: "medium" },
              skillAccessMode: SkillAccessMode.NONE,
              runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
              memberTeamContext: null,
            } as any,
          }),
        ],
      }),
    });

    const backend = await factory.restoreBackend(restoreContext);

    expect(createdContexts).toEqual([restoreContext]);
    expect(backend.runId).toBe("team-claude-restore-1");
    expect(backend.getRuntimeContext()).toBe(restoreContext.runtimeContext);
    expect(backend.isActive()).toBe(true);
  });
});
