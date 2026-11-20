import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  AgentEpisode,
  AgentEpisodePage,
  AgentMemoryAttribution,
  AgentOrgRunMemoryPage,
  AgentOrgRunMemorySummary,
  AgentOrgWithMemoryPage,
  AgentOrgWithMemorySummary,
  AgentTeamRunMemoryPage,
  AgentTeamRunMemorySummary,
  AgentTeamWithMemoryPage,
  AgentTeamWithMemorySummary,
  AgentWithMemoryPage,
  AgentWithMemorySummary,
  CollaborationMemberMemoryTargetSummary,
  MemoryAvailabilitySummary,
  MemoryGroupMember,
  MemoryGroupMemberKind,
} from "../../../../../src/api/graphql/types/memory-explorer-schema.js";

describe("memory explorer graphql types", () => {
  const memory = () => {
    const summary = new MemoryAvailabilitySummary();
    summary.latestMemoryAt = "2026-01-01T00:00:00Z";
    summary.hasWorkJournal = true;
    summary.hasRawTraces = true;
    summary.hasRawArchive = false;
    return summary;
  };

  it("supports assigning agent cards, episodes and group members", () => {
    const agent = new AgentWithMemorySummary();
    agent.attribution = AgentMemoryAttribution.DEFINITION;
    agent.agentDefinitionId = "codex";
    agent.displayName = "Codex";
    agent.stableId = "codex";
    agent.runCount = 2;

    const agentsPage = new AgentWithMemoryPage();
    agentsPage.entries = [agent];
    agentsPage.total = 1;
    agentsPage.page = 1;
    agentsPage.pageSize = 25;
    agentsPage.totalPages = 1;

    const episode = new AgentEpisode();
    episode.runId = "run-1";
    episode.place = { kind: "TEAM", name: "Software Engineering Team" };
    episode.memory = memory();

    const episodesPage = new AgentEpisodePage();
    episodesPage.entries = [episode];
    episodesPage.total = 1;
    episodesPage.page = 1;
    episodesPage.pageSize = 25;
    episodesPage.totalPages = 1;

    const member = new MemoryGroupMember();
    member.kind = MemoryGroupMemberKind.AGENT;
    member.id = "codex";
    member.name = "Codex";
    member.shared = true;
    member.memberCount = null;

    expect(agentsPage.entries[0]?.displayName).toBe("Codex");
    expect(episodesPage.entries[0]?.place?.name).toBe("Software Engineering Team");
    expect(member.shared).toBe(true);
  });

  it("supports assigning team home, team run, and member target fields", () => {
    const team = new AgentTeamWithMemorySummary();
    team.teamDefinitionId = "software-engineering-team";
    team.teamDefinitionName = "Software Engineering Team";
    team.teamRunCount = 3;
    team.memberMemoryCount = 6;
    team.memberCount = 4;
    team.memory = memory();

    const teamsPage = new AgentTeamWithMemoryPage();
    teamsPage.entries = [team];
    teamsPage.total = 1;
    teamsPage.page = 1;
    teamsPage.pageSize = 25;
    teamsPage.totalPages = 1;

    const member = new CollaborationMemberMemoryTargetSummary();
    member.memberAddress = "/solution_designer";
    member.displayName = "solution_designer";
    member.agentRunId = "solution_designer_1";
    member.memory = memory();

    const run = new AgentTeamRunMemorySummary();
    run.teamRunId = "team-1";
    run.teamDefinitionId = "software-engineering-team";
    run.teamDefinitionName = "Software Engineering Team";
    run.memory = memory();
    run.memberTargets = [member];

    const runsPage = new AgentTeamRunMemoryPage();
    runsPage.entries = [run];
    runsPage.total = 1;
    runsPage.page = 1;
    runsPage.pageSize = 25;
    runsPage.totalPages = 1;

    expect(teamsPage.entries[0]?.teamRunCount).toBe(3);
    expect(runsPage.entries[0]?.memberTargets[0]?.agentRunId).toBe("solution_designer_1");
  });

  it("supports assigning org home, org run, and shared member target fields", () => {
    const org = new AgentOrgWithMemorySummary();
    org.orgDefinitionId = "software-development-department";
    org.orgDefinitionName = "Software Development Department";
    org.orgRunCount = 2;
    org.memberMemoryCount = 9;
    org.memberCount = 3;
    org.memory = memory();

    const orgsPage = new AgentOrgWithMemoryPage();
    orgsPage.entries = [org];
    orgsPage.total = 1;
    orgsPage.page = 1;
    orgsPage.pageSize = 25;
    orgsPage.totalPages = 1;

    const member = new CollaborationMemberMemoryTargetSummary();
    member.memberAddress = "/software_engineering_team/solution_designer";
    member.displayName = "software_engineering_team/solution_designer";
    member.agentRunId = "solution_designer_org_1";
    member.memory = memory();

    const run = new AgentOrgRunMemorySummary();
    run.orgRunId = "org-run-1";
    run.orgDefinitionId = "software-development-department";
    run.orgDefinitionName = "Software Development Department";
    run.memory = memory();
    run.memberTargets = [member];

    const runsPage = new AgentOrgRunMemoryPage();
    runsPage.entries = [run];
    runsPage.total = 1;
    runsPage.page = 1;
    runsPage.pageSize = 25;
    runsPage.totalPages = 1;

    expect(orgsPage.entries[0]?.orgRunCount).toBe(2);
    expect(runsPage.entries[0]?.memberTargets[0]?.displayName).toBe("software_engineering_team/solution_designer");
  });
});
