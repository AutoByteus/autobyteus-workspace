import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AppConfig } from "../../../src/config/app-config.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID as FAMILY } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID as LOCATORS } from "../../../src/app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1-app-data-migration.js";
import { AGENT_ORG_HISTORY_FIRST_MESSAGE_SUMMARY_V1_MIGRATION_ID as SUMMARY } from "../../../src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-v1-app-data-migration.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { toReleasedTeamRunExecutionTreeV2, toReleasedConfiguredNode } from "../../fixtures/released-run-tree-fixtures.js";

/**
 * SR-007 evidence item 3 (unit level): a skip-version install whose ledger is terminal only
 * through the migrations before `20260901`. Every pending production migration runs as
 * released (`20260901` through its frozen strict classifiers, then `20260926` and `20260905`),
 * and no migration of this change exists: released trees stay as they are on disk and the
 * current tolerant reader admits them. Records files stay byte-identical, the tree-less root
 * stays excluded, and a repeat startup runs nothing.
 */
const roots: string[] = [], clients: PrismaClient[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(clients.splice(0).map((client) => client.$disconnect()));
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : json(value));
};
const sha = async (file: string) => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const tree = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, await tree(file)); else out[file] = await sha(file);
  }
  return out;
};
const T0 = "2026-09-01T00:00:00.000Z";
const filename = "ctx_file__image.png";

