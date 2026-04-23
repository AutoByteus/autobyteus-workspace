import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { CodexTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/codex/codex-team-run-backend-factory.js";
import {
  CodexTeamMemberContext,
  CodexTeamRunContext,
} from "../../../src/agent-team-execution/backends/codex/codex-team-run-context.js";
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

const createConfig = () =>
  new TeamRunConfig({
    teamDefinitionId: "team-def-codex-1",
    teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
    memberConfigs: [
      {
        memberName: "Coordinator",
        memberRouteKey: "coord-route",
        memberRunId: "coord-run",
        agentDefinitionId: "agent-coordinator",
        llmModelIdentifier: "gpt-5.4-mini",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        workspaceId: "workspace-coordinator",
        llmConfig: { reasoning_effort: "medium" },
      } satisfies TeamMemberRunConfig,
      {
        memberName: "Researcher",
        agentDefinitionId: "agent-researcher",
        llmModelIdentifier: "gpt-5.4-mini",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.WORKSPACE,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        workspaceId: "workspace-researcher",
        llmConfig: { reasoning_effort: "high" },
      } satisfies TeamMemberRunConfig,
    ],
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe("CodexTeamRunBackendFactory integration", () => {
  it("creates a backend with hydrated member runtime context from TeamRunConfig", async () => {
    const createdContexts: Array<TeamRunContext<CodexTeamRunContext>> = [];
    const createdManagers: ReturnType<typeof createTeamManagerStub>[] = [];
    const factory = new CodexTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<CodexTeamRunContext>) => {
        createdContexts.push(context);
        const manager = createTeamManagerStub();
        createdManagers.push(manager);
        return manager as any;
      }) as any,
    });

    const backend = await factory.createBackend(createConfig());

    expect(createdContexts).toHaveLength(1);
    expect(createdManagers).toHaveLength(1);

    const context = createdContexts[0];
    expect(context.runId).toBeTruthy();
    expect(context.teamBackendKind).toBe(TeamBackendKind.CODEX_APP_SERVER);
    expect(context.config?.teamDefinitionId).toBe("team-def-codex-1");
    expect(context.runtimeContext.coordinatorMemberRouteKey).toBeNull();
    expect(context.runtimeContext.memberContexts).toHaveLength(2);

    const coordinatorContext = context.runtimeContext.memberContexts[0];
    expect(coordinatorContext).toBeInstanceOf(CodexTeamMemberContext);
    expect(coordinatorContext.memberName).toBe("Coordinator");
    expect(coordinatorContext.memberRouteKey).toBe("coord-route");
    expect(coordinatorContext.memberRunId).toBe("coord-run");
    expect(coordinatorContext.threadId).toBeNull();
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
    expect(backend.teamBackendKind).toBe(TeamBackendKind.CODEX_APP_SERVER);
    expect(backend.getRuntimeContext()).toBe(context.runtimeContext);
    expect(backend.isActive()).toBe(true);
  });

  it("restores a backend from the provided runtime context", async () => {
    const createdContexts: Array<TeamRunContext<CodexTeamRunContext>> = [];
    const manager = createTeamManagerStub();
    const factory = new CodexTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<CodexTeamRunContext>) => {
        createdContexts.push(context);
        return manager as any;
      }) as any,
    });

    const restoreContext = new TeamRunContext({
      runId: "team-codex-restore-1",
      teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
      config: createConfig(),
      runtimeContext: new CodexTeamRunContext({
        coordinatorMemberRouteKey: "coord-route",
        memberContexts: [
          new CodexTeamMemberContext({
            memberName: "Coordinator",
            memberRouteKey: "coord-route",
            memberRunId: "coord-run",
            threadId: "thread-coord-1",
            agentRunConfig: {
              agentDefinitionId: "agent-coordinator",
              llmModelIdentifier: "gpt-5.4-mini",
              autoExecuteTools: false,
              workspaceId: "workspace-coordinator",
              llmConfig: { reasoning_effort: "medium" },
              skillAccessMode: SkillAccessMode.NONE,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              memberTeamContext: null,
            } as any,
          }),
        ],
      }),
    });

    const backend = await factory.restoreBackend(restoreContext);

    expect(createdContexts).toEqual([restoreContext]);
    expect(backend.runId).toBe("team-codex-restore-1");
    expect(backend.getRuntimeContext()).toBe(restoreContext.runtimeContext);
    expect(backend.isActive()).toBe(true);
  });
});
