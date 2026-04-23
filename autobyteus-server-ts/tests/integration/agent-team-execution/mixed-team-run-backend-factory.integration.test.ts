import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import {
  MixedTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { buildTeamMemberRunId } from "../../../src/run-history/utils/team-member-run-id.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

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
    teamDefinitionId: "team-def-mixed-1",
    teamBackendKind: TeamBackendKind.MIXED,
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
        memberName: "Reviewer",
        agentDefinitionId: "agent-reviewer",
        llmModelIdentifier: "haiku",
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.WORKSPACE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        workspaceId: "workspace-reviewer",
        llmConfig: { reasoning_effort: "high" },
      } satisfies TeamMemberRunConfig,
    ],
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe("MixedTeamRunBackendFactory integration", () => {
  it("creates a backend with hydrated mixed member runtime context from TeamRunConfig", async () => {
    const createdContexts: Array<TeamRunContext<MixedTeamRunContext>> = [];
    const createdManagers: ReturnType<typeof createTeamManagerStub>[] = [];
    const factory = new MixedTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<MixedTeamRunContext>) => {
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
    expect(context.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(context.config?.teamDefinitionId).toBe("team-def-mixed-1");
    expect(context.runtimeContext.coordinatorMemberRouteKey).toBeNull();
    expect(context.runtimeContext.memberContexts).toHaveLength(2);

    const coordinatorContext = context.runtimeContext.memberContexts[0];
    expect(coordinatorContext).toBeInstanceOf(MixedTeamMemberContext);
    expect(coordinatorContext.memberName).toBe("Coordinator");
    expect(coordinatorContext.memberRouteKey).toBe("coord-route");
    expect(coordinatorContext.memberRunId).toBe("coord-run");
    expect(coordinatorContext.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
    expect(coordinatorContext.platformAgentRunId).toBeNull();

    const reviewerContext = context.runtimeContext.memberContexts[1];
    expect(reviewerContext.memberName).toBe("Reviewer");
    expect(reviewerContext.memberRouteKey).toBe("Reviewer");
    expect(reviewerContext.memberRunId).toBe(
      buildTeamMemberRunId(context.runId, reviewerContext.memberRouteKey),
    );
    expect(reviewerContext.runtimeKind).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
    expect(reviewerContext.platformAgentRunId).toBeNull();

    expect(backend.runId).toBe(context.runId);
    expect(backend.teamBackendKind).toBe(TeamBackendKind.MIXED);
    expect(backend.getRuntimeContext()).toBe(context.runtimeContext);
    expect(backend.isActive()).toBe(true);
  });

  it("restores a backend from the provided mixed runtime context", async () => {
    const createdContexts: Array<TeamRunContext<MixedTeamRunContext>> = [];
    const manager = createTeamManagerStub();
    const factory = new MixedTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<MixedTeamRunContext>) => {
        createdContexts.push(context);
        return manager as any;
      }) as any,
    });

    const restoreContext = new TeamRunContext({
      runId: "team-mixed-restore-1",
      teamBackendKind: TeamBackendKind.MIXED,
      config: createConfig(),
      runtimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: "coord-route",
        memberContexts: [
          new MixedTeamMemberContext({
            memberName: "Coordinator",
            memberRouteKey: "coord-route",
            memberRunId: "coord-run",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
            platformAgentRunId: "thread-coord-1",
          }),
        ],
      }),
    });

    const backend = await factory.restoreBackend(restoreContext);

    expect(createdContexts).toEqual([restoreContext]);
    expect(backend.runId).toBe("team-mixed-restore-1");
    expect(backend.getRuntimeContext()).toBe(restoreContext.runtimeContext);
    expect(backend.isActive()).toBe(true);
  });
});
