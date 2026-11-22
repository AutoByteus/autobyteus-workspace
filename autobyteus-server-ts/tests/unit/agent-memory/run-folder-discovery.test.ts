import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunFolderDiscovery } from "../../../src/agent-memory/services/run-folder-discovery.js";
import { toMemoryRun } from "../../../src/memory-search/runs/memory-run-mapping.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { metadataStateOf, writeRun } from "../../helpers/memory-search-fixtures.js";

const turn = [{ day: "2026-08-25", user: "hello", agent: "hi" }];
const launch = (runtimeKind: RuntimeKind, workspaceRootPath: string | null) =>
  ({ runtimeKind, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath });

describe("RunFolderDiscovery", () => {
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

    const discovery = new RunFolderDiscovery(memoryDir, {
      agentCatalog: { listCatalogRows: async () => [
        { runId: "codex_45ce0001", agentDefinitionId: "codex-def", agentName: "Codex", workspaceRootPath: "/w/catalog", createdAt: "2026-08-25T08:00:00.000Z" },
        { runId: "helper_9a11", agentDefinitionId: "helper-def", agentName: "", workspaceRootPath: "/w/h", createdAt: "2026-08-26T08:00:00.000Z" },
      ] as never },
      agentMetadata: {
        // A delegated agent run is an ordinary run with its own run_metadata.json (autobyteus-461).
        readMetadataState: async (runId: string) => metadataStateOf(runId === "codex_45ce0001"
          ? { agentDefinitionId: "codex-def", workspaceRootPath: "/w/mcps", runtimeKind: RuntimeKind.CODEX_APP_SERVER, startedAt: "2026-08-25T09:00:00.000Z" }
          : runId === "helper_9a11" ? { agentDefinitionId: "helper-def", workspaceRootPath: null, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK } : null),
      },
      teamLocations: { listAgents: async () => [{
        rootTeamRunId: "team_1", agentRunId: "solution_designer_77aa", memberAddress: "/Engineering/solution_designer", executionKind: "configured",
        groupPath: [], memoryDir: member, startedAt: null,
        tree: { rootTeam: { teamDefinitionName: "Software Engineering Team" }, createdAt: "2026-08-20T10:00:00.000Z" },
        configuredPlacement: { agentDefinitionId: "team-local-agent:eng:solution_designer", launchConfiguration: launch(RuntimeKind.CLAUDE_AGENT_SDK, "/w/eng") },
      }] as never },
      orgLocations: { listAgents: async () => [{
        rootRunId: "org_1", agentRunId: "reviewer_5555", memberAddress: "/team_a/reviewer", groupPath: [], memoryDir: orgMember, startedAt: null,
        tree: { rootOrg: { orgDefinitionName: "Product Org" }, createdAt: "2026-08-21T10:00:00.000Z" }, configuredPlacement: null,
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

    // The episodic catalog's facts: the root of each folder, the definition its records name and the start they hold.
    const facts = (key: string) => { const run = byKey.get(key)!; return { root: run.root, attribution: run.attribution, recordedStartAt: run.recordedStartAt }; };
    expect(facts("agents/codex_45ce0001")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "codex_45ce0001" },
      attribution: { kind: "attributed", agentDefinitionId: "codex-def" }, recordedStartAt: "2026-08-25T09:00:00.000Z" });
    expect(facts("agents/helper_9a11")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "helper_9a11" },
      attribution: { kind: "attributed", agentDefinitionId: "helper-def" }, recordedStartAt: "2026-08-26T08:00:00.000Z" });
    expect(facts("agents/retired_bot_ab12cd34ef")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "retired_bot_ab12cd34ef" },
      attribution: { kind: "unattributed" }, recordedStartAt: null });
    expect(facts("agent_teams/team_1/solution_designer_77aa")).toEqual({ root: { rootSubjectKind: "agent_team", rootRunId: "team_1" },
      attribution: { kind: "attributed", agentDefinitionId: "team-local-agent:eng:solution_designer" }, recordedStartAt: "2026-08-20T10:00:00.000Z" });
    expect(facts("agent_orgs/org_1/team_a/reviewer_5555")).toEqual({ root: { rootSubjectKind: "agent_org", rootRunId: "org_1" },
      attribution: { kind: "unattributed" }, recordedStartAt: "2026-08-21T10:00:00.000Z" });
    expect(facts("agent_teams/old_team_x/member_y")).toEqual({ root: { rootSubjectKind: "agent_team", rootRunId: "old_team_x" },
      attribution: { kind: "unattributed" }, recordedStartAt: null });
    expect(facts("agents/host_1/collaboration/helper_crew/writer_1")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "host_1" },
      attribution: { kind: "unattributed" }, recordedStartAt: null });
    // An AGENT subject carries the same definition as the run.
    expect(byKey.get("agents/codex_45ce0001")!.subject).toEqual({ kind: "AGENT", runId: "codex_45ce0001", agentDefinitionId: "codex-def" });

    // Memory search keeps exactly the facts it kept before the move (its stored run rows are unchanged).
    expect(toMemoryRun(byKey.get("agents/retired_bot_ab12cd34ef")!)).toEqual({
      runKey: "agents/retired_bot_ab12cd34ef", runId: "retired_bot_ab12cd34ef", memoryDir: unnamed, agentName: "retired bot",
      teamName: null, memberName: null, orgName: null, workspace: null, runtimeKind: null,
      subject: { kind: "AGENT", runId: "retired_bot_ab12cd34ef", agentDefinitionId: null },
    });
  });

  it("finds one root's run folders, and names the root of any run folder", async () => {
    const standalone = writeRun(memoryDir, "agents/codex_1", turn);
    writeRun(memoryDir, "agents/host_1/collaboration/crew/writer_1", turn);
    writeRun(memoryDir, "agents/host_1", turn);
    const member = writeRun(memoryDir, "agent_teams/team_1/designer_1", turn);
    writeRun(memoryDir, "agent_teams/team_2/designer_2", turn);
    const orgMember = writeRun(memoryDir, "agent_orgs/org_1/team_a/reviewer_1", turn);
    const teamCalls: unknown[] = [];
    const orgCalls: unknown[] = [];
    const discovery = new RunFolderDiscovery(memoryDir, {
      agentCatalog: { listCatalogRows: async () => [] },
      agentMetadata: { readMetadataState: async () => metadataStateOf(null) },
      teamLocations: { listAgents: async (input?: unknown) => { teamCalls.push(input); return [{
        rootTeamRunId: "team_1", agentRunId: "designer_1", memberAddress: "/designer", memoryDir: member, startedAt: null,
        tree: { rootTeam: { teamDefinitionName: "T" }, createdAt: "2026-08-20T10:00:00.000Z" },
        configuredPlacement: { agentDefinitionId: "designer-def", launchConfiguration: launch(RuntimeKind.CODEX_APP_SERVER, "/w") },
      }] as never; } },
      orgLocations: { listAgents: async (input?: unknown) => { orgCalls.push(input); return [{
        rootRunId: "org_1", agentRunId: "reviewer_1", memberAddress: "/team_a/reviewer", memoryDir: orgMember, startedAt: null,
        tree: { rootOrg: { orgDefinitionName: "O" }, createdAt: "2026-08-21T10:00:00.000Z" },
        configuredPlacement: { agentDefinitionId: "reviewer-def", launchConfiguration: launch(RuntimeKind.CODEX_APP_SERVER, "/w") },
      }] as never; } },
    });

    expect((await discovery.findRunsOfRoot({ rootSubjectKind: "agent_team", rootRunId: "team_1" })).map((run) => run.runKey))
      .toEqual(["agent_teams/team_1/designer_1"]);
    expect(teamCalls).toEqual([{ rootTeamRunId: "team_1" }]);
    expect((await discovery.findRunsOfRoot({ rootSubjectKind: "agent_org", rootRunId: "org_1" })).map((run) => [run.runKey, run.attribution]))
      .toEqual([["agent_orgs/org_1/team_a/reviewer_1", { kind: "attributed", agentDefinitionId: "reviewer-def" }]]);
    expect(orgCalls).toEqual([{ rootRunId: "org_1" }]);
    expect((await discovery.findRunsOfRoot({ rootSubjectKind: "agent", rootRunId: "host_1" })).map((run) => run.runKey))
      .toEqual(["agents/host_1", "agents/host_1/collaboration/crew/writer_1"]);
    expect(await discovery.findRunsOfRoot({ rootSubjectKind: "agent_team", rootRunId: "team_gone" })).toEqual([]);

    expect(discovery.rootOf(standalone)).toEqual({ rootSubjectKind: "agent", rootRunId: "codex_1" });
    expect(discovery.rootOf(member)).toEqual({ rootSubjectKind: "agent_team", rootRunId: "team_1" });
    expect(discovery.rootOf(orgMember)).toEqual({ rootSubjectKind: "agent_org", rootRunId: "org_1" });
    expect(discovery.rootOf(path.join(memoryDir, "imports/node/agents/run_1"))).toBeNull();
    expect(discovery.rootOf(path.join(memoryDir, "agents"))).toBeNull();
    expect(discovery.rootOf(path.join(os.tmpdir(), "elsewhere"))).toBeNull();
  });

  describe("attribution outcomes (SR-003): attributed, unattributed, or unreadable with one warning", () => {
    const located = (memoryDir: string, rootId: string, agentRunId: string, agentDefinitionId: string) => ({
      memoryDir, agentRunId, memberAddress: `/${agentRunId}`, rootTeamRunId: rootId, rootRunId: rootId, startedAt: null,
      tree: { rootTeam: { teamDefinitionName: "T" }, rootOrg: { orgDefinitionName: "O" }, createdAt: "2026-08-20T10:00:00.000Z" },
      configuredPlacement: { agentDefinitionId, launchConfiguration: launch(RuntimeKind.CODEX_APP_SERVER, "/w") },
    });
    const build = (options: { teamDiagnostics?: Record<string, string>; orgDiagnostics?: Record<string, string> } = {}) => {
      const order: string[] = [];
      const discovery = new RunFolderDiscovery(memoryDir, {
        // As in real use, the history lists only admitted runs: a row exists only for a run whose metadata is present.
        agentCatalog: { listCatalogRows: async () => [{ runId: "with_meta", agentDefinitionId: "meta-def", agentName: "Meta Agent" }] as never },
        agentMetadata: { readMetadataState: async (runId: string) => (
          runId === "with_meta" ? metadataStateOf({ agentDefinitionId: "meta-def", workspaceRootPath: "/w", runtimeKind: RuntimeKind.CODEX_APP_SERVER })
          : runId === "broken_meta" ? { kind: "unreadable", error: new Error("Run metadata must be a JSON object.") } as never
          : metadataStateOf(null)) },
        teamLocations: { listAgents: async () => { order.push("teamLocations"); return [located(path.join(memoryDir, "agent_teams/team_ok/m_1"), "team_ok", "m_1", "team-def")] as never; } },
        orgLocations: { listAgents: async () => { order.push("orgLocations"); return [located(path.join(memoryDir, "agent_orgs/org_ok/m_1"), "org_ok", "m_1", "org-def")] as never; } },
        teamPackages: { getDiagnostics: () => { order.push("teamPackages"); return new Map(Object.entries(options.teamDiagnostics ?? {})); } },
        orgPackages: { listDiagnostics: () => { order.push("orgPackages");
          return Object.entries(options.orgDiagnostics ?? {}).map(([orgRunId, reason]) => ({ orgRunId, path: memoryDir, reason })); } },
      });
      return { discovery, order };
    };
    const attributions = async (discovery: RunFolderDiscovery) => Object.fromEntries((await discovery.findRuns()).map((run) => [run.runKey, run.attribution]));

    beforeEach(() => {
      for (const rel of ["agents/with_meta", "agents/broken_meta", "agents/no_records", "agents/host_1/collaboration/crew/w_1",
        "agent_teams/team_ok/m_1", "agent_teams/team_bad/m_1", "agent_teams/team_bad/sub/m_2", "agent_teams/team_old/m_1",
        "agent_orgs/org_ok/m_1", "agent_orgs/org_bad/team_a/m_1", "agent_orgs/org_plain/m_1"]) writeRun(memoryDir, rel, turn);
    });

    it("gives each family each outcome, and logs each unreadable record once per root with how many run folders it leaves out", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { discovery, order } = build({
        teamDiagnostics: { team_bad: "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: tree unreadable" },
        orgDiagnostics: { org_bad: "ROOT_RUN_PACKAGE_MANIFEST_INVALID: bad json" },
      });
      const unreadable = (record: string, reason: string) => ({ kind: "unreadable", record, reason });
      expect(await attributions(discovery)).toEqual({
        "agent_orgs/org_bad/team_a/m_1": unreadable("agent_org_run_execution_tree.json", "ROOT_RUN_PACKAGE_MANIFEST_INVALID: bad json"),
        "agent_orgs/org_ok/m_1": { kind: "attributed", agentDefinitionId: "org-def" },
        "agent_orgs/org_plain/m_1": { kind: "unattributed" },
        "agent_teams/team_bad/m_1": unreadable("team_run_execution_tree.json", "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: tree unreadable"),
        "agent_teams/team_bad/sub/m_2": unreadable("team_run_execution_tree.json", "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: tree unreadable"),
        "agent_teams/team_ok/m_1": { kind: "attributed", agentDefinitionId: "team-def" },
        "agent_teams/team_old/m_1": { kind: "unattributed" },
        "agents/broken_meta": unreadable("run_metadata.json", "Run metadata must be a JSON object."),
        "agents/host_1/collaboration/crew/w_1": { kind: "unattributed" },
        "agents/no_records": { kind: "unattributed" },
        "agents/with_meta": { kind: "attributed", agentDefinitionId: "meta-def" },
      });
      // The diagnostics are read after the sources that await the readiness index (N-7); Org members first, so an Org
      // container's unit agents are attributed to their Org (org-teams-follow-definition).
      expect(order).toEqual(["orgLocations", "teamLocations", "teamPackages", "orgPackages"]);
      expect(warn.mock.calls).toEqual([
        ["RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE", { root: "agent_org:org_bad", record: "agent_org_run_execution_tree.json", reason: "ROOT_RUN_PACKAGE_MANIFEST_INVALID: bad json", runFolders: 1 }],
        ["RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE", { root: "agent_team:team_bad", record: "team_run_execution_tree.json", reason: "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: tree unreadable", runFolders: 2 }],
        ["RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE", { root: "agent:broken_meta", record: "run_metadata.json", reason: "Run metadata must be a JSON object.", runFolders: 1 }],
      ]);

      // The same instance does not repeat it, for a full scan or a refresh of the root.
      await discovery.findRuns();
      expect((await discovery.findRunsOfRoot({ rootSubjectKind: "agent_team", rootRunId: "team_bad" })).map((run) => run.attribution.kind))
        .toEqual(["unreadable", "unreadable"]);
      expect(warn).toHaveBeenCalledTimes(3);
      // Another instance (memory search's, or the next start) logs it once too.
      await build({ teamDiagnostics: { team_bad: "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: tree unreadable" } }).discovery.findRuns();
      expect(warn).toHaveBeenCalledTimes(5);
    });

    it("logs again when the reason changes", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const diagnostics = new Map([["team_bad", "first reason"]]);
      const discovery = new RunFolderDiscovery(memoryDir, {
        agentCatalog: { listCatalogRows: async () => [] }, agentMetadata: { readMetadataState: async () => metadataStateOf(null) },
        teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] },
        teamPackages: { getDiagnostics: () => diagnostics }, orgPackages: { listDiagnostics: () => [] },
      });
      await discovery.findRunsOfRoot({ rootSubjectKind: "agent_team", rootRunId: "team_bad" });
      await discovery.findRunsOfRoot({ rootSubjectKind: "agent_team", rootRunId: "team_bad" });
      diagnostics.set("team_bad", "second reason");
      await discovery.findRunsOfRoot({ rootSubjectKind: "agent_team", rootRunId: "team_bad" });
      expect(warn.mock.calls.map(([, details]) => (details as { reason: string; runFolders: number })))
        .toEqual([expect.objectContaining({ reason: "first reason", runFolders: 2 }), expect.objectContaining({ reason: "second reason", runFolders: 2 })]);
    });

    it("makes every team member folder no tree locates unreadable when the whole scan failed (the index files it as team root `*`)", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { discovery } = build({ teamDiagnostics: { "*": "FAILED_ATTEMPT: History discovery unavailable: EACCES" } });
      const runs = await attributions(discovery);
      expect(runs["agent_teams/team_bad/m_1"]).toEqual({ kind: "unreadable", record: "team_run_execution_tree.json", reason: "FAILED_ATTEMPT: History discovery unavailable: EACCES" });
      expect(runs["agent_teams/team_old/m_1"]).toMatchObject({ kind: "unreadable" });
      expect(runs["agent_teams/team_ok/m_1"]).toEqual({ kind: "attributed", agentDefinitionId: "team-def" });
      expect(runs["agent_orgs/org_plain/m_1"]).toEqual({ kind: "unattributed" });
    });

    it("keeps memory search's runs exactly as before for every outcome", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { discovery } = build({ teamDiagnostics: { team_bad: "x" } });
      const runs = new Map((await discovery.findRuns()).map((run) => [run.runKey, toMemoryRun(run)]));
      expect(runs.get("agent_teams/team_bad/m_1")).toMatchObject({ agentName: "m 1", subject: { kind: "RUN_FOLDER", runKey: "agent_teams/team_bad/m_1" } });
      expect(runs.get("agents/broken_meta")!.subject).toEqual({ kind: "AGENT", runId: "broken_meta", agentDefinitionId: null });
      expect(runs.get("agents/with_meta")).toMatchObject({ agentName: "Meta Agent", subject: { kind: "AGENT", runId: "with_meta", agentDefinitionId: "meta-def" } });
      expect(Object.keys(runs.get("agents/with_meta")!).sort()).toEqual(["agentName", "memberName", "memoryDir", "orgName", "runId", "runKey", "runtimeKind", "subject", "teamName", "workspace"]);
    });
  });

  it("targets a pending agent runtime switch's journal with the agent runtime that wrote the open file: the previous one (ARCH-F-003, I-4)", async () => {
    writeRun(memoryDir, "agents/switched_1", turn);
    writeRun(memoryDir, "agents/plain_1", turn);
    const discovery = new RunFolderDiscovery(memoryDir, {
      agentCatalog: { listCatalogRows: async () => [] },
      agentMetadata: {
        readMetadataState: async (runId: string) => metadataStateOf({
          agentDefinitionId: "a", workspaceRootPath: "/w", runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          ...(runId === "switched_1" ? { pendingRuntimeSwitch: { switchId: "2026-10-30T10:00:00.000Z",
            from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "m", llmConfig: null, platformAgentRunId: "s" } } } : {}),
        }),
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
    const discovery = new RunFolderDiscovery(memoryDir, {
      agentCatalog: { listCatalogRows: async () => [] },
      agentMetadata: {
        readMetadataState: async () => metadataStateOf(null),
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
    const runs = await new RunFolderDiscovery(memoryDir, {
      teamLocations: { listAgents: async () => { throw new Error("tree unreadable"); } },
      orgLocations: { listAgents: async () => [] },
      agentCatalog: { listCatalogRows: async () => [] }, agentMetadata: { readMetadataState: async () => metadataStateOf(null) },
    }).findRuns();
    expect(runs.map((run) => run.subject)).toEqual([{ kind: "RUN_FOLDER", runKey: "agent_teams/team_1/member_1" }]);
    expect(warn).toHaveBeenCalledWith("RUN_FOLDER_DISCOVERY_SOURCE_FAILED", { source: "team runs", error: "tree unreadable" });
  });

  it("never finds runs imported from another node by Memory Sync (AC-006)", async () => {
    writeRun(memoryDir, "agents/local_run_1", turn);
    // Memory Sync stores a source node's runs under imports/<memorySyncSourceId>/ in the same family folders.
    writeRun(memoryDir, "imports/docker-node-1/agents/imported_run_1", turn);
    writeRun(memoryDir, "imports/docker-node-1/agent_teams/team_9/member_9", turn);
    const runs = await new RunFolderDiscovery(memoryDir, {
      teamLocations: { listAgents: async () => [] }, orgLocations: { listAgents: async () => [] },
      agentCatalog: { listCatalogRows: async () => [] }, agentMetadata: { readMetadataState: async () => metadataStateOf(null) },
    }).findRuns();
    expect(runs.map((run) => run.runKey)).toEqual(["agents/local_run_1"]);
  });
});
