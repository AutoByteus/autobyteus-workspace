import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppDataMigrationRecordSnapshot } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID,
  DelegatedCopyOwnFileCompleteV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  TASK_AGENT_OWN_RUN_V1_MIGRATION_ID,
  TaskAgentOwnRunV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import { projectTaskExecutionSource } from "../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import { restoreTaskAgentNode } from "../../../src/agent-collaboration/execution/task/task-team-node-restoration.js";
import type { TaskAgentExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { hubRecords, orgRecords, teamRunRecords, writeReleasedDataRoot } from "../../fixtures/app-data-migrations/released-task-agent-layout-fixtures.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import {
  AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "../../../src/app-data-migrations/frozen/server/run-history/store/atomic-run-package-file-commit-writer.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import {
  T0, agentFile, configuredAgent, edit, fallback, launch, link, mountedTeam, otherLaunch, projected, put, readJson,
  releasedAgentOwnFile, releasedTeamOwnTree, slotLaunch, teamFile, writeHub, writeOrgRun, writeTeamRun,
} from "../../fixtures/app-data-migrations/released-delegated-copy-own-file-fixtures.js";

/**
 * `20261019_delegated_copy_own_file_complete_v1` (design Migration Plan M0–M5, Shape Inventory) over synthesized
 * fixtures in every released shape (TESTING.md: never real data or a copy of it). AC-005..AC-009, AC-011.
 */

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const memoryRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-copy-own-file-"));
  roots.push(root);
  return path.join(root, "memory");
};
const ledger = (status: AppDataMigrationRecordSnapshot["status"] = "SUCCEEDED") => ({
  getRecord: async (migrationId: string) => ({ migrationId, status }) as AppDataMigrationRecordSnapshot,
});
const migrate = (memory: string, options: Readonly<{ predecessor?: AppDataMigrationRecordSnapshot["status"]; writer?: AtomicRunPackageFileCommitWriter }> = {}) =>
  new DelegatedCopyOwnFileCompleteV1AppDataMigration(memory, {
    ledger: ledger(options.predecessor ?? "SUCCEEDED"), ...(options.writer ? { writer: options.writer } : {}),
  }).execute();
const sha = async (file: string) => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const snapshot = async (dir: string, base = dir): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, await snapshot(file, base)); else out[path.relative(base, file)] = await sha(file);
  }
  return out;
};
const dispositions = (result: Awaited<ReturnType<typeof migrate>>) =>
  Object.fromEntries(result.summary.details.map((item) => [item.itemId, item.message.split(":")[0]]));
const CONFIGURED = { origin: "configured", fallbacks: [] };

const hub = { kind: "agent" as const, runId: "hub" };
const teamRun = { kind: "agent_team" as const, runId: "team-r" };
const org = { kind: "agent_org" as const, runId: "org-o" };

