import { describe, expect, it, vi } from "vitest";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";

const buildActiveDuplicateWorkerResolver = (memoryDir: string) => {
  const teamRun = {
    runId: "root-team-run",
    config: {
      memberTree: [
        {
          memberKind: "agent_team",
          memberName: "ReviewSquad",
          memberPath: ["ReviewSquad"],
          memberRouteKey: "ReviewSquad",
          memberRunId: "review-child-team-run",
          childTeamRunId: "review-child-team-run",
          teamDefinitionId: "review-team",
          coordinatorMemberRouteKey: "ReviewSquad/worker",
          memberConfigs: [
            {
              memberKind: "agent",
              memberName: "worker",
              memberPath: ["ReviewSquad", "worker"],
              memberRouteKey: "ReviewSquad/worker",
              memberRunId: "review-worker-run",
              agentDefinitionId: "agent-review-worker",
            },
          ],
        },
        {
          memberKind: "agent_team",
          memberName: "BuildSquad",
          memberPath: ["BuildSquad"],
          memberRouteKey: "BuildSquad",
          memberRunId: "build-child-team-run",
          childTeamRunId: "build-child-team-run",
          teamDefinitionId: "build-team",
          coordinatorMemberRouteKey: "BuildSquad/worker",
          memberConfigs: [
            {
              memberKind: "agent",
              memberName: "worker",
              memberPath: ["BuildSquad", "worker"],
              memberRouteKey: "BuildSquad/worker",
              memberRunId: "build-worker-run",
              agentDefinitionId: "agent-build-worker",
            },
          ],
        },
      ],
    },
    getRuntimeContext: () => ({ memberContexts: [] }),
  };
  const teamRunManager = {
    getTeamRun: vi.fn((teamRunId: string) => teamRunId === "root-team-run" ? teamRun : null),
    listActiveRuns: vi.fn().mockReturnValue(["root-team-run"]),
  };
  return {
    resolver: new ContextFileOwnerResolver({
      teamRunManager,
      teamRunMetadataService: {
        readMetadata: vi.fn().mockResolvedValue(null),
        listTeamRunIds: vi.fn().mockResolvedValue([]),
      },
      memoryDir,
    } as any),
    layout: new AgentMemoryLayout(memoryDir),
  };
};

