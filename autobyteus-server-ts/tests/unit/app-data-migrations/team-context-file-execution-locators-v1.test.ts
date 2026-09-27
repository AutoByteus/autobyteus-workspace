import { AgentRunHistoryCatalogService } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { RootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";
import { AgentRunViewProjectionService } from "../../../src/run-history/services/agent-run-view-projection-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import type { AppDataMigrationRecordSnapshot, AppDataMigrationRecordRepositoryLike } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { TeamContextFileExecutionLocatorsV1AppDataMigration, TEAM_CONTEXT_FILE_EXECUTION_LOCATORS_V1_MIGRATION_ID as ID } from "../../../src/app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1-app-data-migration.js";
import { AtomicRunPackageFileCommitWriter } from "../../../src/run-history/store/atomic-run-package-file-commit-writer.js";

const roots: string[] = [];
const filename = "ctx_file__image.png";
const old = (team = "team", selector = "%2Fworker") => `/rest/team-runs/${team}/members/${selector}/context-files/${filename}`;
const current = (agent = "configured", team = "team") => `/rest/team-runs/${team}/agent-runs/${agent}/context-files/${filename}`;
const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : JSON.stringify(value));
};
const message = (uri: string) => ({messageId: "m1", senderAgentRunId: "reader", receiverAgentRunId: "other", content: old(), messageType: "message", referenceFiles: [uri], createdAt: "2026-09-01T00:00:00.000Z"});
const trace = (uri: string) => JSON.stringify({ id: "trace-1", trace_type: "user", content: `prose ${old()}`, media: { images: [uri] }, unknown: { uri: old() } }) + "\r\n";
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "team-locator-transition-")); roots.push(root);
  const memory = path.join(root, "memory");
  const team = path.join(memory, "agent_teams", "team");
  const configured = path.join(team, "configured"), task = path.join(team, "task");
  const tree = testExecutionTree({ rootTeamRunId: "team", children: [testAgentNode("/worker", { agentRunId: "configured" })], coordinatorAddress: "/worker" });
  await put(path.join(team, "team_run_execution_tree.json"), { ...tree, rootTeam: { ...tree.rootTeam, members: [...tree.rootTeam.members, testOrgAgentNode("/nested", "configured-nested")], taskExecutions: [
    { address: "/worker", agentRunId: "task", platformAgentRunId: null, startedAt: "2026-09-01T00:00:00.000Z", settledAt: "2026-09-02T00:00:00.000Z" },
    { address: "/nested", teamRunId: "nested", members: [{ address: "/nested/worker", agentRunId: "nested-agent", platformAgentRunId: null }], taskExecutions: [], startedAt: "2026-09-01T00:00:00.000Z", settledAt: null },
  ] } });
  await put(path.join(team, "task_delegation_records.json"), {schemaVersion: 1, rootTeamRunId: "team", records: [
    {taskId: "t1", delegatorAgentRunId: "configured", recipientAddress: "/worker", taskExecution: {agentRunId: "task"}, description: "task", referenceFiles: [], status: "interrupted", createdAt: "2026-09-01T00:00:00.000Z", updates: [{interruptionId: "i1", reason: "stopped", createdAt: "2026-09-02T00:00:00.000Z"}]},
    {taskId: "t2", delegatorAgentRunId: "configured", recipientAddress: "/nested", taskExecution: {teamRunId: "nested"}, description: "task", referenceFiles: [], status: "active", createdAt: "2026-09-01T00:00:00.000Z", updates: []},
  ]});
  await put(path.join(team, "team_communication_messages.json"), {schemaVersion: 1, rootTeamRunId: "team", messages: []});
  await put(path.join(configured, "context_files", filename), "configured bytes");
  await put(path.join(task, "context_files", filename), "task bytes");
  const source = path.join(configured, "raw_traces_active.jsonl");
  const backup = path.join(root, "app-data-migration-backups", ID);
  const migrate = (writer = new AtomicRunPackageFileCommitWriter()) => new TeamContextFileExecutionLocatorsV1AppDataMigration(memory, root, () => "https://node.example:8000", writer).execute();
  return { root, memory, team, configured, task, source, backup, migrate };
};
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

