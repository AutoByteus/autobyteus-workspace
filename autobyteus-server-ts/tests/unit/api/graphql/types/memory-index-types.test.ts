import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  MemorySnapshotPage,
  MemorySnapshotSummary,
  TeamMemberMemorySnapshotSummary,
  TeamRunMemorySnapshotPage,
  TeamRunMemorySnapshotSummary,
} from "../../../../../src/api/graphql/types/memory-index.js";

describe("memory index graphql types", () => {
  it("supports assigning fields", () => {
    const summary = new MemorySnapshotSummary();
    summary.runId = "agent-1";
    summary.hasWorkingContext = true;
    summary.hasEpisodic = false;
    summary.hasSemantic = true;
    summary.hasRawTraces = true;
    summary.hasRawArchive = false;

    const page = new MemorySnapshotPage();
    page.entries = [summary];
    page.total = 1;
    page.page = 1;
    page.pageSize = 50;
    page.totalPages = 1;

    expect(page.entries[0]?.runId).toBe("agent-1");
    expect(page.total).toBe(1);
  });

  it("supports assigning team snapshot fields", () => {
    const member = new TeamMemberMemorySnapshotSummary();
    member.memberRouteKey = "coordinator";
    member.memberName = "Coordinator";
    member.memberRunId = "run-1";
    member.hasWorkingContext = true;
    member.hasEpisodic = false;
    member.hasSemantic = true;
    member.hasRawTraces = true;
    member.hasRawArchive = false;

    const team = new TeamRunMemorySnapshotSummary();
    team.teamRunId = "team-1";
    team.teamDefinitionId = "team-def-1";
    team.teamDefinitionName = "Alpha Team";
    team.members = [member];

    const page = new TeamRunMemorySnapshotPage();
    page.entries = [team];
    page.total = 1;
    page.page = 1;
    page.pageSize = 50;
    page.totalPages = 1;

    expect(page.entries[0]?.teamRunId).toBe("team-1");
    expect(page.entries[0]?.members[0]?.memberRunId).toBe("run-1");
  });
});
