import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELEGATED_RUN_OWN_ATTACHMENT_LINKS_AFTER_TASK_AGENT_OWN_RUN_MIGRATION_ID,
  DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID,
  DelegatedRunOwnAttachmentLinksMigration,
  createDelegatedRunOwnAttachmentLinksMigrations,
} from "../../../src/app-data-migrations/migrations/delegated-run-own-attachment-links/delegated-run-own-attachment-links-app-data-migration.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";
import { buildFinalContextFileLocator } from "../../../src/context-files/domain/context-file-owner-types.js";

/**
 * autobyteus-500 FU-020 (REQ-011, AC-008; design M-1 … M-10): a delegated run's stored host-scoped attachment links
 * become its own links, with a backup of each rewritten file first; everything else is left byte for byte. Fixtures
 * F-1 … F-9 and the preserved nested child (ARCH-REV-001 note 1) are synthesized, never copied from real data.
 */

const FILE = "ctx_c0ffee__screen.png";
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

type World = Readonly<{ appData: string; memory: string }>;
const world = async (): Promise<World> => {
  const appData = await fs.mkdtemp(path.join(os.tmpdir(), "own-attachment-links-"));
  roots.push(appData);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  return { appData, memory: path.join(appData, "memory") };
};
const hostLink = (host: string, child: string, file = FILE) => `/rest/agent-collaborations/${host}/agent-runs/${child}/context-files/${file}`;
const userLine = (images: readonly string[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ trace_type: "user", turn_id: "t1", content: "Look at this.", media: { images }, ...extra });
const textLine = (text: string) => JSON.stringify({ trace_type: "tool_result", turn_id: "t1", tool_result: text, content: text });
const put = async (file: string, text: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); };
/** A run folder with its context file present (the other end of each reference). */
const runFolder = async (folder: string, lines: readonly string[], file: string | null = FILE, traceFile = "raw_traces_active.jsonl") => {
  await put(path.join(folder, traceFile), `${lines.join("\n")}\n`);
  if (file) await put(path.join(folder, "context_files", file), "png bytes");
};
const migration = (w: World, id = DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID) => new DelegatedRunOwnAttachmentLinksMigration(id, w.appData, w.memory);
const backupOf = (w: World, file: string, id = DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID) =>
  path.join(w.appData, "app-data-migration-backups", id, "memory", path.relative(w.memory, file));
const read = (file: string) => fs.readFile(file, "utf8");
const exists = (file: string) => fs.access(file).then(() => true, () => false);

