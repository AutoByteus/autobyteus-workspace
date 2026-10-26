import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskTeamRootMemorySource } from "../../src/agent-memory/services/task-team-root-memory-source.js";
import { MemoryRunDiscovery } from "../../src/memory-search/runs/memory-run-discovery.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { getStandaloneRootTreePath } from "../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { getTeamRunExecutionTreePath } from "../../src/run-history/store/team-run-execution-tree-path.js";
import { writeRun } from "./memory-search-fixtures.js";

const turn = [{ day: "2026-08-25", user: "hello", agent: "hi" }];
const launch = (runtimeKind: RuntimeKind, workspaceRootPath: string | null) =>
  ({ runtimeKind, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath });

/** A task agent team's own tree, linked from a standalone host's collaboration tree when `linked`. */
const writeTaskTeam = (memoryDir: string, teamRunId: string, hostRunId: string, linked: boolean): void => {
  const teamDir = path.join(memoryDir, "agent_teams", teamRunId);
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(getTeamRunExecutionTreePath(teamDir), JSON.stringify({
    createdAt: "2026-08-20T10:00:00.000Z",
    handoffs: [],
    rootTeam: {
      address: "/Research_Crew", teamDefinitionId: "research-crew", teamRunId, coordinatorAddress: "/Research_Crew/lead",
      defaultLaunchConfiguration: launch(RuntimeKind.CODEX_APP_SERVER, "/w/research"),
      members: [{
        address: "/Research_Crew/lead", agentDefinitionId: "lead-def", agentRunId: `lead_${teamRunId}`, platformAgentRunId: null,
        launchConfiguration: launch(RuntimeKind.CLAUDE_AGENT_SDK, "/w/research"), followsTeam: true,
      }],
      taskExecutions: [],
    },
    taskAgent: { coordinatingRun: { kind: "agent", runId: hostRunId }, delegatorAgentRunId: hostRunId, address: "/Research_Crew" },
  }));
  const collaborationDir = path.join(memoryDir, "agents", hostRunId, "collaboration");
  fs.mkdirSync(collaborationDir, { recursive: true });
  const existing = fs.existsSync(getStandaloneRootTreePath(collaborationDir))
    ? JSON.parse(fs.readFileSync(getStandaloneRootTreePath(collaborationDir), "utf-8")) as { taskExecutions: unknown[] }
    : { host: { agentRunId: hostRunId }, taskExecutions: [] };
  if (linked) existing.taskExecutions.push({ teamRunId });
  fs.writeFileSync(getStandaloneRootTreePath(collaborationDir), JSON.stringify(existing));
};