/** Every convertible released shape, by coordinating kind (Shape Inventory F-A1..F-A3b, F-T1..F-T3d). */
const seedConvertible = async (memory: string) => {
  // Agent run (hub): catalog copies.
  await writeHub(memory, "hub", [link("/code_reviewer", { agentRunId: "hub-reviewer" }, "hub"), link("/code_reviewer", { agentRunId: "hub-no-delegator" }),
    link("/product_team", { teamRunId: "hub-team-1" }, "hub"), link("/se_team", { teamRunId: "hub-team-2" }, "hub")]);
  await put(agentFile(memory, "hub-reviewer"), releasedAgentOwnFile(memory, "hub-reviewer",   // F-A1
    { coordinating: hub, address: "/code_reviewer", origin: "catalog", agentDefinitionId: "code-reviewer", launch, delegator: "hub" }));
  await put(agentFile(memory, "hub-no-delegator"), releasedAgentOwnFile(memory, "hub-no-delegator",   // F-A1d
    { coordinating: hub, address: "/code_reviewer", origin: "catalog", agentDefinitionId: "code-reviewer", launch }));
  await put(teamFile(memory, "hub-team-1"), releasedTeamOwnTree("hub-team-1", {   // F-T1 (team launch source present)
    coordinating: hub, address: "/product_team", origin: "catalog", teamDefinitionId: "product-team", delegator: "hub",
    members: [{ name: "lead" }, { name: "designer" }], launchSource: { origin: "team_default", fallbacks: [] },
    handoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["deliver"] }] }));
  await put(teamFile(memory, "hub-team-2"), releasedTeamOwnTree("hub-team-2", {   // F-T2, F-T2b, F-T2c
    coordinating: hub, address: "/se_team", origin: "catalog", teamDefinitionId: "se", delegator: "hub",
    launchSource: { origin: "inherited", fallbacks: [] }, userLaunchSelection: edit,
    members: [
      { name: "lead", userLaunchSelection: edit },
      { name: "ie", launchConfiguration: otherLaunch, launchSource: { origin: "agent_default", fallbacks: [] } },
      { name: "cr", launchSource: { origin: "inherited", fallbacks: [fallback] } },
    ] }));

  // Team run: configured slots /lead and /writer; copies of /writer and catalog copies.
  await writeTeamRun(memory, "team-r", {
    members: [configuredAgent("/lead", "lead-r", "lead"), configuredAgent("/writer", "writer-r", "writer", slotLaunch({ llmModelIdentifier: "writer-model" }))],
    links: [link("/writer", { agentRunId: "team-writer-copy" }, "lead-r"), link("/writer", { agentRunId: "team-writer-recorded" }, "lead-r"),
      link("/reviewer", { agentRunId: "team-catalog-agent" }, "lead-r"), link("/qa", { teamRunId: "team-catalog-team" }, "lead-r")],
  });
  await put(agentFile(memory, "team-writer-copy"), releasedAgentOwnFile(memory, "team-writer-copy",   // F-A2 (team slot)
    { coordinating: teamRun, address: "/writer", origin: "configured_place", agentDefinitionId: "writer", launch: null, delegator: "lead-r" }));
  await put(agentFile(memory, "team-writer-recorded"), releasedAgentOwnFile(memory, "team-writer-recorded",   // F-A3, F-A3b
    { coordinating: teamRun, address: "/writer", origin: "configured_place", agentDefinitionId: "writer", launch: otherLaunch, delegator: "lead-r",
      userLaunchSelection: edit, platformAgentRunId: "copy-session" }));
  await put(agentFile(memory, "team-catalog-agent"), releasedAgentOwnFile(memory, "team-catalog-agent",   // F-A1 (team), F-A1b, F-A1c
    { coordinating: teamRun, address: "/reviewer", origin: "catalog", agentDefinitionId: "reviewer", launch, delegator: "lead-r",
      launchSource: { origin: "inherited", fallbacks: [fallback] }, userLaunchSelection: edit }));
  await put(teamFile(memory, "team-catalog-team"), releasedTeamOwnTree("team-catalog-team", {   // F-T1b, F-T1c
    coordinating: teamRun, address: "/qa", origin: "catalog", teamDefinitionId: "qa-team", delegator: "lead-r", members: [{ name: "lead" }] }));

  // Org run: a direct agent and a mounted Team whose members differ from its default in different ways.
  const group = mountedTeam("/group", "group-run", slotLaunch(), [
    configuredAgent("/group/one", "one-run", "one", slotLaunch()),
    configuredAgent("/group/two", "two-run", "two", slotLaunch({ autoExecuteTools: false, workspaceRootPath: "/work/two" })),   // AR-001
    configuredAgent("/group/three", "three-run", "three", slotLaunch({ llmModelIdentifier: "other-model" })),
    configuredAgent("/group/four", "four-run", "four", { ...launch }),   // only `skillAccessMode` differs (AR-002)
  ]);
  await writeOrgRun(memory, "org-o", {
    members: [configuredAgent("/director", "director-o", "director"), group],
    handoffs: [{ from: "/group/one", to: "/director", rules: ["report"] }, { from: "/group/one", to: "/group/two", rules: ["pass"] },
      { from: "/director", to: "/group", rules: ["assign"] }],
    links: [link("/group", { teamRunId: "org-group-copy" }, "director-o"), link("/group/one", { agentRunId: "org-member-copy" }),
      link("/analyst", { agentRunId: "org-catalog" }, "director-o")],
  });
  await put(teamFile(memory, "org-group-copy"), releasedTeamOwnTree("org-group-copy", {   // F-T3 .. F-T3d (10-17 output: inside handoffs only)
    coordinating: org, address: "/group", origin: "configured_place", teamDefinitionId: "student-study-group", delegator: "director-o",
    members: ["one", "two", "three", "four"].map((name) => ({ name, launchConfiguration: projected(slotLaunch()) })),
    handoffs: [{ from: "/group/one", to: "/group/two", rules: ["pass"] }] }));
  await put(agentFile(memory, "org-member-copy"), releasedAgentOwnFile(memory, "org-member-copy",   // F-A2 (slot inside a mounted team), F-A2b
    { coordinating: org, address: "/group/one", origin: "configured_place", agentDefinitionId: "one", launch: null }));
  await put(agentFile(memory, "org-catalog"), releasedAgentOwnFile(memory, "org-catalog",   // F-A1 (org)
    { coordinating: org, address: "/analyst", origin: "catalog", agentDefinitionId: "analyst", launch, delegator: "director-o" }));
};

