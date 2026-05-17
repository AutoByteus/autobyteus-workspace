import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedSubTeamRunFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.js";
import { TeamRunMetadataMapper } from "../../../src/agent-team-execution/services/team-run-metadata-mapper.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";

describe("TeamRunMetadataMapper", () => {
  it("captures child subteam run IDs and nested leaf platform IDs in recursive metadata", async () => {
    const nestedMemberRunId = "team-1/ReviewTeam/Reviewer";
    const config = new TeamRunConfig({
      teamDefinitionId: "root-team",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: "Lead",
      coordinatorMemberRouteKey: "Lead",
      memberTree: [
        {
          memberKind: "agent_team",
          memberName: "ReviewTeam",
          memberPath: ["ReviewTeam"],
          memberRouteKey: "ReviewTeam",
          memberRunId: "team-1/ReviewTeam",
          teamDefinitionId: "review-team",
          coordinatorMemberRouteKey: "ReviewTeam/Reviewer",
          memberConfigs: [
            {
              memberKind: "agent",
              memberName: "Reviewer",
              memberPath: ["ReviewTeam", "Reviewer"],
              memberRouteKey: "ReviewTeam/Reviewer",
              memberRunId: nestedMemberRunId,
              agentDefinitionId: "agent-reviewer",
              llmModelIdentifier: "gpt-test",
              autoExecuteTools: false,
              skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              workspaceRootPath: "/tmp/workspace",
              llmConfig: null,
            },
          ],
        },
      ],
    });
    const subTeamContext = new MixedSubTeamMemberContext({
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "team-1/ReviewTeam",
      teamDefinitionId: "review-team",
      childTeamRunId: "child-review-team-1",
    });
    subTeamContext.childRuntimeContext = new MixedTeamRunContext({
      coordinatorMemberRouteKey: "Reviewer",
      memberContexts: [
        new MixedAgentMemberContext({
          memberName: "Reviewer",
          memberPath: ["Reviewer"],
          memberRouteKey: "Reviewer",
          memberRunId: nestedMemberRunId,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "thread-reviewer-1",
        }),
      ],
    });
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-1",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: "Lead",
        coordinatorMemberRouteKey: "Lead",
        config,
        runtimeContext: new MixedTeamRunContext({
          coordinatorMemberRouteKey: "Lead",
          memberContexts: [subTeamContext],
        }),
      }),
      backend: {
        runId: "team-1",
        teamBackendKind: TeamBackendKind.MIXED,
        isActive: () => true,
        getRuntimeContext: () => null,
        subscribeToEvents: () => () => undefined,
        getStatus: () => "IDLE",
        postMessage: vi.fn(),
        deliverInterAgentMessage: vi.fn(),
        approveToolInvocation: vi.fn(),
        interrupt: vi.fn(),
        terminate: vi.fn(),
      } as any,
    });
    const mapper = new TeamRunMetadataMapper({
      teamDefinitionService: {
        getDefinitionById: vi.fn(async () => ({ name: "Root Team" })),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as any,
      memberLayout: new TeamMemberMemoryLayout("/tmp/team-memory"),
    });

    const metadata = await mapper.buildMetadata(run);
    const subteam = metadata.memberTree[0];

    expect(subteam).toMatchObject({
      memberKind: "agent_team",
      teamRunId: "child-review-team-1",
    });
    if (subteam?.memberKind !== "agent_team") {
      throw new Error("Expected subteam metadata");
    }
    expect(subteam.memberTree[0]).toMatchObject({
      memberKind: "agent",
      memberRunId: nestedMemberRunId,
      platformAgentRunId: "thread-reviewer-1",
    });
  });

  it("restores recursive child runtime identity for lazy mixed subteam restoration", async () => {
    const metadata: TeamRunMetadata = {
      teamRunId: "parent-1",
      teamDefinitionId: "root-team",
      teamDefinitionName: "Root Team",
      coordinatorMemberRouteKey: "Lead",
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:00.000Z",
      memberTree: [
        {
          memberKind: "agent_team",
          memberName: "ReviewTeam",
          memberPath: ["ReviewTeam"],
          memberRouteKey: "ReviewTeam",
          memberRunId: "parent-1/ReviewTeam",
          teamDefinitionId: "review-team",
          teamRunId: "child-review-1",
          coordinatorMemberRouteKey: "ReviewTeam/Reviewer",
          role: null,
          description: null,
          memberTree: [
            {
              memberKind: "agent",
              memberName: "Reviewer",
              memberPath: ["ReviewTeam", "Reviewer"],
              memberRouteKey: "ReviewTeam/Reviewer",
              memberRunId: "parent-1/ReviewTeam/Reviewer",
              role: null,
              description: null,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              platformAgentRunId: "thread-reviewer-1",
              agentDefinitionId: "agent-reviewer",
              llmModelIdentifier: "gpt-test",
              autoExecuteTools: false,
              skillAccessMode: SkillAccessMode.NONE,
              llmConfig: null,
              workspaceRootPath: null,
              applicationExecutionContext: null,
            },
            {
              memberKind: "agent",
              memberName: "Observer",
              memberPath: ["ReviewTeam", "Observer"],
              memberRouteKey: "ReviewTeam/Observer",
              memberRunId: "parent-1/ReviewTeam/Observer",
              role: null,
              description: null,
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              platformAgentRunId: "thread-observer-1",
              agentDefinitionId: "agent-observer",
              llmModelIdentifier: "gpt-test",
              autoExecuteTools: false,
              skillAccessMode: SkillAccessMode.NONE,
              llmConfig: null,
              workspaceRootPath: null,
              applicationExecutionContext: null,
            },
          ],
        },
      ],
    };
    const mapper = new TeamRunMetadataMapper({
      teamDefinitionService: {
        getDefinitionById: vi.fn(async () => ({ name: "Root Team" })),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
        getWorkspaceById: vi.fn(),
      } as any,
      memberLayout: new TeamMemberMemoryLayout("/tmp/team-memory"),
    });

    const restoreContext = await mapper.buildRestoreContext(metadata);
    const rootRuntime = restoreContext.runtimeContext as MixedTeamRunContext;
    const subTeamContext = rootRuntime.memberContexts[0];

    expect(subTeamContext).toMatchObject({
      memberKind: "agent_team",
      childTeamRunId: "child-review-1",
    });
    if (!(subTeamContext instanceof MixedSubTeamMemberContext)) {
      throw new Error("Expected restored subteam context.");
    }
    expect(subTeamContext.childRuntimeContext?.memberContexts[0]).toMatchObject({
      memberKind: "agent",
      platformAgentRunId: "thread-reviewer-1",
    });

    const refreshedMetadata = await mapper.buildMetadata(new TeamRun({
      context: restoreContext,
      backend: {
        runId: metadata.teamRunId,
        teamBackendKind: TeamBackendKind.MIXED,
        isActive: () => true,
        getRuntimeContext: () => null,
        subscribeToEvents: () => () => undefined,
        getStatus: () => "IDLE",
        postMessage: vi.fn(),
        deliverInterAgentMessage: vi.fn(),
        approveToolInvocation: vi.fn(),
        interrupt: vi.fn(),
        terminate: vi.fn(),
      } as any,
    }));
    const refreshedSubTeam = refreshedMetadata.memberTree[0];
    if (refreshedSubTeam?.memberKind !== "agent_team") {
      throw new Error("Expected refreshed subteam metadata.");
    }
    expect(refreshedSubTeam.memberTree[0]).toMatchObject({
      memberKind: "agent",
      platformAgentRunId: "thread-reviewer-1",
    });

    const contextBuilder = new MixedTeamRunBackendFactory({
      memberLayout: new TeamMemberMemoryLayout("/tmp/mixed-restore-test-memory"),
    });
    const subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (config, teamRunId, restoreRuntimeContext) =>
        contextBuilder.buildTeamRunContext(config, teamRunId, restoreRuntimeContext ?? null),
      createTeamManager: () => ({
        hasActiveMembers: () => true,
        postMessage: vi.fn(async () => ({ accepted: true })),
        deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
        approveToolInvocation: vi.fn(async () => ({ accepted: true })),
        interrupt: vi.fn(async () => ({ accepted: true })),
        terminate: vi.fn(async () => ({ accepted: true })),
        subscribeToEvents: vi.fn(() => () => undefined),
      }),
    });
    const subTeamConfig = restoreContext.config?.memberTree[0];
    if (subTeamConfig?.memberKind !== "agent_team") {
      throw new Error("Expected restored subteam config.");
    }

    const childRun = await subTeamRunFactory.createOrRestore({
      parentTeamRunId: metadata.teamRunId,
      subTeamConfig,
      childTeamRunId: subTeamContext.childTeamRunId,
      restoreRuntimeContext: subTeamContext.childRuntimeContext,
    });
    const childRuntime = childRun.getRuntimeContext() as MixedTeamRunContext;

    expect(childRuntime.coordinatorMemberRouteKey).toBe("Reviewer");
    expect(childRuntime.memberContexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: "Reviewer",
          memberPath: ["Reviewer"],
          memberRouteKey: "Reviewer",
          platformAgentRunId: "thread-reviewer-1",
        }),
        expect.objectContaining({
          memberName: "Observer",
          memberPath: ["Observer"],
          memberRouteKey: "Observer",
          platformAgentRunId: "thread-observer-1",
        }),
      ]),
    );
  });
});