describe("MemoryRunDiscovery", () => {
  let memoryDir: string;
  beforeEach(() => { memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-discovery-")); });
  afterEach(() => { fs.rmSync(memoryDir, { recursive: true, force: true }); vi.restoreAllMocks(); });

  it("finds every run kind with names, workspace and runtime as recorded, and folders no record attributes", async () => {
    const standalone = writeRun(memoryDir, "agents/codex_45ce0001", turn);
    const taskAgent = writeRun(memoryDir, "agents/helper_9a11", turn);
    const unnamed = writeRun(memoryDir, "agents/retired_bot_ab12cd34ef", turn);
    const member = writeRun(memoryDir, "agent_teams/team_1/solution_designer_77aa", turn);
    const orgMember = writeRun(memoryDir, "agent_orgs/org_1/team_a/reviewer_5555", turn);
    const oldFormat = writeRun(memoryDir, "agent_teams/old_team_x/member_y", turn);
    const collaborationMember = writeRun(memoryDir, "agents/host_1/collaboration/helper_crew/writer_1", turn);
    fs.mkdirSync(path.join(memoryDir, "agents/empty_folder"), { recursive: true });

    const discovery = new MemoryRunDiscovery(memoryDir, {
      agentCatalog: { listCatalogRows: async () => [{ runId: "codex_45ce0001", agentDefinitionId: "codex-def", agentName: "Codex", workspaceRootPath: "/w/catalog" }] as never },
      agentMetadata: {
        readMetadata: async (runId: string) => runId === "codex_45ce0001"
          ? { agentDefinitionId: "codex-def", workspaceRootPath: "/w/mcps", runtimeKind: RuntimeKind.CODEX_APP_SERVER } as never : null,
        readTaskAgentMetadata: async (runId: string) => runId === "helper_9a11"
          ? { agentDefinitionId: "helper-def", workspaceRootPath: null, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK } as never : null,
      },
      teamLocations: { listAgents: async () => [{
        rootTeamRunId: "team_1", agentRunId: "solution_designer_77aa", memberAddress: "/Engineering/solution_designer", executionKind: "configured",
        groupPath: [], memoryDir: member, tree: { rootTeam: { teamDefinitionName: "Software Engineering Team" } },
        configuredPlacement: { launchConfiguration: launch(RuntimeKind.CLAUDE_AGENT_SDK, "/w/eng") },
      }] as never },
      orgLocations: { listAgents: async () => [{
        rootRunId: "org_1", agentRunId: "reviewer_5555", memberAddress: "/team_a/reviewer", groupPath: [], memoryDir: orgMember,
        tree: { rootOrg: { orgDefinitionName: "Product Org" } }, configuredPlacement: null,
      }] as never },
      taskTeams: { listTaskTeams: async () => [] },
    });
    const runs = await discovery.findRuns();
    const byKey = new Map(runs.map((run) => [run.runKey, run]));
    expect([...byKey.keys()]).toEqual([
      "agent_orgs/org_1/team_a/reviewer_5555", "agent_teams/old_team_x/member_y", "agent_teams/team_1/solution_designer_77aa",
      "agents/codex_45ce0001", "agents/helper_9a11", "agents/host_1/collaboration/helper_crew/writer_1", "agents/retired_bot_ab12cd34ef",
    ]);
    expect(byKey.get("agents/codex_45ce0001")).toMatchObject({ agentName: "Codex", workspace: "/w/mcps", runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memoryDir: standalone, subject: { kind: "AGENT", runId: "codex_45ce0001", agentDefinitionId: "codex-def" } });
    expect(byKey.get("agents/helper_9a11")).toMatchObject({ agentName: "helper-def", memoryDir: taskAgent, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
    expect(byKey.get("agents/retired_bot_ab12cd34ef")).toMatchObject({ agentName: "retired bot", runtimeKind: null, memoryDir: unnamed,
      subject: { kind: "AGENT", runId: "retired_bot_ab12cd34ef", agentDefinitionId: null } });
    expect(byKey.get("agent_teams/team_1/solution_designer_77aa")).toMatchObject({ agentName: "solution_designer", teamName: "Software Engineering Team",
      memberName: "solution_designer", workspace: "/w/eng", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      subject: { kind: "TEAM_MEMBER", teamRunId: "team_1", agentRunId: "solution_designer_77aa" } });
    expect(byKey.get("agent_orgs/org_1/team_a/reviewer_5555")).toMatchObject({ orgName: "Product Org", memberName: "team_a/reviewer", runtimeKind: null,
      subject: { kind: "ORG_MEMBER", orgRunId: "org_1", agentRunId: "reviewer_5555" } });
    expect(byKey.get("agent_teams/old_team_x/member_y")).toMatchObject({ agentName: "member y", memoryDir: oldFormat,
      subject: { kind: "RUN_FOLDER", runKey: "agent_teams/old_team_x/member_y" } });
    expect(byKey.get("agents/host_1/collaboration/helper_crew/writer_1")).toMatchObject({ memoryDir: collaborationMember,
      subject: { kind: "RUN_FOLDER", runKey: "agents/host_1/collaboration/helper_crew/writer_1" } });
  });

  it("leaves a source that cannot be read to the folder rule, with one warning", async () => {
    writeRun(memoryDir, "agent_teams/team_1/member_1", turn);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runs = await new MemoryRunDiscovery(memoryDir, {
      teamLocations: { listAgents: async () => { throw new Error("tree unreadable"); } },
      orgLocations: { listAgents: async () => [] }, taskTeams: { listTaskTeams: async () => [] },
      agentCatalog: { listCatalogRows: async () => [] }, agentMetadata: { readMetadata: async () => null, readTaskAgentMetadata: async () => null },
    }).findRuns();
    expect(runs.map((run) => run.subject)).toEqual([{ kind: "RUN_FOLDER", runKey: "agent_teams/team_1/member_1" }]);
    expect(warn).toHaveBeenCalledWith("MEMORY_SEARCH_DISCOVERY_SOURCE_FAILED", { source: "team runs", error: "tree unreadable" });
  });
});

describe("TaskTeamRootMemorySource", () => {
  let memoryDir: string;
  beforeEach(() => { memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-team-source-")); });
  afterEach(() => fs.rmSync(memoryDir, { recursive: true, force: true }));

  it("lists the task teams their coordinating run still links, with members, launch and delegator, from their own trees", async () => {
    writeTaskTeam(memoryDir, "crew_linked", "host_a", true);
    writeTaskTeam(memoryDir, "crew_detached", "host_b", false);
    const source = new TaskTeamRootMemorySource(memoryDir);
    const teams = await source.listTaskTeams();
    expect(teams).toEqual([{
      teamRunId: "crew_linked", teamDefinitionId: "research-crew", displayName: "Research_Crew", createdAt: "2026-08-20T10:00:00.000Z",
      coordinatingRun: { kind: "agent", runId: "host_a" }, delegatorAgentRunId: "host_a",
      members: [{
        memberAddress: "/Research_Crew/lead", displayName: "lead", agentRunId: "lead_crew_linked", agentDefinitionId: "lead-def",
        launchConfiguration: launch(RuntimeKind.CLAUDE_AGENT_SDK, "/w/research"),
        memoryDir: path.join(memoryDir, "agent_teams", "crew_linked", "lead_crew_linked"),
      }],
    }]);
    expect(await source.listRootRunIds()).toEqual(["crew_linked"]);
    expect(await source.readTaskTeam("crew_detached")).toBeNull();
    expect((await source.readRoot("crew_linked"))?.members.map((member) => member.executionKind)).toEqual(["TASK_TEAM_MEMBER"]);

    // Discovery attributes a linked task team's member; a detached one is still found, by its folder (R-012).
    writeRun(memoryDir, "agent_teams/crew_linked/lead_crew_linked", turn);
    writeRun(memoryDir, "agent_teams/crew_detached/lead_crew_detached", turn);
    const runs = await new MemoryRunDiscovery(memoryDir, {
      teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] },
      agentCatalog: { listCatalogRows: async () => [] }, agentMetadata: { readMetadata: async () => null, readTaskAgentMetadata: async () => null },
    }).findRuns();
    expect(runs.map((run) => [run.runKey, run.teamName, run.runtimeKind, run.subject.kind])).toEqual([
      ["agent_teams/crew_detached/lead_crew_detached", null, null, "RUN_FOLDER"],
      ["agent_teams/crew_linked/lead_crew_linked", "Research_Crew", RuntimeKind.CLAUDE_AGENT_SDK, "TEAM_MEMBER"],
    ]);
  });
});