describe("20261019_delegated_copy_own_file_complete_v1", () => {
  it("is registered after every run-tree migration (only the Skill Improvement data removal and the autobyteus-290 stored-name renames follow), required on startup and startup-only", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    expect(definitions.at(-4)).toMatchObject({ id: DELEGATED_COPY_OWN_FILE_COMPLETE_V1_MIGRATION_ID, requiredOnStartup: true, executionPolicy: "STARTUP_ONLY" });
    expect(definitions.slice(-3).map((definition) => definition.id)).toEqual(["20261020_remove_skill_improvement_data", "20261024_node_identity_file_name", "20261024_memory_sync_source_id_names"]);
    expect(definitions.findIndex((definition) => definition.id === TASK_AGENT_OWN_RUN_V1_MIGRATION_ID)).toBeLessThan(definitions.length - 4);
  });

  it("converts every released shape in one start: catalog copies lose origin, configured-place copies take their slot (AC-005, AC-006, AC-008, AC-011)", async () => {
    const memory = await memoryRoot();
    await seedConvertible(memory);
    const result = await migrate(memory);
    expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED");
    expect(result.summary).toMatchObject({ scannedCount: 11, migratedCount: 11, failedCount: 0, skippedCount: 0 });

    // F-A1 / F-A1d: the same facts without origin.
    expect(await readJson(agentFile(memory, "hub-reviewer"))).toEqual({
      runId: "hub-reviewer", agentDefinitionId: "code-reviewer", ...launch, memoryDir: path.join(memory, "agents", "hub-reviewer"),
      platformAgentRunId: null, startedAt: T0, taskAgent: { coordinatingRun: hub, delegatorAgentRunId: "hub", address: "/code_reviewer" },
    });
    expect((await readJson(agentFile(memory, "hub-no-delegator"))).taskAgent).toEqual({ coordinatingRun: hub, address: "/code_reviewer" });
    // F-A1b / F-A1c: launch source and Settings edit kept.
    expect((await readJson(agentFile(memory, "team-catalog-agent"))).taskAgent).toEqual({ coordinatingRun: teamRun, delegatorAgentRunId: "lead-r",
      address: "/reviewer", launchSource: { origin: "inherited", fallbacks: [fallback] }, userLaunchSelection: edit });

    // F-A2: the slot's definition and launch (5 keys; `skillAccessMode` dropped) and the configured origin; identity kept.
    expect(await readJson(agentFile(memory, "team-writer-copy"))).toEqual({
      runId: "team-writer-copy", agentDefinitionId: "writer", ...launch, llmModelIdentifier: "writer-model",
      memoryDir: path.join(memory, "agents", "team-writer-copy"), platformAgentRunId: null, startedAt: T0,
      taskAgent: { coordinatingRun: teamRun, delegatorAgentRunId: "lead-r", address: "/writer", launchSource: CONFIGURED },
    });
    // F-A3 / F-A3b: a recorded launch is replaced by the slot's (what restore used before); session and Settings edit kept.
    expect(await readJson(agentFile(memory, "team-writer-recorded"))).toMatchObject({ ...launch, llmModelIdentifier: "writer-model",
      platformAgentRunId: "copy-session", taskAgent: { launchSource: CONFIGURED, userLaunchSelection: edit } });
    // F-A2 (Org slot inside a mounted Team) / F-A2b.
    expect(await readJson(agentFile(memory, "org-member-copy"))).toMatchObject({ agentDefinitionId: "one", ...launch,
      taskAgent: { coordinatingRun: org, address: "/group/one", launchSource: CONFIGURED } });
    expect((await readJson(agentFile(memory, "org-member-copy"))).taskAgent).not.toHaveProperty("delegatorAgentRunId");

    // F-T1 / F-T1b / F-T1c: members on the Team's launch follow it; the Team's own source kept or absent.
    const team1 = await readJson(teamFile(memory, "hub-team-1"));
    expect(team1.rootTeam.members.map((member: any) => [member.address, member.followsTeam, member.launchConfiguration]))
      .toEqual([["/product_team/lead", true, launch], ["/product_team/designer", true, launch]]);
    expect(team1.taskAgent).toEqual({ coordinatingRun: hub, delegatorAgentRunId: "hub", address: "/product_team", launchSource: { origin: "team_default", fallbacks: [] } });
    expect(team1.handoffs).toEqual([{ from: "/product_team/lead", to: "/product_team/designer", rules: ["deliver"] }]);
    expect((await readJson(teamFile(memory, "team-catalog-team"))).taskAgent).toEqual({ coordinatingRun: teamRun, delegatorAgentRunId: "lead-r", address: "/qa" });
    // F-T2 / F-T2b / F-T2c: own-launch members do not follow; a skipped default keeps its own source and follows (AR-003).
    const team2 = await readJson(teamFile(memory, "hub-team-2"));
    expect(team2.rootTeam.members).toEqual([
      expect.objectContaining({ address: "/se_team/lead", launchConfiguration: launch, followsTeam: true, userLaunchSelection: edit }),
      expect.objectContaining({ address: "/se_team/ie", launchConfiguration: otherLaunch, followsTeam: false, launchSource: { origin: "agent_default", fallbacks: [] } }),
      expect.objectContaining({ address: "/se_team/cr", launchConfiguration: launch, followsTeam: true, launchSource: { origin: "inherited", fallbacks: [fallback] } }),
    ]);
    expect(team2.rootTeam.members[0]).not.toHaveProperty("launchSource");
    expect(team2.taskAgent).toMatchObject({ launchSource: { origin: "inherited", fallbacks: [] }, userLaunchSelection: edit });

    // F-T3..F-T3d: the slot's facts (5 keys), followers by the configured rule, and the members' rules in the Org (D-4).
    const group = await readJson(teamFile(memory, "org-group-copy"));
    expect(group.rootTeam).toMatchObject({ teamDefinitionId: "student-study-group", coordinatorAddress: "/group/one", defaultLaunchConfiguration: launch });
    expect(group.rootTeam.members.map((member: any) => [member.address, member.agentRunId, member.followsTeam])).toEqual([
      ["/group/one", "org-group-copy-one", true], ["/group/two", "org-group-copy-two", true],
      ["/group/three", "org-group-copy-three", false], ["/group/four", "org-group-copy-four", true],
    ]);
    expect(group.rootTeam.members[1].launchConfiguration).toEqual({ ...launch, autoExecuteTools: false, workspaceRootPath: "/work/two" });
    expect(group.handoffs).toEqual([{ from: "/group/one", to: "/director", rules: ["report"] }, { from: "/group/one", to: "/group/two", rules: ["pass"] }]);
    expect(group.taskAgent).toEqual({ coordinatingRun: org, delegatorAgentRunId: "director-o", address: "/group", launchSource: CONFIGURED });

    // No own file carries origin or a slot-only key (REQ-005, AR-002).
    const all = await snapshot(memory);
    for (const file of Object.keys(all).filter((name) => /(run_metadata|team_run_execution_tree)\.json$/.test(name))) {
      const text = await fs.readFile(path.join(memory, file), "utf8");
      if (!text.includes("taskAgent")) continue;
      expect(text, file).not.toMatch(/"origin": "(catalog|configured_place)"|skillAccessMode/);
    }

    // The current stores compose every copy from its own file (REQ-001).
    const team = (await new TeamRunExecutionTreeStore().read(path.join(memory, "agent_teams", "team-r"), "team-r"))!;
    expect(team.rootTeam.taskExecutions.map((task) => "agentRunId" in task ? task.agentRunId : task.teamRunId))
      .toEqual(["team-writer-copy", "team-writer-recorded", "team-catalog-agent", "team-catalog-team"]);
    const orgTree = (await new AgentOrgRunExecutionTreeStore().read(path.join(memory, "agent_orgs", "org-o"), "org-o"))!;
    expect(orgTree.rootOrg.taskExecutions).toHaveLength(3);
    const hubTree = (await new StandaloneRootPackageStore().readTree(path.join(memory, "agents", "hub", "collaboration"), "hub"))!;
    expect(hubTree.taskExecutions).toHaveLength(4);
  });

  it("changes nothing on a second start: every own file is current and none is written (AC-008, F-X2)", async () => {
    const memory = await memoryRoot();
    await seedConvertible(memory);
    await migrate(memory);
    const first = await snapshot(memory);
    const writes = vi.spyOn(AtomicRunPackageFileCommitWriter.prototype, "write");
    const again = await migrate(memory);
    expect(again.status).toBe("SUCCEEDED");
    expect(again.summary).toMatchObject({ scannedCount: 11, migratedCount: 0, failedCount: 0, skippedCount: 11 });
    expect(new Set(Object.values(dispositions(again)))).toEqual(new Set(["SKIPPED_ALREADY_CURRENT"]));
    expect(writes).not.toHaveBeenCalled();
    expect(await snapshot(memory)).toEqual(first);
  });

  it("leaves an unconvertible copy untouched and reported; the store leaves it out and loads the rest (AC-007, REQ-008)", async () => {
    const memory = await memoryRoot();
    await writeTeamRun(memory, "team-r", {
      members: [configuredAgent("/lead", "lead-r", "lead")],
      links: [link("/ghost", { agentRunId: "gone-slot" }, "lead-r"), link("/reviewer", { agentRunId: "fine" }, "lead-r")],
    });
    await writeOrgRun(memory, "org-o", {
      members: [mountedTeam("/group", "group-run", slotLaunch(), [configuredAgent("/group/one", "one-run", "one")])],
      links: [link("/group", { teamRunId: "gone-team" })],
    });
    await put(agentFile(memory, "gone-slot"), releasedAgentOwnFile(memory, "gone-slot",   // F-A4
      { coordinating: teamRun, address: "/ghost", origin: "configured_place", agentDefinitionId: "ghost", launch: null, delegator: "lead-r" }));
    await put(agentFile(memory, "gone-run"), releasedAgentOwnFile(memory, "gone-run",   // F-A4b
      { coordinating: { kind: "agent_team", runId: "deleted-run" }, address: "/writer", origin: "configured_place", agentDefinitionId: "writer", launch: null }));
    await put(teamFile(memory, "gone-team"), releasedTeamOwnTree("gone-team", {   // F-T4: the slot's members differ
      coordinating: org, address: "/group", origin: "configured_place", teamDefinitionId: "student-study-group",
      members: [{ name: "one", launchConfiguration: launch }, { name: "five", launchConfiguration: launch }] }));
    await put(agentFile(memory, "broken"), "{ not json");   // F-X1
    await put(agentFile(memory, "fine"), releasedAgentOwnFile(memory, "fine",
      { coordinating: teamRun, address: "/reviewer", origin: "catalog", agentDefinitionId: "reviewer", launch, delegator: "lead-r" }));
    const preserved = ["gone-slot", "gone-run", "broken"].map((id) => agentFile(memory, id)).concat(teamFile(memory, "gone-team"));
    const before = Object.fromEntries(await Promise.all(preserved.map(async (file) => [file, await sha(file)])));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await migrate(memory);
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(dispositions(result)).toEqual({
      "task_agent:broken": "PRESERVED_UNREADABLE", "task_agent:fine": "MIGRATED", "task_agent:gone-run": "PRESERVED_PLACEMENT_MISSING",
      "task_agent:gone-slot": "PRESERVED_PLACEMENT_MISSING", "task_agent_team:gone-team": "PRESERVED_PLACEMENT_MISSING",
    });
    for (const file of preserved) expect(await sha(file), file).toBe(before[file]);
    expect(warn.mock.calls.map(([line]) => String(line)).filter((line) => line.includes("is left unchanged and is not loaded"))).toHaveLength(4);

    // Not loaded (unavailable), and every other copy of the same run loads.
    const team = (await new TeamRunExecutionTreeStore().read(path.join(memory, "agent_teams", "team-r"), "team-r"))!;
    expect(team.rootTeam.taskExecutions.map((task) => "agentRunId" in task && task.agentRunId)).toEqual(["fine"]);
    const orgTree = (await new AgentOrgRunExecutionTreeStore().read(path.join(memory, "agent_orgs", "org-o"), "org-o"))!;
    expect(orgTree.rootOrg.taskExecutions).toEqual([]);
    expect(warn.mock.calls.some(([line]) => String(line).includes("Task agent 'gone-team' of agent_org run 'org-o' is not available"))).toBe(true);
    // A later start reports the same and changes nothing.
    const again = await migrate(memory);
    expect(again.status).toBe("SUCCEEDED_WITH_WARNINGS");
    for (const file of preserved) expect(await sha(file), file).toBe(before[file]);
  });

  it("converts what is present but stays non-terminal while 20261017_task_agent_own_run_v1 is pending (M5)", async () => {
    const memory = await memoryRoot();
    await seedConvertible(memory);
    const pending = await migrate(memory, { predecessor: "FAILED" });
    expect(pending).toMatchObject({ status: "FAILED", errorMessage: `Waiting for ${TASK_AGENT_OWN_RUN_V1_MIGRATION_ID}; the next start continues.` });
    expect(pending.summary).toMatchObject({ migratedCount: 11, failedCount: 0 });
    expect((await readJson(agentFile(memory, "team-writer-copy"))).taskAgent).not.toHaveProperty("origin");
    const done = await migrate(memory);
    expect(done).toMatchObject({ status: "SUCCEEDED", errorMessage: null });
    expect(done.summary.migratedCount).toBe(0);
  });

  it("completes configured-place copies whose coordinating tree is still in its pre-own-run shape (M3, M4, R-9 b)", async () => {
    // 10-17 stopped after writing these own files and before reducing the coordinating trees: the trees still hold
    // the full released records (no links). The slot locator reads the same `members[]` in both shapes.
    const memory = await memoryRoot();
    const fullAgentRecord = (address: string, agentRunId: string, delegator: string) =>
      ({ address, agentRunId, platformAgentRunId: null, delegatorAgentRunId: delegator, startedAt: T0 });
    await writeTeamRun(memory, "team-pre", {
      members: [configuredAgent("/lead", "lead-p", "lead"), configuredAgent("/writer", "writer-p", "writer", slotLaunch({ llmModelIdentifier: "writer-model" }))],
      links: [fullAgentRecord("/writer", "pre-writer-copy", "lead-p")],
    });
    const group = mountedTeam("/group", "group-run", slotLaunch(), [
      configuredAgent("/group/one", "one-run", "one", slotLaunch()),
      configuredAgent("/group/two", "two-run", "two", slotLaunch({ llmModelIdentifier: "other-model" })),
    ]);
    await writeOrgRun(memory, "org-pre", {
      members: [configuredAgent("/director", "director-p", "director"), group],
      handoffs: [{ from: "/group/two", to: "/director", rules: ["report"] }],
      links: [{ address: "/group", teamRunId: "pre-group-copy", delegatorAgentRunId: "director-p", startedAt: T0, taskExecutions: [],
        members: [{ address: "/group/one", agentRunId: "pre-group-copy-one", platformAgentRunId: null },
          { address: "/group/two", agentRunId: "pre-group-copy-two", platformAgentRunId: null }] }],
    });
    const teamPre = { kind: "agent_team" as const, runId: "team-pre" };
    const orgPre = { kind: "agent_org" as const, runId: "org-pre" };
    await put(agentFile(memory, "pre-writer-copy"), releasedAgentOwnFile(memory, "pre-writer-copy",
      { coordinating: teamPre, address: "/writer", origin: "configured_place", agentDefinitionId: "writer", launch: null, delegator: "lead-p" }));
    await put(teamFile(memory, "pre-group-copy"), releasedTeamOwnTree("pre-group-copy", {
      coordinating: orgPre, address: "/group", origin: "configured_place", teamDefinitionId: "student-study-group", delegator: "director-p",
      members: ["one", "two"].map((name) => ({ name, launchConfiguration: projected(slotLaunch()) })) }));

    const result = await migrate(memory, { predecessor: "FAILED" });
    expect(dispositions(result)).toEqual({ "task_agent:pre-writer-copy": "MIGRATED", "task_agent_team:pre-group-copy": "MIGRATED" });
    expect(await readJson(agentFile(memory, "pre-writer-copy"))).toMatchObject({ agentDefinitionId: "writer", ...launch, llmModelIdentifier: "writer-model",
      taskAgent: { coordinatingRun: teamPre, address: "/writer", launchSource: CONFIGURED } });
    const copy = await readJson(teamFile(memory, "pre-group-copy"));
    expect(copy.rootTeam.members.map((member: any) => [member.address, member.followsTeam, member.launchConfiguration.llmModelIdentifier]))
      .toEqual([["/group/one", true, launch.llmModelIdentifier], ["/group/two", false, "other-model"]]);
    expect(copy.handoffs).toEqual([{ from: "/group/two", to: "/director", rules: ["report"] }]);
  });

  it("a write that does not complete fails that item, keeps the file, and the next start converts it", async () => {
    const memory = await memoryRoot();
    await seedConvertible(memory);
    const target = agentFile(memory, "team-writer-copy");
    const before = await sha(target);
    const failing = new (class extends AtomicRunPackageFileCommitWriter {
      override async write(input: Parameters<AtomicRunPackageFileCommitWriter["write"]>[0]): Promise<RunPackageFileWriteResult<any>> {
        if (input.filePath === target) return { outcome: "not_renamed", file: input.file, stage: "rename", cause: new Error("stopped") };
        return super.write(input);
      }
    })();
    const first = await migrate(memory, { writer: failing });
    expect(first).toMatchObject({ status: "FAILED", errorMessage: "1 delegated copy own file(s) are not converted yet; the next start continues." });
    expect(dispositions(first)["task_agent:team-writer-copy"]).toBe("FAILED_OPERATION");
    expect(await sha(target)).toBe(before);
    const second = await migrate(memory);
    expect(second.status).toBe("SUCCEEDED");
    expect(dispositions(second)["task_agent:team-writer-copy"]).toBe("MIGRATED");
  });

  it("reads only own files, and a coordinating tree only for configured-place copies, once per run (QR-002)", async () => {
    const memory = await memoryRoot();
    await seedConvertible(memory);
    const read = vi.spyOn(fs, "readFile");
    await migrate(memory);
    const reads = read.mock.calls.map(([file]) => path.relative(memory, String(file)));
    // The Team run's tree (a discovery candidate too) serves two copies of `/writer`, the Org's two copies of its slots;
    // each is read once. The hub's tree is never read.
    expect(reads.filter((file) => file === "agent_teams/team-r/team_run_execution_tree.json")).toHaveLength(1);
    expect(reads.filter((file) => file === "agent_orgs/org-o/agent_org_run_execution_tree.json")).toHaveLength(1);
    expect(reads.some((file) => file.startsWith("agents/hub/collaboration"))).toBe(false);
    // One read per candidate file, plus one read-back per written file.
    expect(reads.filter((file) => file === "agents/hub-reviewer/run_metadata.json")).toHaveLength(2);
    expect(reads.filter((file) => file === "agents/hub/run_metadata.json")).toHaveLength(1);
  });

  it("never discovers Memory Sync mirrors under imports/ (F-X3)", async () => {
    const memory = await memoryRoot();
    const mirror = path.join(memory, "imports", "node-a");
    await put(agentFile(mirror, "mirrored"), releasedAgentOwnFile(mirror, "mirrored",
      { coordinating: hub, address: "/code_reviewer", origin: "configured_place", agentDefinitionId: "code-reviewer", launch: null }));
    const before = await snapshot(mirror);
    const result = await migrate(memory);
    expect(result.summary.scannedCount).toBe(0);
    expect(await snapshot(mirror)).toEqual(before);
  });
});

