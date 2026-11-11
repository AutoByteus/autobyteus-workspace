import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRunDiscovery } from "../../../src/memory-search/runs/memory-run-discovery.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { writeRun } from "../../helpers/memory-search-fixtures.js";

const turn = [{ day: "2026-08-25", user: "hello", agent: "hi" }];
const launch = (runtimeKind: RuntimeKind, workspaceRootPath: string | null) =>
  ({ runtimeKind, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath });

/** A task agent team's own tree, linked from a standalone host's collaboration tree when `linked`. */
/** `linked`: its coordinating run still exists (its own file; autobyteus-469 D-6), else it is detached. */

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
        // A delegated agent run is an ordinary run with its own run_metadata.json (autobyteus-461).
        readMetadata: async (runId: string) => runId === "codex_45ce0001"
          ? { agentDefinitionId: "codex-def", workspaceRootPath: "/w/mcps", runtimeKind: RuntimeKind.CODEX_APP_SERVER } as never
          : runId === "helper_9a11" ? { agentDefinitionId: "helper-def", workspaceRootPath: null, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK } as never : null,
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

  it("targets a pending agent runtime switch's journal with the agent runtime that wrote the open file: the previous one (ARCH-F-003, I-4)", async () => {
    writeRun(memoryDir, "agents/switched_1", turn);
    writeRun(memoryDir, "agents/plain_1", turn);
    const discovery = new MemoryRunDiscovery(memoryDir, {
      agentCatalog: { listCatalogRows: async () => [] },
      agentMetadata: {
        readMetadata: async (runId: string) => ({
          agentDefinitionId: "a", workspaceRootPath: "/w", runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          ...(runId === "switched_1" ? { pendingRuntimeSwitch: { switchId: "2026-10-30T10:00:00.000Z",
            from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "m", llmConfig: null, platformAgentRunId: "s" } } } : {}),
        }) as never,
      },
      teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] },
    });
    const runs = new Map((await discovery.findRuns()).map((run) => [run.runId, run]));
    expect(runs.get("switched_1")?.runtimeKind).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
    expect(runs.get("plain_1")?.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
  });

  it("targets a Team or Org member's journal with the previous agent runtime while its switch is pending (autobyteus-348)", async () => {
    const pending = { switchId: "2026-11-01T10:00:00.000Z",
      from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "m", llmConfig: null, platformAgentRunId: "s" } };
    const located = (memoryDir: string, agentRunId: string, runtimeKind: RuntimeKind, pendingRuntimeSwitch?: object) => ({
      memoryDir, agentRunId, memberAddress: `/t/${agentRunId}`, rootTeamRunId: "team_1", rootRunId: "org_1", executionKind: "configured", groupPath: [],
      tree: { rootTeam: { teamDefinitionName: "T" }, rootOrg: { orgDefinitionName: "O" } },
      configuredPlacement: { launchConfiguration: launch(runtimeKind, "/w"), ...(pendingRuntimeSwitch ? { pendingRuntimeSwitch } : {}) },
    });
    const teamSwitched = writeRun(memoryDir, "agent_teams/team_1/switched_t", turn);
    const teamPlain = writeRun(memoryDir, "agent_teams/team_1/plain_t", turn);
    const orgSwitched = writeRun(memoryDir, "agent_orgs/org_1/switched_o", turn);
    const discovery = new MemoryRunDiscovery(memoryDir, {
      agentCatalog: { listCatalogRows: async () => [] },
      agentMetadata: {
        readMetadata: async () => null,
      },
      teamLocations: { listAgents: async () => [
        located(teamSwitched, "switched_t", RuntimeKind.CODEX_APP_SERVER, pending), located(teamPlain, "plain_t", RuntimeKind.CODEX_APP_SERVER),
      ] as never },
      orgLocations: { listAgents: async () => [located(orgSwitched, "switched_o", RuntimeKind.AUTOBYTEUS, pending)] as never },
    });
    const runs = new Map((await discovery.findRuns()).map((run) => [run.runId, run]));
    expect(runs.get("switched_t")?.runtimeKind).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
    expect(runs.get("plain_t")?.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
    expect(runs.get("switched_o")?.runtimeKind).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
  });

  it("leaves a source that cannot be read to the folder rule, with one warning", async () => {
    writeRun(memoryDir, "agent_teams/team_1/member_1", turn);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runs = await new MemoryRunDiscovery(memoryDir, {
      teamLocations: { listAgents: async () => { throw new Error("tree unreadable"); } },
      orgLocations: { listAgents: async () => [] },
      agentCatalog: { listCatalogRows: async () => [] }, agentMetadata: { readMetadata: async () => null, readTaskAgentMetadata: async () => null },
    }).findRuns();
    expect(runs.map((run) => run.subject)).toEqual([{ kind: "RUN_FOLDER", runKey: "agent_teams/team_1/member_1" }]);
    expect(warn).toHaveBeenCalledWith("MEMORY_SEARCH_DISCOVERY_SOURCE_FAILED", { source: "team runs", error: "tree unreadable" });
  });

  it("never finds runs imported from another node by Memory Sync (AC-006)", async () => {
    writeRun(memoryDir, "agents/local_run_1", turn);
    // Memory Sync stores a source node's runs under imports/<memorySyncSourceId>/ in the same family folders.
    writeRun(memoryDir, "imports/docker-node-1/agents/imported_run_1", turn);
    writeRun(memoryDir, "imports/docker-node-1/agent_teams/team_9/member_9", turn);
    const runs = await new MemoryRunDiscovery(memoryDir, {
      teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] },
      agentCatalog: { listCatalogRows: async () => [] }, agentMetadata: { readMetadata: async () => null, readTaskAgentMetadata: async () => null },
    }).findRuns();
    expect(runs.map((run) => run.runKey)).toEqual(["agents/local_run_1"]);
  });
});