describe("Team context-file exact-execution startup transition", () => {
  it("uses trace provenance for duplicate addresses and preserves blobs, non-locator values, origins and suffixes", async () => {
    const f = await setup();
    const input = trace(`https://NODE.example:8000${old()}?download=1#preview`);
    await put(f.source, input);
    const taskSource = path.join(f.task, "raw_traces_active.jsonl");
    await put(taskSource, trace(old("team", "worker")));
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    const parsed = JSON.parse(await fs.readFile(f.source, "utf8"));
    expect(parsed).toEqual({ ...JSON.parse(input), media: { images: [`https://NODE.example:8000${current()}?download=1#preview`] } });
    expect(JSON.parse(await fs.readFile(taskSource, "utf8")).media.images).toEqual([current("task")]);
    expect(await fs.readFile(path.join(f.configured, "context_files", filename), "utf8")).toBe("configured bytes");
    expect(await fs.readFile(path.join(f.task, "context_files", filename), "utf8")).toBe("task bytes");
    const manifest = JSON.parse(await fs.readFile(path.join(f.backup, "manifest.json"), "utf8"));
    expect(manifest.complete).toBe(true);
    expect(manifest.files[0].mappings[0].proof).toBe("source-trace");
    const originals = await Promise.all((await fs.readdir(f.backup)).filter((name) => name.endsWith(".original")).map((name) => fs.readFile(path.join(f.backup, name), "utf8")));
    expect(originals).toContain(input);
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED" });
  });

  it("enumerates nested, standalone and Org traces, complete archives, task updates and communication references", async () => {
    const f = await setup();
    await fs.rm(path.join(f.task, "context_files", filename)); // unique referenced owner, regardless of source author
    const nested = path.join(f.team, "nested", "nested-agent");
    await put(path.join(nested, "context_files", filename), "nested bytes");
    await put(path.join(nested, "raw_traces_active.jsonl"), trace(old("nested", "worker")));
    await put(path.join(f.memory, "agents", "solo", "run_metadata.json"), {runId: "solo", agentDefinitionId: "def", workspaceRootPath: "/workspace", memoryDir: f.memory, llmModelIdentifier: "model", runtimeKind: "autobyteus"});
    await put(path.join(f.memory, "agents", "solo", "raw_traces_active.jsonl"), trace(old()));
    const org = path.join(f.memory, "agent_orgs", "org");
    await put(path.join(org, "agent_org_run_execution_tree.json"), testAgentOrgExecutionTree({ orgRunId: "org", members: [testOrgAgentNode("/reader", "reader"), testOrgAgentNode("/other", "other")] }));
    await put(path.join(org, "agent_org_task_delegation_records.json"), {schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org", records: []});
    await put(path.join(org, "reader", "raw_traces_active.jsonl"), trace(old()));
    await put(path.join(f.configured, "raw_traces_manifest.json"), { schema_version: 1, next_segment_index: 2, segments: [{ index: 1, file_name: "raw_traces_archive/old.jsonl", status: "complete" }] });
    const archive = path.join(f.configured, "raw_traces_archive", "old.jsonl");
    await put(archive, trace(old()));
    const tasks = path.join(f.team, "task_delegation_records.json");
    const taskData = JSON.parse(await fs.readFile(tasks, "utf8"));
    taskData.records[1].referenceFiles = [old()];
    taskData.records[1].updates = [{submissionId: "s1", message: old(), referenceFiles: [old()], createdAt: "2026-09-02T00:00:00.000Z"}];
    taskData.records[1].status = "awaiting_review";
    await put(tasks, taskData);
    const messages = path.join(org, "agent_org_communication_messages.json");
    await put(messages, {schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org", messages: [message(old())]});
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 3 } });
    expect(JSON.parse(await fs.readFile(archive, "utf8")).media.images).toEqual([current()]);
    expect(JSON.parse(await fs.readFile(path.join(nested, "raw_traces_active.jsonl"), "utf8")).media.images).toEqual([current("nested-agent", "nested")]);
    expect(JSON.parse(await fs.readFile(tasks, "utf8")).records[1]).toMatchObject({ referenceFiles: [current()], updates: [{ referenceFiles: [current()], message: old() }] });
    expect(JSON.parse(await fs.readFile(messages, "utf8")).messages[0]).toMatchObject({ referenceFiles: [current()], content: old() });
  });

  it.each(["ambiguous", "missing", "unsafe"])("preflights every reference without record writes on %s proof", async (failure) => {
    const f = await setup(); await put(f.source, trace(old()));
    const uri = failure === "missing" ? old("missing") : failure === "unsafe" ? old().replace(filename, "%2E%2E%2Fsecret") : old();
    await put(path.join(f.team, "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "team", messages: [{...message(uri), senderAgentRunId: "configured", receiverAgentRunId: "task"}] });
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: {details: [expect.objectContaining({itemId: "REFERENCE_UNAVAILABLE"})]} });
    expect(await fs.readFile(f.source, "utf8")).toBe(trace(old()));
    await expect(fs.stat(f.backup)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("leaves external-host locators, prose, provider histories and unchanged lines byte-for-byte", async () => {
    const f = await setup();
    const unchanged = trace(`https://foreign.example${old()}`);
    await put(f.source, unchanged);
    await put(path.join(f.configured, "provider_history.json"), `  { "url": "${old()}" }\n`);
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0 } });
    expect(await fs.readFile(f.source, "utf8")).toBe(unchanged);
    expect(await fs.readFile(path.join(f.configured, "provider_history.json"), "utf8")).toBe(`  { "url": "${old()}" }\n`);
  });

  it.each(["before-rename", "after-rename", "progress-save", "completion-save"])("resumes %s interruption with original backups intact", async (stage) => {
    const f = await setup(); const original = trace(old()); await put(f.source, original);
    const writer = new AtomicRunPackageFileCommitWriter();
    const write = writer.writeSerializedText.bind(writer);
    let tripped = false;
    vi.spyOn(writer, "writeSerializedText").mockImplementation(async (input) => {
      const manifest = input.filePath.endsWith("manifest.json") ? JSON.parse(input.text) : null;
      const shouldFail = !tripped && (stage === "before-rename" || stage === "after-rename" ? input.filePath === f.source
        : stage === "progress-save" ? manifest?.files[0]?.committed && !manifest.complete : manifest?.complete);
      if (!shouldFail) return write(input);
      tripped = true;
      if (stage === "after-rename") { await write(input); return { outcome: "renamed_finalization_indeterminate", stage: "sync_directory", file: input.file, cause: new Error("injected") }; }
      return { outcome: "not_renamed", stage: "rename", file: input.file, cause: new Error("injected") };
    });
    expect(await f.migrate(writer)).toMatchObject({ status: "FAILED" });
    expect(tripped).toBe(true);
    const names = (await fs.readdir(f.backup)).filter((name) => name.endsWith(".original"));
    expect(await fs.readFile(path.join(f.backup, names[0]!), "utf8")).toBe(original);
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED" });
    expect(JSON.parse(await fs.readFile(f.source, "utf8")).media.images).toEqual([current()]);
    expect(await fs.readFile(path.join(f.backup, names[0]!), "utf8")).toBe(original);
  });

  it("preserves newer current writes and completed released evidence on retry", async () => {
    const f = await setup(); await put(f.source, trace(old()));
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED" });
    const manifestBefore = await fs.readFile(path.join(f.backup, "manifest.json"), "utf8");
    const manifestStat = await fs.stat(path.join(f.backup, "manifest.json"));
    await fs.appendFile(f.source, trace("/workspace/new.txt"));
    const changed = await fs.readFile(f.source, "utf8");
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED" });
    expect(await fs.readFile(f.source, "utf8")).toBe(changed);
    expect(await fs.readFile(path.join(f.backup, "manifest.json"), "utf8")).toBe(manifestBefore);
    expect((await fs.stat(path.join(f.backup, "manifest.json"))).mtimeMs).toBe(manifestStat.mtimeMs);
  });
  it("retries a ledger completion interruption without overwriting backups, then skips the successful startup conversion", async () => {
    const f = await setup(); await put(f.source, trace(old()));
    const migration = new TeamContextFileExecutionLocatorsV1AppDataMigration(f.memory, f.root, () => "http://localhost:8000");
    const records = new Map<string, AppDataMigrationRecordSnapshot>();
    const save = (input: any): AppDataMigrationRecordSnapshot => {
      const value = { attempts: 1, startedAt: null, completedAt: null, summary: null, errorMessage: null, logPath: null, ...input };
      records.set(input.migrationId, value); return value;
    };
    let interrupt = true;
    const repository: AppDataMigrationRecordRepositoryLike = {
      getRecord: async id => records.get(id) ?? null, listRecords: async () => [...records.values()],
      markRunning: async input => save({ ...input, status: "RUNNING" }),
      complete: async input => {
        if (input.migrationId === ID && interrupt) { interrupt = false; throw new Error("ledger unavailable"); }
        return save(input);
      },
      markFailed: async input => save({ ...input, status: "FAILED" }),
    };
    const prerequisites = migration.prerequisiteMigrationIds.map(id => ({ id, displayName: id, description: "test prerequisite", requiredOnStartup: true,
      execute: async () => ({ status: "SUCCEEDED" as const, summary: { scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] } }) }));
    const execute = vi.spyOn(migration, "execute");
    const runner = () => new AppDataMigrationRunner(new AppDataMigrationRegistry([...prerequisites, migration]), repository, { logsDir: path.join(f.root, "logs") });
    expect((await runner().runPending()).at(-1)).toMatchObject({ status: "FAILED", errorMessage: "ledger unavailable" });
    const originals = (await fs.readdir(f.backup)).filter(name => name.endsWith(".original"));
    expect((await runner().runPending()).at(-1)).toMatchObject({ status: "SUCCEEDED" });
    expect((await runner().runPending()).at(-1)).toMatchObject({ status: "SUCCEEDED" });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(await fs.readFile(path.join(f.backup, originals[0]!), "utf8")).toBe(trace(old()));
    await expect(runner().runMigration(ID)).rejects.toThrow("only during startup");
  });

});