/**
 * Change Sequence step 1.3: the released 10-17 output, then this migration, then the current stores. This is where the
 * 10-17 suite's read-back through the current stores lives now, and the AC-005 restore proof: a copy of a configured
 * place restores with exactly the values restore used before the upgrade (its slot's).
 */
describe("20261017_task_agent_own_run_v1 output, then 20261019_delegated_copy_own_file_complete_v1, then the current stores", () => {
  const ownRun = (memory: string) => new TaskAgentOwnRunV1AppDataMigration(memory, { ledger: ledger() }).execute();
  const dataRoot = async () => {
    const memory = await memoryRoot();
    await writeReleasedDataRoot(memory);
    return memory;
  };
  /** A released record in today's composed shape: a Team copy's members complete (D-5); a configured-place copy from its slot. */
  const current = (record: any): any => {
    if ("agentRunId" in record) return record;
    const { taskExecutions: _nested, ...team } = record;
    return { ...team, taskExecutions: [], source: { ...record.source, members: record.source.members.map((member: any) => ({
      ...member, launchConfiguration: member.launchConfiguration ?? record.source.defaultLaunchConfiguration, followsTeam: member.launchConfiguration === undefined,
    })) } };
  };
  const fromSlot = (record: any, slot: any) => ({ ...record, source: { kind: "agent", agentDefinitionId: slot.agentDefinitionId,
    launchConfiguration: projected(slot.launchConfiguration), launchSource: CONFIGURED } });

  it("composes every copy from its own file, and a copy of a configured place restores with its slot's values (AC-001, AC-005)", async () => {
    const memory = await dataRoot();
    expect((await ownRun(memory)).status).toBe("SUCCEEDED");
    const completed = await migrate(memory);
    expect(completed.status, JSON.stringify(completed.summary.details)).toBe("SUCCEEDED");
    expect(dispositions(completed)).toMatchObject({ "task_agent:c3-writer-copy": "MIGRATED", "task_agent:ns-director-copy": "MIGRATED",
      "task_agent:c1-reviewer": "MIGRATED", "task_agent_team:c2-team-a": "MIGRATED" });

    const hub = hubRecords();
    const hubTree = (await new StandaloneRootPackageStore().readTree(path.join(memory, "agents/hub/collaboration"), "hub"))!;
    expect(hubTree.taskExecutions).toEqual([hub.c1, hub.c2a, hub.c2b, hub.neverRan, hub.c2a.taskExecutions[0]].map(current));

    const teamDir = path.join(memory, "agent_teams/team-r");
    const rawTeam = await readJson(path.join(teamDir, "team_run_execution_tree.json"));
    const team = teamRunRecords();
    const teamTree = (await new TeamRunExecutionTreeStore().read(teamDir, "team-r"))!;
    expect(teamTree.rootTeam.taskExecutions).toEqual([fromSlot(team.c3, rawTeam.rootTeam.members[1]), team.nd, team.c4].map(current));

    const orgDir = path.join(memory, "agent_orgs/org-o");
    const rawOrg = await readJson(path.join(orgDir, "agent_org_run_execution_tree.json"));
    const org = orgRecords();
    const orgTree = (await new AgentOrgRunExecutionTreeStore().read(orgDir, "org-o"))!;
    expect(orgTree.rootOrg.taskExecutions).toEqual([org.c5, org.c5team, fromSlot(org.ns, rawOrg.rootOrg.members[0])].map(current));
    expect((orgTree.rootOrg.members[1] as { taskExecutions: unknown[] }).taskExecutions).toEqual([org.c6]);

    // Restore projects only the copy's own source; it equals the slot's configured node today's restore used.
    const c3 = teamTree.rootTeam.taskExecutions[0] as TaskAgentExecution;
    const restored = restoreTaskAgentNode({ source: projectTaskExecutionSource(c3.address, c3.source).node, execution: c3 });
    expect(projected(restored as never)).toEqual(projected(rawTeam.rootTeam.members[1].launchConfiguration));
    expect(restored.agentDefinitionId).toBe(rawTeam.rootTeam.members[1].agentDefinitionId);
  });

  it("continues a stopped start: the app loads and saves in between, and the next start completes both migrations (F-RERUN-MSG)", async () => {
    const memory = await dataRoot();
    vi.spyOn(fs, "rename").mockImplementationOnce(async () => { throw new Error("stopped before the move"); });
    expect((await ownRun(memory)).status).toBe("FAILED");
    vi.restoreAllMocks();
    // Same start: the own files present are completed; 10-17 is pending, so the result stays non-terminal.
    const waiting = await new DelegatedCopyOwnFileCompleteV1AppDataMigration(memory, { ledger: ledger("FAILED") }).execute();
    expect(waiting.status).toBe("FAILED");
    // The app ran in between: it loads and saves the hub's tree through the current store.
    const store = new StandaloneRootPackageStore();
    const loaded = (await store.readTree(path.join(memory, "agents/hub/collaboration"), "hub"))!;
    await store.writeTree(path.join(memory, "agents/hub/collaboration"), loaded);

    expect((await ownRun(memory)).status).toBe("SUCCEEDED");
    expect((await migrate(memory)).status).toBe("SUCCEEDED");
    expect((await readJson(path.join(memory, "agents/hub/collaboration/collaboration_tree.json"))).taskExecutions.map((task: any) => task.agentRunId ?? task.teamRunId))
      .toEqual(["c1-reviewer", "c2-team-a", "c2-team-b", "never-ran", "c7-helper"]);
    const reloaded = (await store.readTree(path.join(memory, "agents/hub/collaboration"), "hub"))!;
    expect(reloaded.taskExecutions.map((task) => "agentRunId" in task ? task.agentRunId : task.teamRunId))
      .toEqual(["c1-reviewer", "c2-team-a", "c2-team-b", "never-ran", "c7-helper"]);
    expect((await readJson(agentFile(memory, "c7-helper"))).taskAgent).not.toHaveProperty("origin");
  });
});
