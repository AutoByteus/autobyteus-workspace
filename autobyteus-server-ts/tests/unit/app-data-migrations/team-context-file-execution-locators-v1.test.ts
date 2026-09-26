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
const trace = (uri: string) => JSON.stringify({ id: "trace-1", trace_type: "user", content: `prose ${old()}`, media: { images: [uri] }, unknown: { uri: old() } }) + "\r\n";
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "team-locator-transition-")); roots.push(root);
  const memory = path.join(root, "memory");
  const team = path.join(memory, "agent_teams", "team");
  const configured = path.join(team, "configured"), task = path.join(team, "task");
  const tree = testExecutionTree({ rootTeamRunId: "team", children: [testAgentNode("/worker", { agentRunId: "configured" })], coordinatorAddress: "/worker" });
  await put(path.join(team, "team_run_execution_tree.json"), { ...tree, rootTeam: { ...tree.rootTeam, taskExecutions: [
    { address: "/worker", agentRunId: "task", platformAgentRunId: null, startedAt: "2026-09-01T00:00:00.000Z", settledAt: "2026-09-02T00:00:00.000Z" },
    { address: "/nested", teamRunId: "nested", members: [{ address: "/nested/worker", agentRunId: "nested-agent", platformAgentRunId: null }], taskExecutions: [], startedAt: "2026-09-01T00:00:00.000Z", settledAt: null },
  ] } });
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
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 2 } });
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
    await put(path.join(f.memory, "agents", "solo", "raw_traces_active.jsonl"), trace(old()));
    const org = path.join(f.memory, "agent_orgs", "org");
    await put(path.join(org, "agent_org_run_execution_tree.json"), testAgentOrgExecutionTree({ orgRunId: "org", members: [testOrgAgentNode("/reader", "reader")] }));
    await put(path.join(org, "reader", "raw_traces_active.jsonl"), trace(old()));
    await put(path.join(f.configured, "raw_traces_manifest.json"), { schema_version: 1, next_segment_index: 2, segments: [{ index: 1, file_name: "raw_traces_archive/old.jsonl", status: "complete" }] });
    const archive = path.join(f.configured, "raw_traces_archive", "old.jsonl");
    await put(archive, trace(old()));
    const tasks = path.join(f.team, "task_delegation_records.json");
    await put(tasks, { records: [{ referenceFiles: [old()], updates: [{ referenceFiles: [old()] }], prose: old() }] });
    const messages = path.join(org, "agent_org_communication_messages.json");
    await put(messages, { messages: [{ referenceFiles: [old()], content: old() }] });
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 6 } });
    expect(JSON.parse(await fs.readFile(archive, "utf8")).media.images).toEqual([current()]);
    expect(JSON.parse(await fs.readFile(path.join(nested, "raw_traces_active.jsonl"), "utf8")).media.images).toEqual([current("nested-agent", "nested")]);
    expect(JSON.parse(await fs.readFile(tasks, "utf8")).records[0]).toEqual({ referenceFiles: [current()], updates: [{ referenceFiles: [current()] }], prose: old() });
    expect(JSON.parse(await fs.readFile(messages, "utf8")).messages[0]).toEqual({ referenceFiles: [current()], content: old() });
  });

  it.each(["ambiguous", "missing", "unsafe"])("preflights every reference without record writes on %s proof", async (failure) => {
    const f = await setup(); await put(f.source, trace(old()));
    const uri = failure === "missing" ? old("missing") : failure === "unsafe" ? old().replace(filename, "%2E%2E%2Fsecret") : old();
    await put(path.join(f.team, "team_communication_messages.json"), { messages: [{ referenceFiles: [uri] }] });
    expect(await f.migrate()).toMatchObject({ status: "FAILED", errorMessage: expect.stringContaining(failure === "unsafe" ? "storedFilename is invalid" : "Expected one proven attachment owner") });
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

  it("rejects unrelated source changes on retry, rather than replacing newer history", async () => {
    const f = await setup(); await put(f.source, trace(old()));
    expect(await f.migrate()).toMatchObject({ status: "SUCCEEDED" });
    await fs.appendFile(f.source, trace("/workspace/new.txt"));
    const changed = await fs.readFile(f.source, "utf8");
    expect(await f.migrate()).toMatchObject({ status: "FAILED", errorMessage: expect.stringContaining("Source changed after preflight") });
    expect(await fs.readFile(f.source, "utf8")).toBe(changed);
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
