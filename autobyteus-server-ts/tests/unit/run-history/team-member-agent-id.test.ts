import { describe, expect, it } from "vitest";
import {
  buildTeamMemberAgentId,
  normalizeMemberRouteKey,
} from "../../../src/run-history/utils/team-member-agent-id.js";

describe("team-member-agent-id", () => {
  it("normalizes route key separators and trims whitespace", () => {
    const normalized = normalizeMemberRouteKey(" /coordinator//sub_team\\\\researcher/ ");
    expect(normalized).toBe("coordinator/sub_team/researcher");
  });

  it("creates deterministic memberAgentId from teamRunId + memberRouteKey", () => {
    const first = buildTeamMemberAgentId("team_abc", "coordinator/researcher");
    const second = buildTeamMemberAgentId(" team_abc ", "/coordinator//researcher/");
    expect(first).toBe(second);
    expect(first).toMatch(/^coordinator_researcher_[a-f0-9]{16}$/);
  });

  it("changes memberAgentId when teamRunId differs", () => {
    const left = buildTeamMemberAgentId("team_abc", "coordinator/researcher");
    const right = buildTeamMemberAgentId("team_def", "coordinator/researcher");
    expect(left).not.toBe(right);
  });

  it("throws for empty inputs", () => {
    expect(() => buildTeamMemberAgentId(" ", "coordinator")).toThrow("teamRunId cannot be empty");
    expect(() => buildTeamMemberAgentId("team_abc", "   ")).toThrow(
      "memberRouteKey cannot be empty",
    );
  });

  it("normalizes route text to a readable folder-safe slug", () => {
    const memberAgentId = buildTeamMemberAgentId("team_abc", "Planner Team/Reviewer #1");
    expect(memberAgentId).toMatch(/^planner_team_reviewer_1_[a-f0-9]{16}$/);
  });
});