describe("20261117_delegated_run_own_attachment_links", () => {
  it("F-1, F-2, F-3, F-9: converts an agent run's and team members' links (active and segment files, nested sub-team, file_attachments), with a backup first", async () => {
    const w = await world();
    // F-1: an agent run's own folder; the host is an ancestor two hops up (the folder proves the owner).
    const agent = path.join(w.memory, "agents", "helper_run_1");
    const agentTrace = path.join(agent, "raw_traces_active.jsonl");
    const original = `${[userLine([hostLink("pm_run", "helper_run_1")]), textLine("unrelated")].join("\n")}\n`;
    await runFolder(agent, [userLine([hostLink("pm_run", "helper_run_1")]), textLine("unrelated")]);
    // F-2: a member of a delegated team, in its active and a rotated segment file.
    const member = path.join(w.memory, "agent_teams", "squad_run", "writer_run");
    await runFolder(member, [userLine([hostLink("lead_run", "writer_run")])]);
    await put(path.join(member, "raw_traces_000001.jsonl"), `${userLine([hostLink("lead_run", "writer_run")])}\n`);
    // F-3: a nested sub-team member: its containing team run is its parent folder.
    const nested = path.join(w.memory, "agent_teams", "squad_run", "sub_squad_run", "checker_run");
    await runFolder(nested, [userLine([hostLink("lead_run", "checker_run")])]);
    // F-9: a non-media attachment.
    const docs = path.join(w.memory, "agents", "doc_run");
    await runFolder(docs, [userLine([], { file_attachments: [{ uri: hostLink("pm_run", "doc_run", "ctx_d0c__notes.md"), file_type: "markdown", file_name: "notes.md" }] })], "ctx_d0c__notes.md");

    const result = await migration(w).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(JSON.parse((await read(agentTrace)).split("\n")[0]!).media.images).toEqual([`/rest/runs/helper_run_1/context-files/${FILE}`]);
    expect((await read(agentTrace)).split("\n")[1]).toBe(textLine("unrelated"));
    expect(await read(backupOf(w, agentTrace))).toBe(original);
    for (const file of ["raw_traces_active.jsonl", "raw_traces_000001.jsonl"]) {
      expect(JSON.parse((await read(path.join(member, file))).split("\n")[0]!).media.images)
        .toEqual([`/rest/team-runs/squad_run/agent-runs/writer_run/context-files/${FILE}`]);
    }
    expect(JSON.parse((await read(path.join(nested, "raw_traces_active.jsonl"))).split("\n")[0]!).media.images)
      .toEqual([`/rest/team-runs/sub_squad_run/agent-runs/checker_run/context-files/${FILE}`]);
    expect(JSON.parse((await read(path.join(docs, "raw_traces_active.jsonl"))).split("\n")[0]!).file_attachments[0].uri)
      .toBe("/rest/runs/doc_run/context-files/ctx_d0c__notes.md");
    expect(result.summary).toMatchObject({ migratedCount: 5, failedCount: 0 });
  });

  it("each target is the current code's own link for the run, and the current layout places its file where it is (S-2)", async () => {
    const w = await world();
    await runFolder(path.join(w.memory, "agents", "helper_run_1"), [userLine([hostLink("pm_run", "helper_run_1")])]);
    const member = path.join(w.memory, "agent_teams", "squad_run", "writer_run");
    await runFolder(member, [userLine([hostLink("lead_run", "writer_run")])]);
    await migration(w).execute();
    const layout = new ContextFileLayout({ appDataDir: w.appData, memoryDir: w.memory });
    const agentLink = JSON.parse((await read(path.join(w.memory, "agents", "helper_run_1", "raw_traces_active.jsonl"))).split("\n")[0]!).media.images[0];
    const agentOwner = { kind: "agent_final" as const, runId: "helper_run_1" };
    expect(agentLink).toBe(buildFinalContextFileLocator(agentOwner, FILE));
    expect(await exists(layout.getFinalFilePath(agentOwner, FILE))).toBe(true);
    const memberLink = JSON.parse((await read(path.join(member, "raw_traces_active.jsonl"))).split("\n")[0]!).media.images[0];
    const memberOwner = { kind: "team_member_final" as const, teamRunId: "squad_run", agentRunId: "writer_run" };
    expect(memberLink).toBe(buildFinalContextFileLocator(memberOwner, FILE));
    expect(await exists(layout.getFinalFilePath({ ...memberOwner, rootTeamRunId: "squad_run", ancestorTeamRunIds: [], memoryDir: member }, FILE))).toBe(true);
  });

  it("F-4, F-5, F-6, F-7, F-8 and the preserved nested child: what cannot be admitted, text, the mirror and current files stay byte for byte", async () => {
    const w = await world();
    // F-4: the file is missing. F-5: the link's child is another run.
    const missing = path.join(w.memory, "agents", "run_missing_file");
    await runFolder(missing, [userLine([hostLink("pm_run", "run_missing_file")])], null);
    const other = path.join(w.memory, "agents", "run_other");
    await runFolder(other, [userLine([hostLink("pm_run", "someone_else")])]);
    // F-6: text mentions in a tool result and in content.
    const text = path.join(w.memory, "agents", "run_text");
    await runFolder(text, [textLine(`I opened ${hostLink("pm_run", "run_text")} earlier.`)]);
    // F-7: the memory-sync mirror is never scanned.
    const mirror = path.join(w.memory, "imports", "node_b", "agents", "mirrored_run");
    await runFolder(mirror, [userLine([hostLink("pm_run", "mirrored_run")])]);
    // F-8: an already current file.
    const current = path.join(w.memory, "agents", "run_current");
    await runFolder(current, [userLine([`/rest/runs/run_current/context-files/${FILE}`])]);
    // ARCH-REV-001 note 1: a delegated run still preserved under its delegator (20261017 unfinished) is not scanned.
    const preserved = path.join(w.memory, "agents", "pm_run", "collaboration", "agents", "late_child");
    await runFolder(preserved, [userLine([hostLink("pm_run", "late_child")])]);
    const before = new Map(await Promise.all([missing, other, text, mirror, current, preserved]
      .map(async (folder) => [folder, await read(path.join(folder, "raw_traces_active.jsonl"))] as const)));

    const result = await migration(w).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    for (const [folder, bytes] of before) expect(await read(path.join(folder, "raw_traces_active.jsonl"))).toBe(bytes);
    expect(result.summary.migratedCount).toBe(0);
    const warning = result.summary.details.find((detail) => detail.itemId === "PRESERVED_UNCONVERTIBLE")!;
    expect(warning.message).toContain("2 host-scoped link(s) left as they are");
    expect(warning.message).toContain("its file is not in this run's context_files");
    expect(warning.message).toContain("its child 'someone_else' is not this folder's run");
    expect(await exists(path.join(w.appData, "app-data-migration-backups"))).toBe(false);
  });

  it("an unparseable trace file is left unchanged with a warning; the other files convert", async () => {
    const w = await world();
    const broken = path.join(w.memory, "agents", "run_broken");
    await put(path.join(broken, "raw_traces_active.jsonl"), `{not json ${hostLink("pm_run", "run_broken")}\n`);
    await runFolder(path.join(w.memory, "agents", "run_ok"), [userLine([hostLink("pm_run", "run_ok")])]);
    const result = await migration(w).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(await read(path.join(broken, "raw_traces_active.jsonl"))).toBe(`{not json ${hostLink("pm_run", "run_broken")}\n`);
    expect(result.summary.migratedCount).toBe(1);
  });

  it("a retry after an interrupted run converts the rest and keeps the backup of the true original; a second start changes nothing", async () => {
    const w = await world();
    const a = path.join(w.memory, "agents", "run_a", "raw_traces_active.jsonl");
    const b = path.join(w.memory, "agents", "run_b", "raw_traces_active.jsonl");
    await runFolder(path.dirname(a), [userLine([hostLink("pm_run", "run_a")])]);
    await runFolder(path.dirname(b), [userLine([hostLink("pm_run", "run_b")])]);
    const originalB = await read(b);
    // The first attempt backed B up, then stopped before its rename: B is still the original, its backup exists.
    await put(backupOf(w, b), originalB);
    const rename = fs.rename;
    let renames = 0;
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      renames += 1;
      if (renames === 2) throw Object.assign(new Error("disk full"), { code: "ENOSPC" });
      return rename(from, to);
    });
    const failed = await migration(w).execute();
    expect(failed.status).toBe("FAILED");
    expect(failed.summary).toMatchObject({ migratedCount: 1, failedCount: 1 });
    vi.mocked(fs.rename).mockRestore();

    const retried = await migration(w).execute();
    expect(retried.status).toBe("SUCCEEDED");
    expect(retried.summary.migratedCount).toBe(1);
    expect(await read(backupOf(w, b))).toBe(originalB);
    const afterRetry = await Promise.all([read(a), read(b)]);

    const second = await migration(w).execute();
    expect(second).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, failedCount: 0 } });
    expect(await Promise.all([read(a), read(b)])).toEqual(afterRetry);
    const leftovers = (await fs.readdir(path.dirname(b))).filter((name) => name.endsWith(".tmp"));
    expect(leftovers).toEqual([]);
  });
});