const addTeam = async (memory: string, id: string, uri?: string) => {
  const dir = path.join(memory, "agent_teams", id);
  await put(path.join(dir, "team_run_execution_tree.json"), testExecutionTree({rootTeamRunId: id,
    children: [testAgentNode("/worker", {agentRunId: `${id}-agent`})], coordinatorAddress: "/worker"}));
  await put(path.join(dir, "task_delegation_records.json"), {schemaVersion: 1, rootTeamRunId: id, records: []});
  await put(path.join(dir, "team_communication_messages.json"), {schemaVersion: 1, rootTeamRunId: id, messages: []});
  await put(path.join(dir, `${id}-agent`, "context_files", filename), `${id} bytes`);
  const source = path.join(dir, `${id}-agent`, "raw_traces_active.jsonl");
  if (uri) await put(source, trace(uri));
  return {dir, source};
};
const addStandalone = async (memory: string, id: string, uri?: string) => {
  const dir = path.join(memory, "agents", id);
  await put(path.join(dir, "run_metadata.json"), {runId: id, agentDefinitionId: "def", workspaceRootPath: "/workspace",
    memoryDir: memory, llmModelIdentifier: "model", runtimeKind: "autobyteus", startedAt: "2026-09-01T00:00:00.000Z"});
  await put(path.join(dir, "context_files", filename), `${id} bytes`);
  if (uri) await put(path.join(dir, "raw_traces_active.jsonl"), trace(uri));
  return dir;
};
const readiness = (memory: string) => new RootRunPackageReadinessIndex(memory, undefined, () => "https://node.example:8000");

