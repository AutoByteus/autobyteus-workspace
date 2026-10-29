import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  COMPACTOR_RUN,
  IMPROVER_ID,
  IMPROVER_RUNS,
  SERVER_HELPER_RUN,
  USER_RUNS,
  historyIndexWithout,
  historyRow,
  put,
  snapshot,
  without,
  writeFeatureDataRoot,
  writeRun,
} from "../../fixtures/app-data-migrations/skill-improvement-data-fixtures.js";

// The removed Skill Improvement feature's data through the actual built Studio startup (`dist/app.js`): the
// retired settings at config initialization, the registered startup migration
// `20261020_remove_skill_improvement_data`, the repository migration runner, the built-in bootstrap and GraphQL
// (design DS-002, DS-003; AC-003, AC-004). The data root is small and synthesized in the released shapes
// (`skill-improvement-data-fixtures.ts`, F-1..F-8b), never the user's data or a copy of it (TESTING.md).
// - SID-1: a fresh data folder starts cleanly; the improver is not bootstrapped.
// - SID-2: the old data starts cleanly; exactly the feature's data, settings and history rows are gone, everything
//   else is byte-identical, other runs list and open; a second start changes nothing. A v1.4.92-beta.5-era compactor
//   run, which also carries `launchPurpose: "server_helper"`, survives with its history row (REQ-008).
// - SID-3 (POSIX non-root only, because the failure is a mode-bit block): a helper run folder that cannot be deleted
//   leaves startup working; the next start finishes.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts --no-watch
const MIGRATION_ID = "20261020_remove_skill_improvement_data";
const RETIRED_KEYS = ["ENABLE_SKILL_IMPROVEMENT", "AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID", "ENABLE_SELF_EVOLUTION"];
const ENV_KEPT = ["APP_ENV=test", "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000", "UNRELATED_SETTING=kept as is"];
const modeBitsBlock = process.platform !== "win32" && process.getuid?.() !== 0;

let root = "";
const children: ChildProcess[] = [];
const logs: string[] = [];

const until = async (check: () => Promise<boolean> | boolean, label: string, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out ${label}: ${logs.join("\n").slice(-4000)}`);
};
const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
  try { await exited; } finally { clearTimeout(force); }
};
const exists = (target: string) => fs.lstat(target).then(() => true, () => false);

/** Only this test-owned root: private HOME and database; no inherited AUTOBYTEUS_* or provider values. */
const environment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
    .flatMap(key => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  return Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1" });
};

const setupRoot = async (envLines: readonly string[]) => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "remove-skill-improvement-startup-e2e-"));
  await fs.mkdir(path.join(root, "home"));
  await fs.writeFile(path.join(root, ".env"), `${envLines.join("\n")}\n`);
};

const studio = async () => {
  await fs.access(path.resolve("dist/app.js"));
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { env: environment(), stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const index = logs.push("") - 1;
  const capture = (data: Buffer) => { logs[index] += data.toString(); };
  child.stdout!.on("data", capture); child.stderr!.on("data", capture);
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Studio startup exited: ${logs[index]}`);
    return logs[index]!.includes("Server listening on 127.0.0.1:0");
  }, "Studio readiness");
  const origin = [...logs[index]!.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { errors?: unknown; data: any };
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data;
  };
  const migration = async () => (await gql("{getAppDataMigrations{migrationId status attempts summary errorMessage logPath}}"))
    .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === MIGRATION_ID);
  const historyRunIds = async (): Promise<string[]> => {
    const groups = (await gql("{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId}}}}")).listWorkspaceRunHistory as any[];
    return groups.flatMap((group) => group.agentDefinitions.flatMap((definition: any) => definition.runs.map((run: any) => run.runId as string)));
  };
  const agentIds = async (): Promise<string[]> => ((await gql("{agentDefinitions{id}}")).agentDefinitions as Array<{ id: string }>).map((d) => d.id);
  const openRun = async (runId: string) => (await gql("query($runId:String!){getRunProjection(runId:$runId){runId conversation}}", { runId })).getRunProjection;
  const settings = async (): Promise<string[]> => ((await gql("{getServerSettings{key}}")).getServerSettings as Array<{ key: string }>).map((s) => s.key);
  return { child, migration, historyRunIds, agentIds, openRun, settings, output: () => logs[index]! };
};

afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (root) {
    spawnSync("chmod", ["-R", "u+w", root]);
    await fs.rm(root, { recursive: true, force: true });
  }
  root = "";
});

describe("Removal of the Skill Improvement feature's data on startup (built Studio)", () => {
  it("SID-1 starts on a fresh data folder: nothing to remove, and the improver is not bootstrapped", async () => {
    await setupRoot(ENV_KEPT);
    const studioRun = await studio();
    expect(await studioRun.migration()).toMatchObject({ status: "SUCCEEDED", errorMessage: null });
    const agents = await studioRun.agentIds();
    expect(agents).toContain("autobyteus-daily-assistant");
    expect(agents).not.toContain(IMPROVER_ID);
    expect(await exists(path.join(root, "agents", IMPROVER_ID))).toBe(false);
    expect((await studioRun.settings()).filter((key) => RETIRED_KEYS.includes(key))).toEqual([]);
  }, 120_000);

  it("SID-2 deletes exactly the feature's data once, keeps everything else byte-identical, and other runs list and open", async () => {
    await setupRoot([ENV_KEPT[0]!, RETIRED_KEYS[0] + "=true", ENV_KEPT[1]!, `${RETIRED_KEYS[1]}=${IMPROVER_ID}`, ENV_KEPT[2]!, `${RETIRED_KEYS[2]}=false`]);
    const paths = await writeFeatureDataRoot(root);
    // REQ-008: a beta.5-era compactor run carries `server_helper` too, but is not the feature's; it and its row stay.
    const indexPath = path.join(root, "memory", "run_history_index.json");
    await writeRun(path.join(root, "memory"), COMPACTOR_RUN, "autobyteus-memory-compactor", { launchPurpose: "server_helper" });
    await put(indexPath, [...JSON.parse(await fs.readFile(indexPath, "utf8")), historyRow(COMPACTOR_RUN, "autobyteus-memory-compactor", "Memory Compactor")]);
    const before = await snapshot(root);
    const keptRows = JSON.parse(await historyIndexWithout(path.join(root, "memory"), paths.removedRows)) as Array<{ runId: string }>;
    /** The original non-helper rows are unchanged and no helper row is left (the runtime may add rows for runs it finds). */
    const expectHistoryIndex = async () => {
      const rows = JSON.parse(await fs.readFile(indexPath, "utf8")) as Array<{ runId: string }>;
      for (const row of keptRows) expect(rows.find((candidate) => candidate.runId === row.runId), row.runId).toEqual(row);
      expect(rows.filter((row) => paths.removedRows.includes(row.runId))).toEqual([]);
    };

    const first = await studio();
    const record = await first.migration();
    expect(record, JSON.stringify(record)).toMatchObject({ status: "SUCCEEDED", errorMessage: null, attempts: 1 });
    for (const gone of paths.deleted) expect(await exists(path.join(root, gone)), gone).toBe(false);
    await expectHistoryIndex();
    // Every file that existed and is not the feature's is byte-identical (the server may add its own new files).
    const expected = without(before, [...paths.deleted, "memory/run_history_index.json", ".env"]);
    const keptNow = (files: Record<string, string>) => Object.fromEntries(Object.entries(files).filter(([rel]) => rel in expected));
    expect(keptNow(await snapshot(root))).toEqual(expected);
    // The settings: the three keys are gone, every other line is kept.
    expect(await fs.readFile(path.join(root, ".env"), "utf8")).toBe(`${ENV_KEPT.join("\n")}\n`);
    expect((await first.settings()).filter((key) => RETIRED_KEYS.includes(key))).toEqual([]);
    // Other runs list and open; helper runs are gone from history; the Skill Self-Evolver and user agents stay.
    const history = await first.historyRunIds();
    // (USER_RUNS[2]'s row is archived, so it is not listed; its row is checked above.)
    expect(history).toEqual(expect.arrayContaining([USER_RUNS[0], USER_RUNS[1], USER_RUNS[3], USER_RUNS[4], USER_RUNS[5]]));
    expect(history.filter((runId) => [...IMPROVER_RUNS, SERVER_HELPER_RUN].includes(runId))).toEqual([]);
    expect(await first.openRun(USER_RUNS[0]!)).toMatchObject({ runId: USER_RUNS[0] });
    // The compactor run: its folder is byte-identical (in `expected`), its history row is kept, and it is listed.
    expect(keptRows.map((row) => row.runId)).toContain(COMPACTOR_RUN);
    expect(Object.keys(expected).filter((rel) => rel.startsWith(`memory/agents/${COMPACTOR_RUN}/`)).length).toBeGreaterThan(0);
    expect(history).toContain(COMPACTOR_RUN);
    const agents = await first.agentIds();
    expect(agents).toEqual(expect.arrayContaining(["autobyteus-skill-evolver", "my-agent", "autobyteus-daily-assistant"]));
    expect(agents).not.toContain(IMPROVER_ID);
    await stop(first.child);
    const afterFirst = await snapshot(root);
    const indexAfterFirst = await fs.readFile(indexPath, "utf8");

    // A second start: the migration is not run again and nothing changes.
    const second = await studio();
    expect(await second.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(keptNow(await snapshot(root))).toEqual(expected);
    expect(await fs.readFile(indexPath, "utf8")).toBe(indexAfterFirst);
    await expectHistoryIndex();
    for (const gone of paths.deleted) expect(await exists(path.join(root, gone)), gone).toBe(false);
    expect(await second.historyRunIds()).toContain(COMPACTOR_RUN);
    expect(Object.keys(afterFirst).filter((rel) => rel.startsWith("memory/")).sort())
      .toEqual(Object.keys(await snapshot(root)).filter((rel) => rel.startsWith("memory/")).sort());
  }, 180_000);

  it.skipIf(!modeBitsBlock)("SID-3 a helper run that cannot be deleted leaves startup working; the next start finishes (needs POSIX mode bits that bind: not root, not Windows)", async () => {
    await setupRoot(ENV_KEPT);
    const paths = await writeFeatureDataRoot(root);
    const blocked = path.join(root, "memory", "agents", IMPROVER_RUNS[0]!, "kept-by-mode-bits");
    await fs.mkdir(blocked);
    await fs.writeFile(path.join(blocked, "file.txt"), "x");
    await fs.chmod(blocked, 0o555);
    await expect(fs.rm(path.join(blocked, "file.txt"))).rejects.toMatchObject({ code: expect.stringMatching(/^(EACCES|EPERM)$/) });

    const first = await studio();
    const record = await first.migration();
    expect(record, JSON.stringify(record)).toMatchObject({ status: "FAILED", attempts: 1 });
    expect(record.errorMessage).toMatch(/the next start continues/);
    // The app works: other runs list and open; the records stay until their helper runs are gone.
    expect(await first.historyRunIds()).toEqual(expect.arrayContaining([USER_RUNS[0], USER_RUNS[1]]));
    expect(await first.openRun(USER_RUNS[1]!)).toMatchObject({ runId: USER_RUNS[1] });
    expect(await exists(path.join(root, "memory", "skill_improvement", "index.json"))).toBe(true);
    await stop(first.child);
    await fs.chmod(blocked, 0o755);

    const second = await studio();
    const retried = await second.migration();
    expect(retried, JSON.stringify(retried)).toMatchObject({ status: "SUCCEEDED", attempts: 2 });
    for (const gone of paths.deleted) expect(await exists(path.join(root, gone)), gone).toBe(false);
  }, 180_000);
});
