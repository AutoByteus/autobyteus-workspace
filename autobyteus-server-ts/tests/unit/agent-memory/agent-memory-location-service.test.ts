import path from "node:path";
import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import type { TeamRunAgentMemberMetadata, TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";

const memoryDir = "/tmp/agent-memory-location-service-test";
const layout = new AgentMemoryLayout(memoryDir);

const agent = (
  memberRouteKey: string,
  memberPath: string[],
  memberRunId: string,
): TeamRunAgentMemberMetadata => ({
  memberKind: "agent",
  memberRouteKey,
  memberPath,
  memberName: memberPath.at(-1) ?? memberRouteKey,
  memberRunId,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
  agentDefinitionId: "agent-definition-1",
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  llmConfig: null,
  workspaceRootPath: null,
});

const metadata: TeamRunMetadata = {
  teamRunId: "root-team-run",
  teamDefinitionId: "team-definition-1",
  teamDefinitionName: "Root Team",
  coordinatorMemberRouteKey: "writer",
  createdAt: "2026-06-11T00:00:00.000Z",
  memberTree: [
    agent("writer", ["writer"], "writer_historical_opaque_id"),
    {
      memberKind: "agent_team",
      memberRouteKey: "ReviewSquad",
      memberPath: ["ReviewSquad"],
      memberName: "ReviewSquad",
      memberRunId: "review-child-team-run",
      role: null,
      description: null,
      teamDefinitionId: "review-team",
      teamRunId: "review-child-team-run",
      coordinatorMemberRouteKey: "ReviewSquad/reviewer",
      memberTree: [
        agent("ReviewSquad/reviewer", ["ReviewSquad", "reviewer"], "reviewer_opaque_id"),
        {
          memberKind: "agent_team",
          memberRouteKey: "ReviewSquad/DeepSquad",
          memberPath: ["ReviewSquad", "DeepSquad"],
          memberName: "DeepSquad",
          memberRunId: "deep-child-team-run",
          role: null,
          description: null,
          teamDefinitionId: "deep-review-team",
          teamRunId: "deep-child-team-run",
          coordinatorMemberRouteKey: "ReviewSquad/DeepSquad/editor",
          memberTree: [
            agent("ReviewSquad/DeepSquad/editor", ["ReviewSquad", "DeepSquad", "editor"], "editor_opaque_id"),
          ],
        },
      ],
    },
  ],
};

describe("AgentMemoryLocationService", () => {
  it("derives direct, nested, and deep team-member memory locations under the root team hierarchy", () => {
    const service = new AgentMemoryLocationService({ memoryDir });

    expect(service.listTeamMemberLocationsFromMetadata(metadata)).toEqual([
      expect.objectContaining({
        rootTeamRunId: "root-team-run",
        teamRunPath: [],
        memberRunId: "writer_historical_opaque_id",
        memberRouteKey: "writer",
        memoryDir: layout.getTeamAgentRunDirPath(
          { rootTeamRunId: "root-team-run", teamRunPath: [] },
          "writer_historical_opaque_id",
        ),
      }),
      expect.objectContaining({
        rootTeamRunId: "root-team-run",
        teamRunPath: ["review-child-team-run"],
        memberRunId: "reviewer_opaque_id",
        memberRouteKey: "ReviewSquad/reviewer",
        memoryDir: layout.getTeamAgentRunDirPath(
          { rootTeamRunId: "root-team-run", teamRunPath: ["review-child-team-run"] },
          "reviewer_opaque_id",
        ),
      }),
      expect.objectContaining({
        rootTeamRunId: "root-team-run",
        teamRunPath: ["review-child-team-run", "deep-child-team-run"],
        memberRunId: "editor_opaque_id",
        memberRouteKey: "ReviewSquad/DeepSquad/editor",
        memoryDir: layout.getTeamAgentRunDirPath(
          { rootTeamRunId: "root-team-run", teamRunPath: ["review-child-team-run", "deep-child-team-run"] },
          "editor_opaque_id",
        ),
      }),
    ]);
  });

  it("resolves by route key, member path, or opaque member run id without generated-shape validation", () => {
    const service = new AgentMemoryLocationService({ memoryDir });

    expect(service.resolveTeamMemberLocationFromMetadata(metadata, { memberRouteKey: "ReviewSquad/reviewer" }))
      .toMatchObject({
        teamRunPath: ["review-child-team-run"],
        memberRunId: "reviewer_opaque_id",
      });
    expect(service.resolveTeamMemberLocationFromMetadata(metadata, { memberRouteKey: "reviewer" }))
      .toMatchObject({
        teamRunPath: ["review-child-team-run"],
        memberRunId: "reviewer_opaque_id",
      });
    expect(service.resolveTeamMemberLocationFromMetadata(metadata, { memberPath: ["ReviewSquad", "DeepSquad", "editor"] }))
      .toMatchObject({
        teamRunPath: ["review-child-team-run", "deep-child-team-run"],
        memberRunId: "editor_opaque_id",
      });
    expect(service.resolveTeamMemberLocationFromMetadata(metadata, { memberRunId: "writer_historical_opaque_id" }))
      .toMatchObject({
        teamRunPath: [],
        memberRouteKey: "writer",
      });
  });

  it("scopes child-team lookups without adding a historical nested root-flat fallback", () => {
    const service = new AgentMemoryLocationService({ memoryDir });

    const childTarget = service.resolveTeamMemberLocationFromMetadata(
      metadata,
      { memberRouteKey: "ReviewSquad/reviewer" },
      "review-child-team-run",
    );

    expect(childTarget).toMatchObject({
      rootTeamRunId: "root-team-run",
      teamRunPath: ["review-child-team-run"],
      memberRunId: "reviewer_opaque_id",
    });
    expect(childTarget?.memoryDir).toBe(path.join(
      memoryDir,
      "agent_teams",
      "root-team-run",
      "review-child-team-run",
      "reviewer_opaque_id",
    ));
    expect(childTarget?.memoryDir).not.toBe(path.join(
      memoryDir,
      "agent_teams",
      "review-child-team-run",
      "reviewer_opaque_id",
    ));
  });

  it("derives task-agent memory under the logical member team path with the task-agent run id as the leaf", () => {
    const service = new AgentMemoryLocationService({ memoryDir });
    const logicalMemberLocation = service.resolveTeamMemberLocationFromMetadata(
      metadata,
      { memberRouteKey: "ReviewSquad/reviewer" },
    );
    if (!logicalMemberLocation) {
      throw new Error("Expected logical member location.");
    }

    expect(service.getTaskAgentLocation({
      logicalMemberLocation,
      taskAgentRunId: "task_agent_opaque_id",
      logicalMemberRunId: logicalMemberLocation.memberRunId,
      logicalMemberRouteKey: logicalMemberLocation.memberRouteKey,
    })).toMatchObject({
      rootTeamRunId: "root-team-run",
      teamRunPath: ["review-child-team-run"],
      taskAgentRunId: "task_agent_opaque_id",
      logicalMemberRunId: "reviewer_opaque_id",
      memoryDir: layout.getTeamAgentRunDirPath(
        { rootTeamRunId: "root-team-run", teamRunPath: ["review-child-team-run"] },
        "task_agent_opaque_id",
      ),
    });
  });
});
