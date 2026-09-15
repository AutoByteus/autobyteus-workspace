import { AgentOrgTokenAttributionTransition } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-transition.js";
const emptyTokens = (memory: string) => new AgentOrgTokenAttributionTransition(memory, {
  async *listClaimedRoots() {}, async convertRoot() { return 0; },
});
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AppConfig } from "../../../src/config/app-config.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import { AppDataMigrationRecordRepository } from "../../../src/app-data-migrations/repositories/app-data-migration-record-repository.js";
import { AgentOrgFlatTeamFamiliesV1AppDataMigration, AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID as FAMILY } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID as PREREQUISITE } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js";
const AUTHORING = "20260911_collaboration_definition_authoring_shape";

import { testExecutionTree, testAgentNode } from "../../fixtures/current-team-run-fixtures.js";
import { testOrgTeamNode, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const roots: string[] = [], clients: PrismaClient[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(clients.splice(0).map((c) => c.$disconnect()));
  await Promise.all(roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })));
});
const team = () => ({ coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "unchanged-agent", refScope: "shared" }],
  handoffs: [{ from: "/lead", to: "/lead", rules: ["Original prose"] }], avatarUrl: null,
  defaultLaunchConfig: { llmModelIdentifier: "model", runtimeKind: "codex_app_server", llmConfig: { temperature: 0, nested: [null, false, "exact"] } } });
const org = () => ({ members: [{ memberName: "team", ref: "unavailable-external-team", refType: "agent_team", refScope: "shared" }],
  handoffs: [], avatarUrl: null, defaultLaunchConfig: null });
