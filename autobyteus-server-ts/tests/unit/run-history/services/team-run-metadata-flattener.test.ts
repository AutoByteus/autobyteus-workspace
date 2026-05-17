import { describe, expect, it } from "vitest";
import {
  resolveTeamRunLeafAgentByRouteKey,
  resolveTeamRunMemberByRouteKey,
} from "../../../../src/run-history/services/team-run-metadata-flattener.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMetadata,
  TeamRunSubTeamMemberMetadata,
} from "../../../../src/run-history/store/team-run-metadata-types.js";

const buildAgent = (
  memberRouteKey: string,
  memberPath: string[],
  overrides: Partial<TeamRunAgentMemberMetadata> = {},
): TeamRunAgentMemberMetadata => ({
  memberKind: "agent",
  memberRouteKey,
  memberPath,
  memberName: memberPath.at(-1) ?? memberRouteKey,
  memberRunId: `${memberRouteKey.replace(/\//g, "-")}-run`,
  role: null,
  description: null,
  runtimeKind: "autobyteus",
  platformAgentRunId: null,
  agentDefinitionId: `${memberRouteKey}-definition`,
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  skillAccessMode: "PRELOADED_ONLY",
  llmConfig: null,
  workspaceRootPath: "/tmp/workspace",
  ...overrides,
});

const buildSubTeam = (
  memberRouteKey: string,
  memberTree: TeamRunAgentMemberMetadata[],
): TeamRunSubTeamMemberMetadata => ({
  memberKind: "agent_team",
  memberRouteKey,
  memberPath: [memberRouteKey],
  memberName: memberRouteKey,
  memberRunId: `${memberRouteKey}-handle`,
  role: null,
  description: null,
  teamDefinitionId: `${memberRouteKey}-definition`,
  teamRunId: `${memberRouteKey}-run`,
  coordinatorMemberRouteKey: "review_lead",
  memberTree,
});

const buildMetadata = (): TeamRunMetadata => ({
  teamRunId: "team-1",
  teamDefinitionId: "delivery-team",
  teamDefinitionName: "Delivery Team",
  coordinatorMemberRouteKey: "program_manager",
  createdAt: "2026-05-17T00:00:00.000Z",
  updatedAt: "2026-05-17T00:01:00.000Z",
  archivedAt: null,
  memberTree: [
    buildSubTeam("BuildSquad", [
      buildAgent("BuildSquad/review_lead", ["BuildSquad", "review_lead"], {
        memberName: "review_lead",
      }),
    ]),
    buildSubTeam("AuditSquad", [
      buildAgent("AuditSquad/review_lead", ["AuditSquad", "review_lead"], {
        memberName: "review_lead",
      }),
    ]),
  ],
});

describe("team-run-metadata-flattener route-key resolution", () => {
  it("requires canonical route keys when duplicate nested leaves share a member name", () => {
    const metadata = buildMetadata();

    expect(resolveTeamRunMemberByRouteKey(metadata, "review_lead")).toBeNull();
    expect(resolveTeamRunLeafAgentByRouteKey(metadata, "review_lead")).toBeNull();
    expect(
      resolveTeamRunLeafAgentByRouteKey(metadata, "BuildSquad/review_lead")?.memberRunId,
    ).toBe("BuildSquad-review_lead-run");
    expect(
      resolveTeamRunLeafAgentByRouteKey(metadata, "AuditSquad/review_lead")?.memberRunId,
    ).toBe("AuditSquad-review_lead-run");
  });
});
