import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  REMOVE_SKILL_IMPROVEMENT_DATA_MIGRATION_ID,
  RemoveSkillImprovementDataMigration,
} from "../../../src/app-data-migrations/migrations/remove-skill-improvement-data/remove-skill-improvement-data-migration.js";
import {
  COMPACTOR_RUN,
  EVOLVER_RUNS,
  IMPROVER_ID,
  IMPROVER_RUNS,
  SERVER_HELPER_RUN,
  USER_RUNS,
  historyIndexWithout,
  historyRow,
  put,
  session,
  snapshot,
  without,
  writeFeatureDataRoot,
  writeRun,
} from "../../fixtures/app-data-migrations/skill-improvement-data-fixtures.js";

/**
 * `20261020_remove_skill_improvement_data` (design DS-003, M1..M6, Shape Inventory F-1..F-8b) over synthesized
 * data only (TESTING.md: never the user's data or a copy of it). AC-003, AC-004.
 */

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const dataRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "remove-skill-improvement-data-"));
  roots.push(root);
  return { root, memory: path.join(root, "memory"), agents: path.join(root, "agents") };
};
const migrate = (memory: string, agents: string) => new RemoveSkillImprovementDataMigration(memory, agents).execute();
const exists = (target: string) => fs.lstat(target).then(() => true, () => false);
const byItem = (result: Awaited<ReturnType<typeof migrate>>) =>
  Object.fromEntries(result.summary.details.map((detail) => [detail.itemId, `${detail.status} ${detail.message}`]));