it("runs 20260901, 20260926 and 20260905 as released on a skip-version install, reads released trees as they are, and repeat startup runs nothing", async () => {
  const { appConfigProvider } = await import("../../../src/config/app-config-provider.js");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "released-tree-skip-version-")); roots.push(root);
  const memory = path.join(root, "memory"), teams = path.join(root, "data", "agent-teams"), orgs = path.join(root, "data", "agent-orgs");
  await Promise.all([fs.mkdir(teams, { recursive: true }), fs.mkdir(orgs, { recursive: true })]);
  const config = new AppConfig({ appDataDir: root });
  vi.spyOn(config, "getAgentTeamsDir").mockReturnValue(teams);
  vi.spyOn(config, "getAgentOrgsDir").mockReturnValue(orgs);
  vi.spyOn(config, "getMemoryDir").mockReturnValue(memory);
  vi.spyOn(config, "getBaseUrl").mockReturnValue("http://127.0.0.1:43151");
  vi.spyOn(config, "getOperationalDatabaseUrl").mockReturnValue(process.env["DATABASE_URL"]!);
  vi.spyOn(config, "getAdditionalAgentPackageRoots").mockReturnValue([]);
  vi.spyOn(config, "getAdditionalApplicationPackageRoots").mockReturnValue([]);
  vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(config);

  // Team v2 + records with a delegated task Agent, and an old member-address locator for 20260926.
  const teamDir = path.join(memory, "agent_teams", "team-a");
  const base = testExecutionTree({ rootTeamRunId: "team-a", coordinatorAddress: "/worker", createdAt: T0,
    children: [testAgentNode("/worker", { agentRunId: "configured-run" })] });
  await put(path.join(teamDir, "team_run_execution_tree.json"), toReleasedTeamRunExecutionTreeV2({ ...base, rootTeam: { ...base.rootTeam,
    taskExecutions: [{ address: "/worker", agentRunId: "task-run", platformAgentRunId: null, delegatorAgentRunId: "configured-run", startedAt: T0 }] } }));
  await put(path.join(teamDir, "task_delegation_records.json"), { schemaVersion: 1, rootTeamRunId: "team-a", records: [{
    taskId: "t1", delegatorAgentRunId: "configured-run", recipientAddress: "/worker", taskExecution: { agentRunId: "task-run" },
    description: "Delegated work", referenceFiles: [], status: "interrupted", createdAt: T0,
    updates: [{ interruptionId: "i1", reason: "stopped", createdAt: T0 }] }] });
  await put(path.join(teamDir, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "team-a", messages: [] });
  await put(path.join(teamDir, "configured-run", "context_files", filename), "configured bytes");
  const oldLocator = `/rest/team-runs/team-a/members/%2Fworker/context-files/${filename}`;
  await put(path.join(teamDir, "configured-run", "raw_traces_active.jsonl"),
    JSON.stringify({ id: "trace-1", trace_type: "user", content: "see image", media: { images: [oldLocator] } }) + "\n");

  // Tree-less nonempty root: preserved byte-for-byte.
  const treeless = path.join(memory, "agent_teams", "no-tree");
  await put(path.join(treeless, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "no-tree", messages: [] });

  // Released Team root that 20260901 turns into an Org; 20260905 derives its first-message summary.
  const orgSource = path.join(memory, "agent_teams", "org-a");
  const orgBase = testExecutionTree({ rootTeamRunId: "org-a", coordinatorAddress: "/director", createdAt: T0,
    children: [testAgentNode("/director", { agentRunId: "director" })] });
  await put(path.join(orgSource, "team_run_execution_tree.json"), toReleasedTeamRunExecutionTreeV2({ ...orgBase, rootTeam: { ...orgBase.rootTeam,
    members: [...orgBase.rootTeam.members, toReleasedConfiguredNode(testOrgTeamNode({ address: "/team", teamRunId: "mounted", coordinatorAddress: "/team/lead",
      members: [testOrgAgentNode("/team/lead", "lead")] }))] } }));
  await put(path.join(orgSource, "task_delegation_records.json"), { schemaVersion: 1, rootTeamRunId: "org-a", records: [] });
  await put(path.join(orgSource, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "org-a", messages: [] });
  await put(path.join(orgSource, "director", "raw_traces_active.jsonl"),
    JSON.stringify({ id: "first", trace_type: "user", turn_id: "turn-1", seq: 1, ts: 1788257556, source_event: "AgentRun.postUserMessage", content: "Plan the release" }) + "\n");

  const recordsHash = await sha(path.join(teamDir, "task_delegation_records.json"));
  const teamTreeHash = await sha(path.join(teamDir, "team_run_execution_tree.json"));
  const treelessBefore = await tree(treeless);

  // Skip-version upgrade: the ledger holds every migration released before 20260901 (by ID date,
  // not list position); 20260901 and everything released after it is pending.
  const db = new PrismaClient({ datasources: { db: { url: `file:${path.join(root, "records.sqlite")}` } } }); clients.push(db);
  const ddl = (await fs.readFile(path.resolve("prisma/migrations/20260517090000_add_app_data_migration_records/migration.sql"), "utf8")).replaceAll('"summary_json"', '"summary"');
  for (const statement of ddl.split(";").filter((part) => part.trim())) await db.$executeRawUnsafe(statement);
  const repository = new AppDataMigrationRecordRepository(db);
  const registry = new AppDataMigrationRegistry();
  const ids = registry.listDefinitions().map((definition) => definition.id);
  const released = ids.filter((id) => id < FAMILY);
  for (const id of released) {
    await repository.markRunning({ migrationId: id, displayName: id, startedAt: new Date(0) });
    await repository.complete({ migrationId: id, displayName: id, status: "SUCCEEDED", completedAt: new Date(0), summary: "earlier release", errorMessage: null, logPath: null });
  }

  const runner = new AppDataMigrationRunner(registry, repository, { logsDir: path.join(root, "logs") });
  const results = await runner.runPending();
  // Migrations released earlier are not re-run.
  for (const id of released) expect((await repository.getRecord(id))?.summary).toBe("earlier release");
  for (const id of [FAMILY, LOCATORS, SUMMARY]) {
    const result = results.find((candidate) => candidate.migrationId === id)!;
    expect(result.status, `${id}: ${result.logPath ? await fs.readFile(result.logPath, "utf8") : result.errorMessage}`)
      .toMatch(/^SUCCEEDED/);
  }
  expect(ids.some((id) => id.includes("delegator"))).toBe(false);

  // (1) No startup rewrite of this change: the released Team tree keeps its bytes (V2, settledAt)…
  expect(await sha(path.join(teamDir, "team_run_execution_tree.json"))).toBe(teamTreeHash);
  // …and the current tolerant reader loads it; the old child carries no delegator.
  const teamTree = validateTeamRunExecutionTreePayload(JSON.parse(await fs.readFile(path.join(teamDir, "team_run_execution_tree.json"), "utf8")), "team-a");
  expect(teamTree.rootTeam.taskExecutions).toEqual([{ address: "/worker", agentRunId: "task-run", platformAgentRunId: null, startedAt: T0 }]);
  // (2) 20260901 produced the Org exactly as released (Org tree V1); the current reader loads it.
  const orgTreeRaw = JSON.parse(await fs.readFile(path.join(memory, "agent_orgs", "org-a", "agent_org_run_execution_tree.json"), "utf8"));
  expect(orgTreeRaw).toMatchObject({ schemaVersion: 1, subjectKind: "agent_org", rootOrg: { orgRunId: "org-a" } });
  expect(validateAgentOrgRunExecutionTreePayload(orgTreeRaw, "org-a").rootOrg.members.map((member) => member.address)).toEqual(["/director", "/team"]);
  // (3) 20260926 converted the locator inside the released Team package.
  const trace = JSON.parse(await fs.readFile(path.join(teamDir, "configured-run", "raw_traces_active.jsonl"), "utf8"));
  expect(trace.media.images).toEqual([`/rest/team-runs/team-a/agent-runs/configured-run/context-files/${filename}`]);
  // (4) 20260905 produced the first-message summary for the released Org.
  const orgRows = await new AgentOrgRunHistoryIndexStore(memory).readIndex();
  expect(orgRows.find((row) => row.orgRunId === "org-a")?.summary).toBe("Plan the release");
  // (5) Records files stay byte-identical; admission takes the tree roots and still excludes the
  // tree-less root (no tree is created for it).
  expect(await sha(path.join(teamDir, "task_delegation_records.json"))).toBe(recordsHash);
  await expect(fs.stat(path.join(treeless, "team_run_execution_tree.json"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(await tree(treeless)).toEqual(treelessBefore);
  resetRootRunPackageReadinessIndex(memory);
  const readiness = new RootRunPackageReadinessIndex(memory);
  await readiness.rebuild();
  expect(readiness.listDiagnostics()).toEqual([expect.objectContaining({ rootRunId: "no-tree", code: "ROOT_RUN_PACKAGE_MISSING_TREE" })]);
  expect(readiness.listAdmitted("agent_team")).toEqual(["team-a"]);
  expect(readiness.listAdmitted("agent_org")).toEqual(["org-a"]);

  // (6) A repeat startup runs nothing and changes nothing.
  const ledgerBefore = await Promise.all(ids.map((id) => repository.getRecord(id)));
  const memoryBefore = await tree(memory);
  await new AppDataMigrationRunner(new AppDataMigrationRegistry(), repository, { logsDir: path.join(root, "logs") }).runPending();
  expect(await Promise.all(ids.map((id) => repository.getRecord(id)))).toEqual(ledgerBefore);
  expect(await tree(memory)).toEqual(memoryBefore);
});
