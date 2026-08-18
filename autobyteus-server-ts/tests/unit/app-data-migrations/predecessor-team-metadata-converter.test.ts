import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { convertLegacyTeamRunMetadata } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-metadata-converter.js";

const agent = (address: string[], runId: string) => ({
  memberKind: "agent",
  memberRouteKey: address.join("/"),
  memberPath: address,
  memberName: address.at(-1),
  memberRunId: runId,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  agentDefinitionId: `definition-${runId}`,
  llmModelIdentifier: "codex:model",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  llmConfig: null,
  workspaceRootPath: "/workspace",
  applicationExecutionContext: null,
  role: null,
  description: null,
});

const metadata = (childTeamRunId: string | null) => ({
  teamRunId: "root-team-run",
  teamDefinitionId: "root-team-definition",
  teamDefinitionName: "Root Team",
  coordinatorMemberRouteKey: "lead",
  createdAt: "2026-08-01T00:00:00.000Z",
  archivedAt: null,
  handoffs: [],
  memberTree: [
    agent(["lead"], "lead-run"),
    {
      memberKind: "agent_team",
      memberRouteKey: "review",
      memberPath: ["review"],
      memberName: "review",
      memberRunId: "wrapper-team-run",
      teamRunId: childTeamRunId,
      teamDefinitionId: "review-team-definition",
      coordinatorMemberRouteKey: "review/reviewer",
      role: null,
      description: null,
      memberTree: [agent(["review", "reviewer"], "reviewer-run")],
    },
  ],
});

describe("convertLegacyTeamRunMetadata", () => {
  it("retains a nonempty explicit nested TeamRun ID even when the wrapper ID differs", () => {
    const converted = convertLegacyTeamRunMetadata(
      metadata("explicit-team-run"),
      "root-team-run",
    );
    const child = converted.rootTeam.children.find((member) => member.kind === "agent_team");
    expect(child).toMatchObject({
      kind: "agent_team",
      teamRunId: "explicit-team-run",
      address: "/review",
    });
  });

  it("falls back to the wrapper memberRunId only when the explicit nested ID is absent", () => {
    const converted = convertLegacyTeamRunMetadata(metadata(null), "root-team-run");
    const child = converted.rootTeam.children.find((member) => member.kind === "agent_team");
    expect(child).toMatchObject({ teamRunId: "wrapper-team-run" });
  });
});