describe("ContextFileOwnerResolver", () => {
  it("ignores caller-supplied memberRunId and resolves the active member owner", async () => {
    const memoryDir = "/tmp/context-file-owner-resolver-test";
    const layout = new AgentMemoryLayout(memoryDir);
    const teamRunManager = {
      getTeamRun: vi.fn().mockReturnValue({
        runId: "team-1",
        config: null,
        getRuntimeContext: () => ({
          memberContexts: [
            {
              memberKind: "agent",
              memberName: "Worker",
              memberPath: ["worker"],
              memberRouteKey: "worker",
              memberRunId: "worker_00000000000000000000000000000001",
              getPlatformAgentRunId: () => "platform-worker",
            },
          ],
        }),
      }),
      listActiveRuns: vi.fn().mockReturnValue(["team-1"]),
    };
    const resolver = new ContextFileOwnerResolver({
      teamRunManager,
      teamRunMetadataService: {
        readMetadata: vi.fn(),
        listTeamRunIds: vi.fn(),
      },
      memoryDir,
    } as any);

    const resolved = await resolver.resolveFinalOwner({
      kind: "team_member_final",
      teamRunId: "team-1",
      memberRouteKey: "worker",
      memberRunId: "spoofed_00000000000000000000000000000001",
    } as any);

    expect(resolved).toMatchObject({
      kind: "team_member_final",
      teamRunId: "team-1",
      memberRouteKey: "worker",
      rootTeamRunId: "team-1",
      teamRunPath: [],
      memberRunId: "worker_00000000000000000000000000000001",
      memoryDir: layout.getTeamAgentRunDirPath(
        { rootTeamRunId: "team-1", teamRunPath: [] },
        "worker_00000000000000000000000000000001",
      ),
    });
  });

  it("resolves nested stored owners to the hierarchical root team memory directory", async () => {
    const memoryDir = "/tmp/context-file-owner-resolver-nested-test";
    const layout = new AgentMemoryLayout(memoryDir);
    const readMetadata = vi.fn().mockResolvedValue({
      teamRunId: "root-team-run",
      teamDefinitionId: "team-def",
      teamDefinitionName: "Root Team",
      coordinatorMemberRouteKey: "ReviewSquad/reviewer",
      createdAt: "2026-06-11T00:00:00.000Z",
      memberTree: [
        {
          memberKind: "agent_team",
          memberRouteKey: "ReviewSquad",
          memberPath: ["ReviewSquad"],
          memberName: "ReviewSquad",
          memberRunId: "review-squad-wrapper",
          role: null,
          description: null,
          teamDefinitionId: "review-team",
          teamRunId: "child-review-team-run",
          coordinatorMemberRouteKey: "ReviewSquad/reviewer",
          memberTree: [
            {
              memberKind: "agent",
              memberRouteKey: "ReviewSquad/reviewer",
              memberPath: ["ReviewSquad", "reviewer"],
              memberName: "reviewer",
              memberRunId: "reviewer_opaque_id",
              runtimeKind: "autobyteus",
              platformAgentRunId: null,
              agentDefinitionId: "agent-reviewer",
              llmModelIdentifier: "model-1",
              autoExecuteTools: false,
              skillAccessMode: "PRELOADED_ONLY",
              llmConfig: null,
              workspaceRootPath: null,
            },
          ],
        },
      ],
    });
    const resolver = new ContextFileOwnerResolver({
      teamRunManager: {
        getTeamRun: vi.fn().mockReturnValue(null),
        listActiveRuns: vi.fn().mockReturnValue([]),
      },
      teamRunMetadataService: {
        readMetadata,
        listTeamRunIds: vi.fn().mockResolvedValue([]),
      },
      memoryDir,
    } as any);

    const resolved = await resolver.resolveFinalOwner({
      kind: "team_member_final",
      teamRunId: "root-team-run",
      memberRouteKey: "ReviewSquad/reviewer",
    });

    expect(resolved).toMatchObject({
      kind: "team_member_final",
      teamRunId: "root-team-run",
      memberRouteKey: "ReviewSquad/reviewer",
      rootTeamRunId: "root-team-run",
      teamRunPath: ["child-review-team-run"],
      memberRunId: "reviewer_opaque_id",
      memoryDir: layout.getTeamAgentRunDirPath(
        { rootTeamRunId: "root-team-run", teamRunPath: ["child-review-team-run"] },
        "reviewer_opaque_id",
      ),
    });
  });

  it("rejects ambiguous active route suffixes instead of choosing the first nested match", async () => {
    const { resolver } = buildActiveDuplicateWorkerResolver(
      "/tmp/context-file-owner-resolver-active-ambiguous-test",
    );

    await expect(resolver.resolveFinalOwner({
      kind: "team_member_final",
      teamRunId: "root-team-run",
      memberRouteKey: "worker",
    })).rejects.toThrow(
      "Unable to resolve context-file owner member 'worker' for team run 'root-team-run'.",
    );
  });

  it("resolves fully-qualified active route keys when sibling suffixes are duplicated", async () => {
    const memoryDir = "/tmp/context-file-owner-resolver-active-qualified-test";
    const { resolver, layout } = buildActiveDuplicateWorkerResolver(memoryDir);

    const resolved = await resolver.resolveFinalOwner({
      kind: "team_member_final",
      teamRunId: "root-team-run",
      memberRouteKey: "ReviewSquad/worker",
    });

    expect(resolved).toMatchObject({
      kind: "team_member_final",
      teamRunId: "root-team-run",
      memberRouteKey: "ReviewSquad/worker",
      rootTeamRunId: "root-team-run",
      teamRunPath: ["review-child-team-run"],
      memberRunId: "review-worker-run",
      memoryDir: layout.getTeamAgentRunDirPath(
        { rootTeamRunId: "root-team-run", teamRunPath: ["review-child-team-run"] },
        "review-worker-run",
      ),
    });
  });

  it("resolves an active suffix selector scoped to a child team run", async () => {
    const memoryDir = "/tmp/context-file-owner-resolver-active-child-scope-test";
    const { resolver, layout } = buildActiveDuplicateWorkerResolver(memoryDir);

    const resolved = await resolver.resolveFinalOwner({
      kind: "team_member_final",
      teamRunId: "review-child-team-run",
      memberRouteKey: "worker",
    });

    expect(resolved).toMatchObject({
      kind: "team_member_final",
      teamRunId: "review-child-team-run",
      memberRouteKey: "worker",
      rootTeamRunId: "root-team-run",
      teamRunPath: ["review-child-team-run"],
      memberRunId: "review-worker-run",
      memoryDir: layout.getTeamAgentRunDirPath(
        { rootTeamRunId: "root-team-run", teamRunPath: ["review-child-team-run"] },
        "review-worker-run",
      ),
    });
  });
});