describe("the follow-up after 20261017_task_agent_own_run_v1 (M-7, S-3b)", () => {
  it("is registered last, after the migration, required on startup, with no capability held back", () => {
    const ids = new AppDataMigrationRegistry().listDefinitions().map((definition) => definition.id);
    expect(ids.slice(-2)).toEqual([DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID, DELEGATED_RUN_OWN_ATTACHMENT_LINKS_AFTER_TASK_AGENT_OWN_RUN_MIGRATION_ID]);
    expect(new AppDataMigrationRegistry().getDefinition(DELEGATED_RUN_OWN_ATTACHMENT_LINKS_AFTER_TASK_AGENT_OWN_RUN_MIGRATION_ID)).toMatchObject({
      requiredOnStartup: true, prerequisiteMigrationIds: ["20261017_task_agent_own_run_v1", DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID] });
    expect(new AppDataMigrationRegistry().getDefinition(DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID)?.holdsBackCapabilities).toBeUndefined();
  });

  it("task_agent_own_run FAILED on the first start: ours converts own folders; on the next start the moved child's links convert", async () => {
    const w = await world();
    await runFolder(path.join(w.memory, "agents", "own_run"), [userLine([hostLink("pm_run", "own_run")])]);
    const preserved = path.join(w.memory, "agents", "pm_run", "collaboration", "agents", "late_child");
    await runFolder(preserved, [userLine([hostLink("pm_run", "late_child")])]);
    let taskAgentOwnRun: "FAILED" | "SUCCEEDED" = "FAILED";
    const moveLateChild: AppDataMigrationDefinition = {
      id: "20261017_task_agent_own_run_v1", displayName: "stand-in", description: "stand-in", requiredOnStartup: true, executionPolicy: "STARTUP_ONLY",
      execute: async () => {
        if (taskAgentOwnRun === "SUCCEEDED") await fs.rename(preserved, path.join(w.memory, "agents", "late_child"));
        return { status: taskAgentOwnRun, summary: { scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: taskAgentOwnRun === "FAILED" ? 1 : 0, details: [] },
          errorMessage: taskAgentOwnRun === "FAILED" ? "unfinished" : null };
      },
    };
    const records = new InMemoryRecords();
    const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([moveLateChild, ...createDelegatedRunOwnAttachmentLinksMigrations(w.appData, w.memory)]),
      records, { logsDir: path.join(w.appData, "logs") });
    const first = new Map((await runner.runPending()).map((status) => [status.migrationId, status]));
    expect(first.get(DELEGATED_RUN_OWN_ATTACHMENT_LINKS_MIGRATION_ID)?.status).toBe("SUCCEEDED");
    expect(first.get(DELEGATED_RUN_OWN_ATTACHMENT_LINKS_AFTER_TASK_AGENT_OWN_RUN_MIGRATION_ID)?.errorMessage).toContain("APP_DATA_MIGRATION_PREREQUISITE_INCOMPLETE");
    expect(JSON.parse((await read(path.join(preserved, "raw_traces_active.jsonl"))).split("\n")[0]!).media.images).toEqual([hostLink("pm_run", "late_child")]);

    taskAgentOwnRun = "SUCCEEDED";
    const second = new Map((await runner.runPending()).map((status) => [status.migrationId, status]));
    expect(second.get(DELEGATED_RUN_OWN_ATTACHMENT_LINKS_AFTER_TASK_AGENT_OWN_RUN_MIGRATION_ID)?.status).toBe("SUCCEEDED");
    expect(JSON.parse((await read(path.join(w.memory, "agents", "late_child", "raw_traces_active.jsonl"))).split("\n")[0]!).media.images)
      .toEqual([`/rest/runs/late_child/context-files/${FILE}`]);
  });
});

