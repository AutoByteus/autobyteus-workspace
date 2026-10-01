import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  AgentMemoryAttribution,
  AgentOrgRunMemoryPage,
  AgentOrgRunMemorySummary,
  AgentOrgWithMemoryPage,
  AgentOrgWithMemorySummary,
  AgentRunMemoryPage,
  AgentRunMemorySummary,
  AgentTeamRunMemoryPage,
  AgentTeamRunMemorySummary,
  AgentTeamWithMemoryPage,
  AgentTeamWithMemorySummary,
  AgentWithMemoryPage,
  AgentWithMemorySummary,
  CollaborationMemberMemoryTargetSummary,
  MemoryAvailabilitySummary,
} from "../../../../../src/api/graphql/types/memory-explorer-schema.js";

describe("memory explorer graphql types", () => {
  const memory = () => {
    const summary = new MemoryAvailabilitySummary();
    summary.latestMemoryAt = "2026-01-01T00:00:00Z";
    summary.hasWorkingContext = true;
    summary.hasEpisodic = false;
    summary.hasSemantic = true;
    summary.hasRawTraces = true;
    summary.hasRawArchive = false;
    return summary;
  };

  it("supports assigning agent home and run detail fields", () => {
    const agent = new AgentWithMemorySummary();
    agent.attribution = AgentMemoryAttribution.DEFINITION;
    agent.agentDefinitionId = "codex";
    agent.displayName = "Codex";
    agent.stableId = "codex";
    agent.runCount = 2;
    agent.memory = memory();

    const agentsPage = new AgentWithMemoryPage();
    agentsPage.entries = [agent];
    agentsPage.total = 1;
    agentsPage.page = 1;
    agentsPage.pageSize = 25;
    agentsPage.totalPages = 1;

    const run = new AgentRunMemorySummary();
    run.runId = "run-1";
    run.agentDefinitionId = "codex";
    run.memory = memory();

    const runsPage = new AgentRunMemoryPage();
    runsPage.entries = [run];
    runsPage.total = 1;
    runsPage.page = 1;
    runsPage.pageSize = 25;
    runsPage.totalPages = 1;

    expect(agentsPage.entries[0]?.displayName).toBe("Codex");
    expect(runsPage.entries[0]?.runId).toBe("run-1");
  });

  it("supports assigning team home, team run, and member target fields", () => {
    const team = new AgentTeamWithMemorySummary();
    team.teamDefinitionId = "software-engineering-team";
    team.teamDefinitionName = "Software Engineering Team";
    team.teamRunCount = 3;
    team.memberMemoryCount = 6;
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
