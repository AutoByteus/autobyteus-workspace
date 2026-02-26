import { describe, expect, it } from "vitest";
import {
  buildTeamMemberRunId,
  normalizeMemberRouteKey,
} from "../../../src/run-history/utils/team-member-run-id.js";

describe("team-member-run-id", () => {
  it("normalizes route key separators and trims whitespace", () => {
    const normalized = normalizeMemberRouteKey(" /coordinator//sub_team\\\\researcher/ ");
    expect(normalized).toBe("coordinator/sub_team/researcher");
  });

  it("creates deterministic memberRunId from teamRunId + memberRouteKey", () => {
    const first = buildTeamMemberRunId("team_abc", "coordinator/researcher");
    const second = buildTeamMemberRunId(" team_abc ", "/coordinator//researcher/");
    expect(first).toBe(second);
    expect(first).toMatch(/^coordinator_researcher_[a-f0-9]{16}$/);
  });

  it("changes memberRunId when teamRunId differs", () => {
    const left = buildTeamMemberRunId("team_abc", "coordinator/researcher");
    const right = buildTeamMemberRunId("team_def", "coordinator/researcher");
    expect(left).not.toBe(right);
  });

  it("throws for empty inputs", () => {
    expect(() => buildTeamMemberRunId(" ", "coordinator")).toThrow("teamRunId cannot be empty");
    expect(() => buildTeamMemberRunId("team_abc", "   ")).toThrow(
      "memberRouteKey cannot be empty",
    );
  });

  it("normalizes route text to a readable folder-safe slug", () => {
    const memberRunId = buildTeamMemberRunId("team_abc", "Planner Team/Reviewer #1");
    expect(memberRunId).toMatch(/^planner_team_reviewer_1_[a-f0-9]{16}$/);
  });
});