class InMemoryRecords implements AppDataMigrationRecordRepositoryLike {
  private readonly records = new Map<string, AppDataMigrationRecordSnapshot>();
  async getRecord(migrationId: string) { return this.records.get(migrationId) ?? null; }
  async listRecords() { return [...this.records.values()]; }
  async markRunning(input: { migrationId: string; displayName: string; startedAt: Date }) {
    const record: AppDataMigrationRecordSnapshot = { migrationId: input.migrationId, displayName: input.displayName, status: "RUNNING",
      attempts: (this.records.get(input.migrationId)?.attempts ?? 0) + 1, startedAt: input.startedAt, completedAt: null, summary: null, errorMessage: null, logPath: null };
    this.records.set(input.migrationId, record);
    return record;
  }
  async complete(input: { migrationId: string; displayName: string; status: "SUCCEEDED" | "FAILED" | "SUCCEEDED_WITH_WARNINGS"; completedAt: Date;
    summary: string; errorMessage: string | null; logPath: string | null }) {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = { migrationId: input.migrationId, displayName: input.displayName, status: input.status,
      attempts: previous?.attempts ?? 1, startedAt: previous?.startedAt ?? null, completedAt: input.completedAt, summary: input.summary,
      errorMessage: input.errorMessage, logPath: input.logPath };
    this.records.set(input.migrationId, record);
    return record;
  }
  async markFailed(input: { migrationId: string; displayName: string; completedAt: Date; summary: string; errorMessage: string; logPath: string | null }) {
    return this.complete({ ...input, status: "FAILED" });
  }
}