describe("scoped recovery and independent current admission", () => {
  it("preserves empty/nonempty missing-tree roots with warnings while converting an independent current package", async () => {
    const f = await setup(); await put(f.source, trace(old()));
    const residue = path.join(f.memory, "agent_teams", "incomplete", "private", "raw_traces_active.jsonl");
    await put(residue, "unchanged incomplete bytes — not a current trace");
    await fs.mkdir(path.join(f.memory, "agent_teams", "empty"), {recursive: true});
    const before = await fs.stat(residue);
    const result = await f.migrate();
    expect(result).toMatchObject({status: "SUCCEEDED_WITH_WARNINGS", summary: {failedCount: 0, migratedCount: 1}});
    expect(result.summary.details.find(d => d.itemId === "PRESERVED_MISSING_TREE")?.message).toContain("2 group(s)");
    expect(await fs.readFile(residue, "utf8")).toBe("unchanged incomplete bytes — not a current trace");
    expect((await fs.stat(residue)).mtimeMs).toBe(before.mtimeMs);
    const index = readiness(f.memory); await index.rebuild();
    expect(index.listAdmitted("agent_team")).toEqual(["team"]);
    expect(await f.migrate()).toMatchObject({status: "SUCCEEDED_WITH_WARNINGS"});
    await index.rebuild(); expect(index.listAdmitted("agent_team")).toEqual(["team"]);
  });

  it.each(["old", "current"])("excludes %s cross-root references, transitive dependants and standalone referrers before writes", async (shape) => {
    const f = await setup(); await put(f.source, trace(old()));
    const unavailable = shape === "old" ? old("missing") : current("absent", "missing");
    await fs.mkdir(path.join(f.memory, "agent_teams", "missing"), {recursive: true});
    const b = await addTeam(f.memory, "B", unavailable);
    const a = await addTeam(f.memory, "A", old("B"));
    await addStandalone(f.memory, "solo", current("B-agent", "B"));
    const before = await fs.readFile(a.source, "utf8");
    expect(await f.migrate()).toMatchObject({status: "SUCCEEDED_WITH_WARNINGS", summary: {failedCount: 0, migratedCount: 1}});
    expect(await fs.readFile(a.source, "utf8")).toBe(before);
    expect(await fs.readFile(b.source, "utf8")).toBe(trace(unavailable));
    const index = readiness(f.memory); await index.rebuild();
    expect(index.listAdmitted("agent_team")).toEqual(["team"]);
    expect(index.listAdmitted("agent")).toEqual([]);
    await expect(index.admitCurrent("agent_team", "A")).rejects.toThrow("could not be admitted");
    expect(index.isAdmitted("agent_team", "A")).toBe(false);
    const locations = createStoredTeamRunExecutionTreeLocationService(f.memory);
    expect(await locations.findAgent({rootTeamRunId: "B", agentRunId: "B-agent"})).toBeNull();
    expect(locations.findAgentSync({rootTeamRunId: "B", agentRunId: "B-agent"})).toBeNull();
    expect(await locations.readTree("B")).toBeNull();
    const resolver = new ContextFileOwnerResolver({memoryDir: f.memory, locations});
    await expect(resolver.resolveFinalOwner({kind: "agent_final", runId: "solo"})).rejects.toThrow("unavailable");
    expect(() => resolver.resolveFinalOwnerSync({kind: "agent_final", runId: "solo"})).toThrow("unavailable");
    await expect(new AgentRunViewProjectionService(f.memory).getProjection("solo")).rejects.toThrow("unavailable");
    const lifecycle = new StandaloneAgentRunLifecycleService(f.memory, {
      agentRunManager: {getActiveRun: () => null} as never, workspaceManager: {} as never,
      modelSelectionValidator: {validate: async () => { throw new Error("must not launch"); }} as never,
    });
    await expect(lifecycle.restorePersistedRun("solo")).rejects.toThrow("unavailable");
  });

  it("admits a valid cycle, a fresh standalone run and exact current references without trusting ledger labels", async () => {
    const f = await setup();
    await addTeam(f.memory, "A", old("B")); await addTeam(f.memory, "B", old("A"));
    await addStandalone(f.memory, "fresh");
    expect(await f.migrate()).toMatchObject({status: "SUCCEEDED"});
    const index = readiness(f.memory); await index.rebuild();
    expect(index.listAdmitted("agent_team")).toEqual(["A", "B", "team"]);
    expect(index.listAdmitted("agent")).toEqual(["fresh"]);
    // A terminal conversion result is not admission authority on a later startup.
    await put(path.join(f.memory, "agent_teams", "B", "B-agent", "raw_traces_active.jsonl"), trace(current("absent", "missing")));
    await index.rebuild();
    expect(index.listAdmitted("agent_team")).toEqual(["team"]);
    expect(index.listDiagnostics().find(d => d.rootRunId === "A")?.code).toBe("DEPENDENCY_UNAVAILABLE");
    const resolver = new ContextFileOwnerResolver({memoryDir: f.memory, locations: createStoredTeamRunExecutionTreeLocationService(f.memory)});
    expect(await resolver.resolveFinalOwner({kind: "agent_final", runId: "fresh"})).toEqual({kind: "agent_final", runId: "fresh"});
    expect(resolver.resolveFinalOwnerSync({kind: "agent_final", runId: "fresh"})).toEqual({kind: "agent_final", runId: "fresh"});
  });

  it("reports an actual group commit failure as FAILED while independent valid conversion proceeds", async () => {
    const f = await setup(); await put(f.source, trace(old()));
    const a = await addTeam(f.memory, "A", old("A"));
    const writer = new AtomicRunPackageFileCommitWriter(); const write = writer.writeSerializedText.bind(writer);
    vi.spyOn(writer, "writeSerializedText").mockImplementation(async input => input.filePath === a.source
      ? {outcome: "not_renamed", stage: "rename", file: input.file, cause: new Error("test attempt failure")}
      : write(input));
    expect(await f.migrate(writer)).toMatchObject({status: "FAILED", summary: {migratedCount: 1, failedCount: 1}});
    const index = readiness(f.memory); await index.rebuild();
    expect(index.listAdmitted("agent_team")).toEqual(["team"]);
    expect(await fs.readFile(a.source, "utf8")).toBe(trace(old("A")));
    expect(await f.migrate()).toMatchObject({status: "SUCCEEDED"});
    await index.rebuild(); expect(index.listAdmitted("agent_team")).toEqual(["A", "team"]);
  });

  it("preserves released unfinished entries and originals when their group is now excluded", async () => {
    const f = await setup(); await put(f.source, trace(old()));
    const writer = new AtomicRunPackageFileCommitWriter(); const write = writer.writeSerializedText.bind(writer);
    vi.spyOn(writer, "writeSerializedText").mockImplementation(async input => input.filePath === f.source
      ? {outcome: "not_renamed", stage: "rename", file: input.file, cause: new Error("interrupted")}
      : write(input));
    expect(await f.migrate(writer)).toMatchObject({status: "FAILED"});
    const manifest = await fs.readFile(path.join(f.backup, "manifest.json"), "utf8");
    const originals = await Promise.all((await fs.readdir(f.backup)).filter(n => n.endsWith(".original")).map(n => fs.readFile(path.join(f.backup,n), "utf8")));
    await fs.rename(path.join(f.team, "team_run_execution_tree.json"), path.join(f.team, "preserved-incomplete-tree.txt"));
    await addTeam(f.memory, "independent");
    expect(await f.migrate()).toMatchObject({status: "SUCCEEDED_WITH_WARNINGS"});
    const afterManifest = JSON.parse(await fs.readFile(path.join(f.backup, "manifest.json"), "utf8"));
    expect(afterManifest.files).toEqual(JSON.parse(manifest).files);
    expect(afterManifest.complete).toBe(true); // truthful preserved-excluded disposition, not converted admission
    expect(await fs.readFile(f.source, "utf8")).toBe(trace(old()));
    expect(await Promise.all((await fs.readdir(f.backup)).filter(n => n.endsWith(".original")).map(n => fs.readFile(path.join(f.backup,n), "utf8")))).toEqual(originals);
  });
});