describe("20261020_remove_skill_improvement_data", () => {
  it("is registered after every run-tree migration (only the node identity file rename follows), required on startup and startup-only", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    expect(definitions.at(-2)?.id).toBe(REMOVE_SKILL_IMPROVEMENT_DATA_MIGRATION_ID);
    expect(definitions.at(-2)).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY" });
    expect(definitions.at(-1)?.id).toBe("20261024_node_identity_file_name");
  });

  it("finds nothing on a fresh data folder", async () => {
    const { memory, agents } = await dataRoot();
    expect(await migrate(memory, agents)).toMatchObject({
      status: "SUCCEEDED", errorMessage: null, summary: { scannedCount: 0, failedCount: 0, details: [] },
    });
  });

  it("deletes exactly the feature's data and leaves everything else byte-identical (F-1..F-8b, AC-004)", async () => {
    const { root, memory, agents } = await dataRoot();
    const paths = await writeFeatureDataRoot(root);
    const before = await snapshot(root);
    const expectedIndex = await historyIndexWithout(memory, paths.removedRows);

    const result = await migrate(memory, agents);

    expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED");
    for (const gone of paths.deleted) expect(await exists(path.join(root, gone)), gone).toBe(false);
    // The history index loses exactly the helper rows; every other row keeps its bytes.
    expect(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")).toBe(expectedIndex);
    // Everything else: unrelated runs and agents (the Skill Self-Evolver included), a delegated copy of the
    // improver, a non-session `skill_improvement` folder, and the Memory Sync mirror.
    const unchanged = without(before, [...paths.deleted, "memory/run_history_index.json"]);
    expect(without(await snapshot(root), ["memory/run_history_index.json"])).toEqual(unchanged);
    expect(unchanged).toHaveProperty(["agents/autobyteus-skill-evolver/agent.md"]);
    expect(unchanged).toHaveProperty([`memory/agents/${USER_RUNS[5]}/skill_improvement/notes.md`]);
    expect(unchanged).toHaveProperty(["memory/imports/docker-node-1/skill_improvement/index.json"]);
    expect(byItem(result)).toMatchObject({
      "history-index": "MIGRATED Removed 5 helper run history row(s).",
      [`helper-run:${IMPROVER_RUNS[0]}`]: expect.stringMatching(/^MIGRATED/),
      [`helper-run:${SERVER_HELPER_RUN}`]: expect.stringMatching(/^MIGRATED/),
      "records:skill_improvement": expect.stringMatching(/^MIGRATED/),
      "records:self_evolution": expect.stringMatching(/^MIGRATED/),
      [`built-in:${IMPROVER_ID}`]: expect.stringMatching(/^MIGRATED/),
      "session:agent_teams/article_team_tttt/article_writer_mmmm/skill_improvement": expect.stringMatching(/^MIGRATED/),
    });
    // Evolver runs without a folder are only history-row candidates: no item for them.
    expect(result.summary.details.some((detail) => detail.itemId === `helper-run:${EVOLVER_RUNS[1]}`)).toBe(false);
    expect(result.summary).toMatchObject({ failedCount: 0, migratedCount: result.summary.details.length });
  });

  it("changes nothing on a second start", async () => {
    const { root, memory, agents } = await dataRoot();
    await writeFeatureDataRoot(root);
    await migrate(memory, agents);
    const after = await snapshot(root);

    expect(await migrate(memory, agents)).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0, details: [] } });
    expect(await snapshot(root)).toEqual(after);
  });

  it("keeps a records root with an unreadable source, and the runs only it names (F-8, AR-001)", async () => {
    const { root, memory, agents } = await dataRoot();
    await writeFeatureDataRoot(root);
    await fs.writeFile(path.join(memory, "skill_improvement", "index.json"), "{ damaged");
    await put(path.join(memory, "self_evolution", "evolution_runs", "evol_04", "record.json"), "not json");
    // An unrelated run whose metadata cannot be read: left untouched.
    await fs.writeFile(path.join(memory, "agents", USER_RUNS[4]!, "run_metadata.json"), "{");
    const keptRoots = without(await snapshot(root), []);

    const result = await migrate(memory, agents);

    expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.errorMessage).toBeNull();
    for (const dir of ["skill_improvement", "self_evolution"]) {
      const kept = Object.entries(keptRoots).filter(([rel]) => rel.startsWith(`memory/${dir}/`) && rel !== `memory/${dir}/`);
      const now = await snapshot(path.join(memory, dir));
      expect(kept.length).toBeGreaterThan(0);
      for (const [rel, hash] of kept) expect(now[rel.slice(`memory/${dir}/`.length)], rel).toBe(hash);
    }
    expect(byItem(result)).toMatchObject({
      "source:skill_improvement/index.json": expect.stringMatching(/^SKIPPED PRESERVED_UNREADABLE/),
      "source:self_evolution/evolution_runs/evol_04/record.json": expect.stringMatching(/^SKIPPED PRESERVED_UNREADABLE/),
      [`source:agents/${USER_RUNS[4]}/run_metadata.json`]: expect.stringMatching(/^SKIPPED PRESERVED_UNREADABLE/),
      "records:skill_improvement": expect.stringMatching(/^SKIPPED PRESERVED_UNREADABLE/),
      "records:self_evolution": expect.stringMatching(/^SKIPPED PRESERVED_UNREADABLE/),
    });
    expect(await fs.readFile(path.join(memory, "agents", USER_RUNS[4]!, "run_metadata.json"), "utf8")).toBe("{");
    // The improver's runs are still found by their definition, so they go.
    for (const runId of IMPROVER_RUNS) expect(await exists(path.join(memory, "agents", runId))).toBe(false);
  });

  it("keeps the records until their helper runs are gone when a run folder cannot be deleted, and the next start finishes", async () => {
    const { root, memory, agents } = await dataRoot();
    const paths = await writeFeatureDataRoot(root);
    const blocked = path.join(memory, "agents", IMPROVER_RUNS[1]!);
    const rm = fs.rm.bind(fs);
    vi.spyOn(fs, "rm").mockImplementation(async (target, options) => {
      if (path.resolve(String(target)) === blocked) throw new Error("injected: busy");
      return rm(target, options);
    });

    const first = await migrate(memory, agents);

    expect(first.status).toBe("FAILED");
    expect(first.errorMessage).toMatch(/could not be removed; the next start continues/);
    expect(byItem(first)).toMatchObject({
      [`helper-run:${IMPROVER_RUNS[1]}`]: expect.stringMatching(/^FAILED .*injected: busy/),
      "records:skill_improvement": expect.stringMatching(new RegExp(`^FAILED Kept until its helper runs are removed \\(${IMPROVER_RUNS[1]}\\)`)),
      "records:self_evolution": expect.stringMatching(/^MIGRATED/),
      [`built-in:${IMPROVER_ID}`]: expect.stringMatching(/^MIGRATED/),
    });
    expect(await exists(path.join(memory, "skill_improvement", "index.json"))).toBe(true);
    expect(await exists(blocked)).toBe(true);
    vi.restoreAllMocks();

    const second = await migrate(memory, agents);
    expect(second.status, JSON.stringify(second.summary.details)).toBe("SUCCEEDED");
    for (const gone of paths.deleted) expect(await exists(path.join(root, gone)), gone).toBe(false);
  });

  it("keeps the helper runs and records when the history rows cannot be written, and the next start removes them all", async () => {
    const { root, memory, agents } = await dataRoot();
    const paths = await writeFeatureDataRoot(root);
    const expectedIndex = await historyIndexWithout(memory, paths.removedRows);
    const originalIndex = await fs.readFile(path.join(memory, "run_history_index.json"), "utf8");
    const rename = fs.rename.bind(fs);
    vi.spyOn(fs, "rename").mockImplementationOnce(async () => { throw new Error("injected: disk full"); });

    const first = await migrate(memory, agents);

    expect(first.status).toBe("FAILED");
    expect(byItem(first)).toMatchObject({
      "history-index": expect.stringMatching(/^FAILED .*injected: disk full/),
      "records:skill_improvement": expect.stringMatching(/^FAILED Kept until/),
      "records:self_evolution": expect.stringMatching(/^FAILED Kept until/),
    });
    expect(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")).toBe(originalIndex);
    expect((await fs.readdir(memory)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    // The helper runs stay with their rows, so the next start still finds every one of them.
    for (const runId of [...IMPROVER_RUNS, SERVER_HELPER_RUN]) expect(await exists(path.join(memory, "agents", runId)), runId).toBe(true);
    vi.mocked(fs.rename).mockImplementation(rename);

    const second = await migrate(memory, agents);
    expect(second.status, JSON.stringify(second.summary.details)).toBe("SUCCEEDED");
    expect(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")).toBe(expectedIndex);
    for (const gone of paths.deleted) expect(await exists(path.join(root, gone)), gone).toBe(false);
  });

  it("only uses canonical run ids from the records: a record naming a path is ignored", async () => {
    const { memory, agents } = await dataRoot();
    await put(path.join(memory, "skill_improvement", "index.json"), { bad: { improverRunId: "../escape" }, dot: { improverRunId: ".." } });
    await put(path.join(memory, "escape", "keep.txt"), "kept\n");
    await put(path.join(memory, "run_history_index.json"), [historyRow(USER_RUNS[0]!, "autobyteus-daily-assistant", "Daily Assistant")]);
    const index = await fs.readFile(path.join(memory, "run_history_index.json"), "utf8");

    expect((await migrate(memory, agents)).status).toBe("SUCCEEDED");
    expect(await fs.readFile(path.join(memory, "escape", "keep.txt"), "utf8")).toBe("kept\n");
    expect(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")).toBe(index);
    expect(await exists(path.join(memory, "skill_improvement"))).toBe(false);
  });

  describe("helper runs come only from the feature's own data (autobyteus-280 REQ-008, AC-005)", () => {
    it("keeps a v1.4.92-beta.5-era compaction run although it was launched as a server helper", async () => {
      const { root, memory, agents } = await dataRoot();
      await writeFeatureDataRoot(root);
      await writeRun(memory, COMPACTOR_RUN, "autobyteus-memory-compactor", { launchPurpose: "server_helper" });
      const rows = JSON.parse(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")) as unknown[];
      await put(path.join(memory, "run_history_index.json"), [...rows, historyRow(COMPACTOR_RUN, "autobyteus-memory-compactor", "Memory Compactor")]);
      const compactorBefore = await snapshot(path.join(memory, "agents", COMPACTOR_RUN));

      const result = await migrate(memory, agents);

      expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED");
      expect(await snapshot(path.join(memory, "agents", COMPACTOR_RUN))).toEqual(compactorBefore);
      const remaining = JSON.parse(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")) as Array<{ runId: string }>;
      expect(remaining.map((row) => row.runId)).toContain(COMPACTOR_RUN);
      expect(result.summary.details.some((detail) => detail.itemId === `helper-run:${COMPACTOR_RUN}`)).toBe(false);
      // The feature's own server-helper run, named by its session file, still goes.
      expect(await exists(path.join(memory, "agents", SERVER_HELPER_RUN))).toBe(false);
    });

    it("keeps a run only an evolver session names, with its history row, and still deletes that session folder", async () => {
      const { root, memory, agents } = await dataRoot();
      await writeFeatureDataRoot(root);
      const evolverOnly = "skill_evolver_6666";
      await writeRun(memory, evolverOnly, "autobyteus-skill-evolver");
      const rows = JSON.parse(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")) as unknown[];
      await put(path.join(memory, "run_history_index.json"), [...rows, historyRow(evolverOnly, "autobyteus-skill-evolver", "Skill Self-Evolver")]);
      const sessionDir = path.join(memory, "agents", USER_RUNS[4]!, "self_evolution");
      await session(path.join(memory, "agents", USER_RUNS[4]!), "self_evolution", "evolver_session.json", { current: evolverOnly });
      const runBefore = await snapshot(path.join(memory, "agents", evolverOnly));

      const result = await migrate(memory, agents);

      expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED");
      expect(await snapshot(path.join(memory, "agents", evolverOnly))).toEqual(runBefore);
      const remaining = JSON.parse(await fs.readFile(path.join(memory, "run_history_index.json"), "utf8")) as Array<{ runId: string }>;
      expect(remaining.map((row) => row.runId)).toContain(evolverOnly);
      expect(result.summary.details.some((detail) => detail.itemId === `helper-run:${evolverOnly}`)).toBe(false);
      expect(await exists(sessionDir)).toBe(false);
    });

    it("keeps a session folder while a run only it names cannot be deleted, and the next start deletes both", async () => {
      const { root, memory, agents } = await dataRoot();
      const paths = await writeFeatureDataRoot(root);
      const sessionDir = path.join(memory, "agents", USER_RUNS[0]!, "skill_improvement");
      const blocked = path.join(memory, "agents", SERVER_HELPER_RUN);
      const rm = fs.rm.bind(fs);
      vi.spyOn(fs, "rm").mockImplementation(async (target, options) => {
        if (path.resolve(String(target)) === blocked) throw new Error("injected: busy");
        return rm(target, options);
      });

      const first = await migrate(memory, agents);

      expect(first.status).toBe("FAILED");
      expect(byItem(first)).toMatchObject({
        [`helper-run:${SERVER_HELPER_RUN}`]: expect.stringMatching(/^FAILED .*injected: busy/),
        [`session:agents/${USER_RUNS[0]}/skill_improvement`]: expect.stringMatching(new RegExp(`^FAILED Kept until its helper runs are removed \\(${SERVER_HELPER_RUN}\\)`)),
      });
      expect(await exists(path.join(sessionDir, "improver_session.json"))).toBe(true);
      expect(await exists(blocked)).toBe(true);
      vi.restoreAllMocks();

      const second = await migrate(memory, agents);
      expect(second.status, JSON.stringify(second.summary.details)).toBe("SUCCEEDED");
      expect(await exists(sessionDir)).toBe(false);
      expect(await exists(blocked)).toBe(false);
      for (const gone of paths.deleted) expect(await exists(path.join(root, gone)), gone).toBe(false);
    });

    it("preserves a session folder whose state file cannot be read", async () => {
      const { root, memory, agents } = await dataRoot();
      await writeFeatureDataRoot(root);
      const sessionDir = path.join(memory, "agents", USER_RUNS[1]!, "skill_improvement");
      await put(path.join(sessionDir, "improver_session.json"), "{ damaged");
      await session(path.join(memory, "agents", USER_RUNS[3]!), "self_evolution", "evolver_session.json", { prior: [EVOLVER_RUNS[2]!] });
      const before = await snapshot(sessionDir);

      const result = await migrate(memory, agents);

      expect(result.status, JSON.stringify(result.summary.details)).toBe("SUCCEEDED_WITH_WARNINGS");
      expect(result.errorMessage).toBeNull();
      expect(await snapshot(sessionDir)).toEqual(before);
      expect(byItem(result)).toMatchObject({
        [`source:agents/${USER_RUNS[1]}/skill_improvement/improver_session.json`]: expect.stringMatching(/^SKIPPED PRESERVED_UNREADABLE/),
        [`session:agents/${USER_RUNS[3]}/self_evolution`]: expect.stringMatching(/^MIGRATED/),
      });
      expect(await exists(path.join(memory, "agents", USER_RUNS[0]!, "skill_improvement"))).toBe(false);
    });
  });
});
