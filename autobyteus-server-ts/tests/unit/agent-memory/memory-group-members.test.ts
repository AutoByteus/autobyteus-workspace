import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { AgentOrgMemoryExplorerService } from "../../../src/agent-memory/services/agent-org-memory-explorer-service.js";
import type {
  CollaborationRootMemoryRecord,
  CollaborationRootMemorySource,
  StoredGroupMember,
} from "../../../src/agent-memory/services/collaboration-root-memory-catalog.js";
import type { GroupDefinitions } from "../../../src/agent-memory/services/memory-group-members.js";
import { TeamMemoryExplorerService } from "../../../src/agent-memory/services/team-memory-explorer-service.js";

/**
 * Team and org pages on the Memory page (autobyteus-554 REQ-006): the cards (definitions without runs included, with
 * member counts) and the Members tab: from the definition on this node, else from the newest stored run.
 */
let memoryDir: string;
beforeEach(() => { memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-group-members-")); });
afterEach(() => fs.rmSync(memoryDir, { recursive: true, force: true }));

const team = new AgentTeamDefinition({
  id: "se-team", name: "Software Engineering Team", description: "d", instructions: "i", coordinatorMemberName: "solution_designer",
  nodes: [
    new TeamMember({ memberName: "solution_designer", ref: "solution_designer", refScope: "team_local" }),
    new TeamMember({ memberName: "operator", ref: "computer-use-operator", refScope: "shared" }),
  ],
});
const idleTeam = new AgentTeamDefinition({ id: "idle-team", name: "Idle Team", description: "d", instructions: "i", coordinatorMemberName: "a",
  nodes: [new TeamMember({ memberName: "a", ref: "a", refScope: "team_local" })] });
const org = new AgentOrgDefinition({
  id: "launch-org", name: "Launch Org", description: "d", instructions: "i",
  members: [
    new AgentOrgMember({ memberName: "engineering", ref: "se-team", refType: "agent_team", refScope: "shared" }),
    new AgentOrgMember({ memberName: "researcher", ref: "agent-researcher", refType: "agent", refScope: "shared" }),
  ],
});

const definitions = (teams: AgentTeamDefinition[], orgs: AgentOrgDefinition[]): GroupDefinitions => ({
  teamById: async (id) => teams.find((candidate) => candidate.id === id) ?? null,
  orgById: async (id) => orgs.find((candidate) => candidate.id === id) ?? null,
  allTeams: async () => teams,
  allOrgs: async () => orgs,
  agentNames: async () => new Map([
    ["team-local-agent:se-team:solution_designer", "Solution Designer"],
    ["computer-use-operator", "Computer Use Operator"],
    ["agent-researcher", "Research Assistant"],
  ]),
});

/** Stored runs with one member that has memory each; `configuredMembers` as their trees record them. */
const source = (records: Array<{ rootRunId: string; definitionId: string; createdAt: string; configuredMembers: StoredGroupMember[] }>): CollaborationRootMemorySource => ({
  familyLabel: "test run",
  listRootRunIds: async () => records.map((record) => record.rootRunId),
  readRoot: async (rootRunId) => {
    const record = records.find((candidate) => candidate.rootRunId === rootRunId)!;
    const memberDir = path.join(memoryDir, rootRunId, "member_1");
    fs.mkdirSync(memberDir, { recursive: true });
    fs.writeFileSync(path.join(memberDir, "raw_traces_active.jsonl"), "{}");
    return {
      rootRunId, definitionId: record.definitionId, definitionName: record.definitionId, createdAt: record.createdAt,
      members: [{ memberAddress: "/member_1", displayName: "member_1", agentRunId: "member_1", agentDefinitionId: null,
        executionKind: "CONFIGURED", startedAt: null, groupPath: [], memoryDir: memberDir }],
      configuredMembers: record.configuredMembers,
    } satisfies CollaborationRootMemoryRecord;
  },
  readCatalogEntries: async () => new Map(),
});

const storedTeamRuns = () => source([
  { rootRunId: "old", definitionId: "se-team", createdAt: "2026-10-01T00:00:00Z", configuredMembers: [{ kind: "AGENT", id: "old-agent", name: "old" }] },
  { rootRunId: "new", definitionId: "se-team", createdAt: "2026-11-01T00:00:00Z", configuredMembers: [
    { kind: "AGENT", id: "team-local-agent:se-team:solution_designer", name: "solution_designer" },
    { kind: "AGENT", id: "computer-use-operator", name: "operator" },
    { kind: "AGENT", id: "unknown-here", name: "helper" },
  ] },
]);

describe("TeamMemoryExplorerService members and cards", () => {
  it("lists a team's members from its definition on this node: team-local agents by their team-local ID, shared agents marked", async () => {
    const service = new TeamMemoryExplorerService(memoryDir, { source: storedTeamRuns(), definitions: definitions([team], []) });
    expect(await service.listMembers("se-team")).toEqual([
      { kind: "AGENT", id: "team-local-agent:se-team:solution_designer", name: "Solution Designer", shared: false, memberCount: null },
      { kind: "AGENT", id: "computer-use-operator", name: "Computer Use Operator", shared: true, memberCount: null },
    ]);
  });

  it("lists an imported team's members from its newest stored run, named by this node's definitions where it has them", async () => {
    const service = new TeamMemoryExplorerService(memoryDir, { source: storedTeamRuns(), local: false, definitions: definitions([team], []) });
    expect(await service.listMembers("se-team")).toEqual([
      { kind: "AGENT", id: "team-local-agent:se-team:solution_designer", name: "Solution Designer", shared: false, memberCount: null },
      { kind: "AGENT", id: "computer-use-operator", name: "Computer Use Operator", shared: true, memberCount: null },
      { kind: "AGENT", id: "unknown-here", name: "helper", shared: true, memberCount: null },
    ]);
    expect(await service.listMembers("never-ran")).toEqual([]);
  });

  it("lists this node's team definitions without runs after those with runs, each with its member count", async () => {
    const service = new TeamMemoryExplorerService(memoryDir, { source: storedTeamRuns(), definitions: definitions([team, idleTeam], []) });
    const cards = (await service.listAgentTeamsWithMemory()).entries;
    expect(cards.map((card) => [card.teamDefinitionId, card.teamRunCount, card.memberCount])).toEqual([
      ["se-team", 2, 2],
      ["idle-team", 0, 1],
    ]);
    const imported = new TeamMemoryExplorerService(memoryDir, { source: storedTeamRuns(), local: false, definitions: definitions([team, idleTeam], []) });
    expect((await imported.listAgentTeamsWithMemory()).entries.map((card) => [card.teamDefinitionId, card.memberCount])).toEqual([["se-team", 3]]);
  });
});

describe("AgentOrgMemoryExplorerService members and cards", () => {
  const storedOrgRuns = () => source([{ rootRunId: "org-run", definitionId: "launch-org", createdAt: "2026-11-01T00:00:00Z", configuredMembers: [
    { kind: "TEAM", id: "se-team", name: "engineering", memberCount: 2 },
    { kind: "AGENT", id: "agent-researcher", name: "researcher" },
  ] }]);

  it("lists an org's agents and teams from its definition, a team with its member count", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir, { source: storedOrgRuns(), definitions: definitions([team], [org]) });
    expect(await service.listMembers("launch-org")).toEqual([
      { kind: "TEAM", id: "se-team", name: "Software Engineering Team", shared: true, memberCount: 2 },
      { kind: "AGENT", id: "agent-researcher", name: "Research Assistant", shared: true, memberCount: null },
    ]);
    expect((await service.listAgentOrgsWithMemory()).entries.map((card) => [card.orgDefinitionId, card.memberCount])).toEqual([["launch-org", 2]]);
  });

  it("lists an imported org's members from its newest stored run", async () => {
    const service = new AgentOrgMemoryExplorerService(memoryDir, { source: storedOrgRuns(), local: false, definitions: definitions([], []) });
    expect(await service.listMembers("launch-org")).toEqual([
      { kind: "TEAM", id: "se-team", name: "engineering", shared: true, memberCount: 2 },
      { kind: "AGENT", id: "agent-researcher", name: "Research Assistant", shared: true, memberCount: null },
    ]);
  });
});
