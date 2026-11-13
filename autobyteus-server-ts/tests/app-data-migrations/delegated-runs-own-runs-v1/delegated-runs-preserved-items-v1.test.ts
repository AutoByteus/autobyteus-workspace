import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID,
  DelegatedRunsOwnRunsV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.js";
import {
  createDelegatedRunsPreservedItemsMigrations,
  DELEGATED_RUNS_PRESERVED_ITEMS_PLANS,
} from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/delegated-runs-preserved-items-v1.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { I, M, exists, paths, put, readJson, releasedTeamOwnFile, writeReleasedWorld, type World } from "../../fixtures/app-data-migrations/released-delegation-shape-fixtures.js";

/**
 * autobyteus-461 SR-078 (DS-10, "After the predecessor finishes the item"): one follow-up per predecessor converts the
 * items that predecessor finishes after `20261111_delegated_runs_own_runs_v1` preserved them, with that migration's own
 * builders; a predecessor stuck FAILED holds back only its own follow-up. Hand-built data only (TESTING.md).
 */
const AFTER_17 = "20261114_preserved_items_after_task_agent_own_run_v1";
const AFTER_19 = "20261114_preserved_items_after_own_file_complete_v1";
const AFTER_18 = "20261114_preserved_items_after_append_only_logs_v1";
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const world = async (): Promise<World> => {
  const appData = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-runs-preserved-"));
  roots.push(appData);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  return { appData, memory: path.join(appData, "memory") };
};
const names = { agentDefinitionName: vi.fn(async () => null), teamDefinitionName: vi.fn(async () => null) };
const main = (w: World) => new DelegatedRunsOwnRunsV1AppDataMigration(w.appData, w.memory, names);
const followUp = (w: World, id: string) => createDelegatedRunsPreservedItemsMigrations(w.appData, w.memory, names).find((migration) => migration.id === id)!;
const snapshot = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file); else out[path.relative(root, file)] = await fs.readFile(file, "utf8");
    }
  };
  await walk(root);
  return out;
};
/** `20261017_…` finishing a copy after our migration: it writes the copy's own file in its released shape (`taskAgent`). */
const finishedBy17 = (w: World) => put(paths(w).teamFile("late_team"), releasedTeamOwnFile("late_team", "/late_team",
  [{ address: "/late_team/lead", agentDefinitionId: "lead", role: null, description: null, agentRunId: "late_lead", platformAgentRunId: null,
    launchConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: "sonnet", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" }, followsTeam: true }],
  { coordinatingRun: { kind: "agent", runId: M }, delegatorAgentRunId: M, address: "/late_team" }));
const teamRows = async (w: World) => (await readJson(paths(w).teamIndex()) as Array<{ teamRunId: string }>).map((row) => row.teamRunId);
const agentRows = async (w: World) => (await readJson(paths(w).agentIndex()) as Array<{ runId: string }>).map((row) => row.runId);

describe("the follow-ups of 20261111_delegated_runs_own_runs_v1 (SR-078)", () => {
  it("one per predecessor, registered after our migration: requiredOnStartup, no hold, prerequisites our migration and its own predecessor only", () => {
    const registry = new AppDataMigrationRegistry();
    const ids = registry.listDefinitions().map((definition) => definition.id);
    const expected: Record<string, string> = { [AFTER_17]: "20261017_task_agent_own_run_v1", [AFTER_19]: "20261019_delegated_copy_own_file_complete_v1",
      [AFTER_18]: "20261018_append_only_message_logs_v1" };
    expect(DELEGATED_RUNS_PRESERVED_ITEMS_PLANS.map((plan) => plan.id)).toEqual([AFTER_17, AFTER_19, AFTER_18]);
    for (const [id, predecessor] of Object.entries(expected)) {
      const definition = registry.getDefinition(id)!;
      expect(ids.indexOf(id)).toBeGreaterThan(ids.indexOf(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID));
      expect(definition).toMatchObject({ requiredOnStartup: true, prerequisiteMigrationIds: [DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID, predecessor] });
      expect(definition.holdsBackCapabilities ?? []).toEqual([]);
    }
  });

  it("after 20261017 finishes a copy: its own file gets delegatedFrom and its address, and it gets its history row; a later start changes nothing", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    await main(w).execute();
    await finishedBy17(w);
    const result = await followUp(w, AFTER_17).execute();
    expect(result.status).toBe("SUCCEEDED");
    const own = await readJson(paths(w).teamFile("late_team"));
    expect(own).not.toHaveProperty("taskAgent");
    expect(own.delegatedFrom).toMatchObject({ delegatingRun: { kind: "agent", runId: M }, delegatorAgentRunId: M });
    expect(await teamRows(w)).toContain("late_team");
    const after = await snapshot(w.appData);
    await expect(followUp(w, AFTER_17).execute()).resolves.toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0 } });
    expect(await snapshot(w.appData)).toEqual(after);
  });

  it("after 20261019 completes an own file our migration preserved: it is converted and listed", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    const image = await readJson(paths(w).agentFile(I));
    await put(paths(w).agentFile(I), { ...image, taskAgent: { ...image.taskAgent, origin: { kind: "catalog" } } });
    await expect(main(w).execute()).resolves.toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS" });
    expect(await readJson(paths(w).agentFile(I))).toHaveProperty("taskAgent");
    // 20261019 completes it: still with `taskAgent`, without `origin`.
    await put(paths(w).agentFile(I), image);
    await expect(followUp(w, AFTER_19).execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    const converted = await readJson(paths(w).agentFile(I));
    expect(converted).not.toHaveProperty("taskAgent");
    expect(converted).toHaveProperty("delegatedFrom");
    expect(await agentRows(w)).toContain(I);
  });

  it("after 20261018 converts a JSON log our migration preserved: the append-only log moves up to the run's own folder", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    const json = path.join(path.dirname(paths(w).standaloneLog(M)), "communication_messages.json");
    await put(json, { messages: [] });
    await main(w).execute();
    expect(await exists(paths(w).runLog(M))).toBe(false);
    // 20261018 converts it (its JSON file goes; the append-only log is there).
    await fs.rm(json);
    await expect(followUp(w, AFTER_18).execute()).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(await exists(paths(w).runLog(M))).toBe(true);
    expect(await exists(path.dirname(paths(w).standaloneLog(M)))).toBe(false);
  });

  it("through the runner: with 20261018 FAILED for an unrelated log, a copy whose 20261017 item finished is still converted and listed; 20261018's follow-up waits", async () => {
    const w = await world();
    await writeReleasedWorld(w);
    const state = { "17": "FAILED", "18": "FAILED", "19": "SUCCEEDED" } as Record<string, "FAILED" | "SUCCEEDED">;
    const predecessor = (id: string, key: string, onSuccess: () => Promise<void> = async () => undefined): AppDataMigrationDefinition => ({
      id, displayName: id, description: id, requiredOnStartup: true, executionPolicy: "STARTUP_ONLY",
      execute: async () => {
        if (state[key] === "SUCCEEDED") await onSuccess();
        return { status: state[key]!, summary: { scannedCount: 1, migratedCount: 0, skippedCount: 0, failedCount: state[key] === "FAILED" ? 1 : 0, details: [] },
          errorMessage: state[key] === "FAILED" ? "an item is unfinished" : null };
      },
    });
    const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([
      predecessor("20261017_task_agent_own_run_v1", "17", () => finishedBy17(w)),
      predecessor("20261018_append_only_message_logs_v1", "18"),
      predecessor("20261019_delegated_copy_own_file_complete_v1", "19"),
      main(w), ...createDelegatedRunsPreservedItemsMigrations(w.appData, w.memory, names),
    ]), new InMemoryRecords(), { logsDir: path.join(w.appData, "logs") });
    // Start 1: 20261017 and 20261018 are FAILED; our migration runs (no hold); their follow-ups wait, reported.
    const first = new Map((await runner.runPending()).map((status) => [status.migrationId, status]));
    expect(first.get(DELEGATED_RUNS_OWN_RUNS_V1_MIGRATION_ID)?.status).toBe("SUCCEEDED");
    expect(first.get(AFTER_19)?.status).toBe("SUCCEEDED");
    for (const waiting of [AFTER_17, AFTER_18]) expect(first.get(waiting)?.errorMessage).toContain("APP_DATA_MIGRATION_PREREQUISITE_INCOMPLETE");
    // Start 2: 20261017 finishes its item; 20261018 stays FAILED for its unrelated log.
    state["17"] = "SUCCEEDED";
    const second = new Map((await runner.runPending()).map((status) => [status.migrationId, status]));
    expect(second.get(AFTER_17)?.status).toBe("SUCCEEDED");
    expect(second.get(AFTER_18)?.errorMessage).toContain("20261018_append_only_message_logs_v1");
    expect(await readJson(paths(w).teamFile("late_team"))).toHaveProperty("delegatedFrom");
    expect(await teamRows(w)).toContain("late_team");
    // Start 3: nothing changes; the converted follow-up is terminal.
    const files = await snapshot(w.memory);
    await runner.runPending();
    expect(await snapshot(w.memory)).toEqual(files);
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