const markdown = "---\nname: Authored name\ndescription: Exact description\n---\n\nInstructions stay bytewise.\n";
const json = (data: unknown) => JSON.stringify(data, null, 2) + "\n";
const write = async (dir: string, family: "team" | "org", data: unknown) => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${family}-config.json`), json(data));
  await fs.writeFile(path.join(dir, `${family}.md`), markdown);
  await fs.writeFile(path.join(dir, "asset.bin"), Buffer.from([0, 255, 4]));
  return path.join(dir, `${family}-config.json`);
};
const environment = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "authoring-migration-")); roots.push(root);
  const teams = path.join(root, "data", "agent-teams"), orgs = path.join(root, "data", "agent-orgs"), memory = path.join(root, "memory");
  const config = { getAgentTeamsDir: () => teams, getAgentOrgsDir: () => orgs, getBaseUrl: () => "http://127.0.0.1:43151" } as AppConfig;
  return { root, teams, orgs, memory, config };
};

const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(result, await snapshot(file));
    else result[file] = await fs.readFile(file, "base64");
  }
  return result;
};

const runnerFor = async (env: Awaited<ReturnType<typeof environment>>) => {
  const db = new PrismaClient({ datasources: { db: { url: `file:${path.join(env.root, "records.sqlite")}` } } }); clients.push(db);
  // Real current repository over an isolated SQLite database using the released record DDL.
  const ddl = (await fs.readFile(path.resolve("prisma/migrations/20260517090000_add_app_data_migration_records/migration.sql"), "utf8")).replaceAll('"summary_json"', '"summary"');
  for (const statement of ddl.split(";").filter((s) => s.trim())) await db.$executeRawUnsafe(statement);
  const repository = new AppDataMigrationRecordRepository(db);
  const prerequisite = { id: PREREQUISITE, displayName: "Current runtime prerequisite", description: "already current", requiredOnStartup: true,
    execute: async () => ({ status: "SUCCEEDED" as const, summary: { scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] }, errorMessage: null }) };
  const family = new AgentOrgFlatTeamFamiliesV1AppDataMigration(env.memory, env.config, undefined, emptyTokens(env.memory));
  const registry = new AppDataMigrationRegistry([prerequisite, { ...prerequisite, id: "20260819_token_usage_run_records_v1" }, family]);
  const runner = new AppDataMigrationRunner(registry, repository, { logsDir: path.join(env.root, "logs") });
  return { runner, registry, repository, family };
};

it.each(["SUCCEEDED", "FAILED", "RUNNING"] as const)("leaves obsolete authoring ledger %s inert, and skips completed runtime family", async status => {
  const env = await environment();
  const file = await write(path.join(env.teams, "untouched"), "team", { ...team(), schemaVersion: 2 });
  const bytes = await fs.readFile(file);
  const { runner, registry, repository, family } = await runnerFor(env);
  await repository.markRunning({ migrationId: AUTHORING, displayName: "Old authoring", startedAt: new Date(0) });
  if (status !== "RUNNING") await repository.complete({ migrationId: AUTHORING, displayName: "Old authoring", status, completedAt: new Date(), summary: "Old state", errorMessage: null, logPath: null });
  const authoringBefore = await repository.getRecord(AUTHORING);
  await repository.markRunning({ migrationId: FAMILY, displayName: family.displayName, startedAt: new Date() });
  await repository.complete({ migrationId: FAMILY, displayName: family.displayName, status: "SUCCEEDED", completedAt: new Date(), summary: "Current", errorMessage: null, logPath: null });
  const familyBefore = await repository.getRecord(FAMILY), execute = vi.spyOn(family, "execute");
  const statuses = await runner.runPending();
  expect(registry.getDefinition(AUTHORING)).toBeNull();
  expect(statuses.some(s => s.migrationId === AUTHORING)).toBe(false);
  expect(await repository.getRecord(AUTHORING)).toEqual(authoringBefore);
  expect(await repository.getRecord(FAMILY)).toEqual(familyBefore);
  expect(execute).not.toHaveBeenCalled(); expect(await fs.readFile(file)).toEqual(bytes);
  await expect(runner.runMigration(AUTHORING)).rejects.toThrow();
});
it("runs the complete production registry on a fresh pre-ticket data root, preserving authored configs while migrating runtime history", async () => {
  const { appConfigProvider } = await import("../../../src/config/app-config-provider.js");
  const env = await environment();
  const config = new AppConfig({ appDataDir: env.root });
  // Production AppConfig getters create their owned roots before registry execution.
  await fs.mkdir(env.orgs, { recursive: true });
  vi.spyOn(config, "getAgentTeamsDir").mockReturnValue(env.teams);
  vi.spyOn(config, "getAgentOrgsDir").mockReturnValue(env.orgs);
  vi.spyOn(config, "getMemoryDir").mockReturnValue(env.memory);
  vi.spyOn(config, "getOperationalDatabaseUrl").mockReturnValue(process.env['DATABASE_URL']!);
  vi.spyOn(config, "getAdditionalAgentPackageRoots").mockReturnValue([path.join(env.root, "external-package")]);
  vi.spyOn(config, "getAdditionalApplicationPackageRoots").mockReturnValue([]);
  vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(config);
  const legacyFlat = { ...team(), members: team().members.map((m) => ({ ...m, refType: "agent" })) };
  await write(path.join(env.teams, "flat"), "team", legacyFlat);
  const legacyOrg = { ...legacyFlat, coordinatorMemberName: "direct", members: [
    { memberName: "direct", ref: "original-agent", refType: "agent", refScope: "shared" },
    { memberName: "team", ref: "child", refType: "agent_team", refScope: "team_local" },
  ], handoffs: [] };
  const source = path.join(env.teams, "mixed"); await write(source, "team", legacyOrg);
  await write(path.join(source, "agent-teams", "child"), "team", legacyFlat);
  await write(path.join(source, "agent-teams", "unreferenced"), "team", legacyFlat);
  const external = await write(path.join(env.root, "external-package", "agent-orgs", "external"), "org", { schemaVersion: 1, ...org() });
  const externalBytes = await fs.readFile(external);
  const authoredBefore = await snapshot(env.teams);
  const orgBefore = await snapshot(env.orgs);
  const { repository } = await runnerFor(env);
  // Representative pre-ticket current trace layout + released one-level Team root.
  // This is disposable first startup, not an execution against any inventoried installation.
  vi.spyOn(config, "getBaseUrl").mockReturnValue("http://127.0.0.1:43151");
  const runtimeSource = path.join(env.memory, "agent_teams", "runtime-org");
  await fs.mkdir(path.join(runtimeSource, "mounted", "worker", "context_files"), { recursive: true });
  const base = testExecutionTree({ rootTeamRunId: "runtime-org", coordinatorAddress: "/direct", children: [testAgentNode("/direct", { agentRunId: "director" })] });
  const runtimeTree = { ...base, rootTeam: { ...base.rootTeam, members: [...base.rootTeam.members,
    testOrgTeamNode({ address: "/team", teamRunId: "mounted", coordinatorAddress: "/team/lead", members: [testOrgAgentNode("/team/lead", "worker")] })] } };
  await fs.writeFile(path.join(runtimeSource, "team_run_execution_tree.json"), json(runtimeTree));
  await fs.writeFile(path.join(runtimeSource, "task_delegation_records.json"), json({ schemaVersion: 1, rootTeamRunId: "runtime-org", records: [] }));
  await fs.writeFile(path.join(runtimeSource, "team_communication_messages.json"), json({ schemaVersion: 1, rootTeamRunId: "runtime-org", messages: [] }));
  await fs.mkdir(path.join(runtimeSource, "director"), { recursive: true });
  const savedUri = "/rest/team-runs/mounted/members/%2Fteam%2Flead/context-files/ctx_saved__image.png";
  const savedTrace = { id: "retained-trace", trace_type: "user", turn_id: "retained-turn", seq: 1, ts: 1788257556,
    content: "Preserve my attachment", media: { images: [savedUri] } };
  await fs.writeFile(path.join(runtimeSource, "director", "raw_traces_active.jsonl"), JSON.stringify(savedTrace) + "\n");
  const imageBytes = Buffer.from([0, 16, 128, 255]);
  await fs.writeFile(path.join(runtimeSource, "mounted", "worker", "context_files", "ctx_saved__image.png"), imageBytes);
  const nativeDir = path.join(env.memory, "agent_teams", "native-flat"); await fs.mkdir(nativeDir, { recursive: true });
  const nativeTree = json(testExecutionTree({ rootTeamRunId: "native-flat", coordinatorAddress: "/lead", children: [testAgentNode("/lead", { agentRunId: "native-lead" })] }));
  await fs.writeFile(path.join(nativeDir, "team_run_execution_tree.json"), nativeTree);
  await fs.writeFile(path.join(nativeDir, "task_delegation_records.json"), json({ schemaVersion: 1, rootTeamRunId: "native-flat", records: [] }));
  await fs.writeFile(path.join(nativeDir, "team_communication_messages.json"), json({ schemaVersion: 1, rootTeamRunId: "native-flat", messages: [] }));
  const registry = new AppDataMigrationRegistry();
  const ids = registry.listDefinitions().map((definition) => definition.id);
  const tokenId = "20260819_token_usage_run_records_v1";
  expect(ids.filter((id) => id === FAMILY)).toHaveLength(1);
  expect(ids.indexOf(tokenId)).toBeLessThan(ids.indexOf(FAMILY));
  expect(registry.getDefinition(FAMILY)?.prerequisiteMigrationIds).toContain(tokenId);
  for (const prerequisite of registry.getDefinition(tokenId)!.prerequisiteMigrationIds ?? []) {
    expect(ids.indexOf(prerequisite)).toBeLessThan(ids.indexOf(tokenId));
  }
  const runner = new AppDataMigrationRunner(registry, repository, { logsDir: path.join(env.root, "production-logs") });
  const results = await runner.runPending();
  expect(results.map((result) => result.migrationId)).toEqual(registry.listDefinitions().map((definition) => definition.id));
  for (const id of [PREREQUISITE, FAMILY]) { const result = results.find((result) => result.migrationId === id)!; expect(result, result.logPath ? await fs.readFile(result.logPath, "utf8") : result.errorMessage ?? "").toMatchObject({ status: "SUCCEEDED" }); }
  const runtimeTarget = path.join(env.memory, "agent_orgs", "runtime-org");
  expect(JSON.parse(await fs.readFile(path.join(runtimeTarget, "director", "raw_traces_active.jsonl"), "utf8"))).toEqual({ ...savedTrace,
    media: { images: ["/rest/agent-org-runs/runtime-org/agent-runs/worker/context-files/ctx_saved__image.png"] } });
  expect(await fs.readFile(path.join(runtimeTarget, "mounted", "worker", "context_files", "ctx_saved__image.png"))).toEqual(imageBytes);
  expect(await fs.readFile(path.join(nativeDir, "team_run_execution_tree.json"), "utf8")).toBe(nativeTree);
  await expect(fs.access(runtimeSource)).rejects.toMatchObject({ code: "ENOENT" });
  expect(await snapshot(env.teams)).toEqual(authoredBefore);
  expect(await snapshot(env.orgs)).toEqual(orgBefore);
  expect(await fs.readFile(external)).toEqual(externalBytes);
  expect(registry.getDefinition(AUTHORING)).toBeNull();
  const before = await repository.getRecord(FAMILY);
  await runner.runPending(); expect(await repository.getRecord(FAMILY)).toEqual(before);
  expect(await snapshot(env.teams)).toEqual(authoredBefore);
});