it("completes warnings with ALL historical runs excluded and still publishes new standalone work", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "all-excluded-")); roots.push(root);
  const memory = path.join(root, "memory");
  await put(path.join(memory, "agent_teams", "incomplete", "history.txt"), "retained history");
  await put(path.join(memory, "agents", "no-metadata", "raw_traces_active.jsonl"), trace(old()));
  const migration = new TeamContextFileExecutionLocatorsV1AppDataMigration(memory, root, () => "http://localhost:8000");
  expect(await migration.execute()).toMatchObject({status: "SUCCEEDED_WITH_WARNINGS", summary: {failedCount: 0, migratedCount: 0}});
  const index = readiness(memory); await index.rebuild();
  expect(index.listAdmitted("agent_team")).toEqual([]); expect(index.listAdmitted("agent")).toEqual([]);
  // New-work persistence/publication uses the production catalog, not a history-admission override.
  const template = await addStandalone(memory, "metadata-template");
  const metadata = (await new AgentRunMetadataStore(memory).readMetadata("metadata-template"))!;
  await fs.rm(template, {recursive: true});
  const catalog = new AgentRunHistoryCatalogService(memory, {
    agentDefinitionService: {getAgentDefinitionById: async () => ({name: "New work"})} as never,
    agentRunManager: {hasActiveRun: () => false},
  });
  await catalog.recordPreparedRun({runId: "fresh", metadata: {...metadata, runId: "fresh", preparedAt: "2026-09-01T00:00:00.000Z", startedAt: null}});
  expect(index.listAdmitted("agent")).toEqual(["fresh"]);
  expect(await catalog.listCatalogRows()).toMatchObject([{runId: "fresh"}]);
  expect(await fs.readFile(path.join(memory, "agent_teams", "incomplete", "history.txt"), "utf8")).toBe("retained history");
  expect(await fs.readFile(path.join(memory, "agents", "no-metadata", "raw_traces_active.jsonl"), "utf8")).toBe(trace(old()));
});

it("preserves an invalid sidecar and bounds missing-package diagnostics without a majority threshold", async () => {
  const f = await setup(); await put(f.source, trace(old()));
  await put(path.join(f.team, "team_communication_messages.json"), "invalid-json");
  for (let i = 0; i < 12; i++) await fs.mkdir(path.join(f.memory, "agent_teams", `missing-${i}`), {recursive: true});
  const result = await f.migrate();
  expect(result).toMatchObject({status: "SUCCEEDED_WITH_WARNINGS", summary: {migratedCount: 0, failedCount: 0}});
  const missing = result.summary.details.find(d => d.itemId === "PRESERVED_MISSING_TREE")!;
  expect(missing.message).toContain("12 group(s)");
  expect(missing.message.match(/agent_team:missing-/g)).toHaveLength(5);
  expect(await fs.readFile(f.source, "utf8")).toBe(trace(old()));
  expect(await fs.readFile(path.join(f.team, "team_communication_messages.json"), "utf8")).toBe("invalid-json");
});
