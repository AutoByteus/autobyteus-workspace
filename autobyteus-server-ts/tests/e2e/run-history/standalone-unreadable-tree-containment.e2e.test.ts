import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";

// DESIGN.md rule 7 (contain bad data to its own run) for autobyteus-461's per-run data, through the real Studio server and
// GraphQL, on data made by real Agent roots (scripted AGY actor; no inference). Three standalone runs each delegate a run and
// are stopped; then one delegated run's own file (`agents/<run>/run_metadata.json`) is truncated: a run file that cannot be read.
// - UC-1 (running server): the other runs work: each delegator's view opens with its delegated run, the delegated runs are read
//   by their own path (rule 2), the Token Meter summary of every delegator works, the bad run's own delegator included; the bad
//   run reports that its data cannot be read; a warning names it; no file changes.
// - UC-2: a new server process starts with the unreadable file present (461's startup index reads every run's own file) and the
//   same holds.
// Replaces the round-1 suite of the same name: its premise, a standalone run's `collaboration_tree.json`, and its trigger, the
// context-file owner scan through the hub trees, are removed by 461 (contract §6; rule 2: a delegated run's file is read by its
// own path, so no scan crosses runs).
// Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree (UC-2 starts dist/app.js).
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "uc-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Run = { host: string; child: string };

/** Every run's own files (run files and logs, not runtime scratch), by relative path → hash. */
const fingerprint = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/run_metadata\.json$|communication_messages/.test(entry.name)) out[path.relative(root, full)] = createHash("sha256").update(await fsp.readFile(full)).digest("hex");
    }
  };
  await walk(root);
  return out;
};

suite("An unreadable delegated run's own file is contained to that run (rule 7; real HTTP/GraphQL, runs made by real Agent roots)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const runs: Run[] = [];
  let bad!: Run;
  const warnings: string[] = [];
  const evidence: Rec = {};

  /** Where GraphQL goes: the in-process server first, then (UC-2) a separately started server process. */
  let processUrl: string | null = null;
  /** A GraphQL call that returns the errors instead of throwing (the bad run's queries are expected to fail). */
  const query = async (q: string, variables: Rec) => {
    if (!processUrl) {
      try { return { data: await h.graphql(q, variables), error: null as string | null }; } catch (error) { return { data: null, error: String((error as Error).message) }; }
    }
    const response = await fetch(`${processUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q, variables }) });
    const body = await response.json() as { data?: Rec; errors?: unknown[] };
    return body.errors?.length || !body.data ? { data: null, error: JSON.stringify(body.errors ?? body) } : { data: body.data, error: null as string | null };
  };
  /** A delegated run read by its own path (rule 2). */
  const ownRead = (runId: string) => query(`query($r:String!){getRunProjection(runId:$r){runId conversation}}`, { r: runId });
  const tokenSummary = (runId: string) => query(`query($r:String!){getStandaloneRunTokenUsageSummary(runId:$r){runId}}`, { r: runId });
  const collaboration = (runId: string) => query(`query($r:String!){agentRunCollaboration(runId:$r)}`, { r: runId });

  beforeAll(async () => {
    h = await startCollaborationHarness("uc-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    ids.manager = await h.agentDefinition(`UC host ${suffix}`);
    const helperName = `UC helper ${suffix}`;
    await h.agentDefinition(helperName);
    for (let index = 0; index < 3; index += 1) {
      const root = await h.startRoot("agent", ids);
      const delegated = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(helperName)}`, description: `Reply OK ${index}.` }));
      expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
      await root.waitForTaskAgent(delegated.target_agent_run_id as string);
      runs.push({ host: root.managerRunId, child: delegated.target_agent_run_id as string });
      root.close();
      await h.terminate("agent", root.rootId);
      await h.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: delegated.target_agent_run_id }).catch(() => undefined);
    }
    // One delegated run's own file becomes unreadable (truncated JSON).
    runs.sort((a, b) => a.child.localeCompare(b.child));
    bad = runs[0]!;
    const filePath = path.join(h.dataDir, "memory", "agents", bad.child, "run_metadata.json");
    const text = await fsp.readFile(filePath, "utf8");
    await fsp.writeFile(filePath, text.slice(0, Math.floor(text.length / 2)));
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); });
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); });
  }, 300_000);

  afterAll(async () => {
    const out = process.env["UC_E2E_EVIDENCE"];
    if (out) fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
    vi.restoreAllMocks();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  type ProcessLog = { size: () => number; linesFrom: (mark: number) => string[] };
  const expectContained = async (label: string, log?: ProcessLog) => {
    const memory = path.join(h.dataDir, "memory", "agents");
    const before = await fingerprint(memory);
    const logStart = log?.size() ?? 0;
    const record: Rec = {};
    evidence[label] = record;
    // The other runs work: their delegated runs by their own path; every delegator opens with its delegated run and its
    // Token Meter summary works (the bad run's delegator is another run: it is unaffected too).
    for (const run of runs.slice(1)) {
      const read = await ownRead(run.child);
      expect(read.error, `${label}: ${run.child} read by its own path: ${read.error}`).toBeNull();
      expect((read.data as Rec).getRunProjection.runId, label).toBe(run.child);
    }
    // The bad run's own delegator last, so every other delegator is checked first.
    for (const run of [...runs.slice(1), bad]) {
      const view = await collaboration(run.host);
      record[`view:${run === bad ? "bad run's delegator" : run.host}`] = view.error ? view.error.slice(0, 400) : "opens";
      expect(view.error, `${label}: ${run === bad ? "the bad run's own delegator" : "another delegator"} ${run.host} opens: ${view.error}`).toBeNull();
      expect((view.data as Rec).agentRunCollaboration, `${label}: ${run.host} opens`).toBeTruthy();
      if (run !== bad) expect(JSON.stringify(view.data), `${label}: ${run.host} shows its delegated run`).toContain(run.child);
      const summary = await tokenSummary(run.host);
      expect(summary.error, `${label}: Token Meter summary of ${run.host}: ${summary.error}`).toBeNull();
    }
    // The bad run's own read is recorded: rule 7 lets it be left out or report that its data cannot be read; its conversation
    // (memory traces, intact) may still be served.
    const badRead = await ownRead(bad.child);
    record.badRead = { error: badRead.error?.slice(0, 600) ?? null, served: Boolean((badRead.data as Rec | null)?.getRunProjection) };
    const lines = log ? log.linesFrom(logStart) : warnings;
    const naming = lines.filter((line) => line.includes(bad.child));
    record.warnings = naming.slice(0, 5).map((line) => line.slice(0, 400));
    // A start reads every run's own file (461's index), so it meets the bad file: a logged warning names the run (rule 7).
    if (log) expect(naming.length, `${label}: a warning names the unreadable run; got ${JSON.stringify(lines.filter((l) => /warn|error/i.test(l)).slice(-20)).slice(0, 1500)}`).toBeGreaterThan(0);
    expect(lines.filter((line) => runs.slice(1).some((run) => line.includes(run.child)) && /warn|error|cannot be read|unreadable/i.test(line)),
      `${label}: no warning about the readable runs`).toEqual([]);
    expect(await fingerprint(memory), `${label}: no run file changed`).toEqual(before);
  };

  it("UC-1 the other runs work, the bad run reports that its data cannot be read, a warning names it, no file changes", async () => {
    await expectContained("running server");
  }, 300_000);

  it("UC-2 a new server process starts with the unreadable run file present and the same holds", async () => {
    await h.stopServer();
    // An app restart is a new process: start the built server (dist/app.js) on the same data dir and database.
    const serverDir = path.resolve(__dirname, "../../..");
    const child: ChildProcess = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", h.dataDir, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? "/tmp", USER: process.env.USER ?? "tester",
        DATABASE_URL: process.env.DATABASE_URL ?? "", ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout!.on("data", (chunk) => { output += String(chunk); });
    child.stderr!.on("data", (chunk) => { output += String(chunk); });
    try {
      const deadline = Date.now() + 120_000;
      // Ready only after the server's own line: the agent-tools MCP host logs its own "Server listening at …" first.
      while (!output.includes("Server listening on 127.0.0.1:0")) {
        if (child.exitCode !== null || Date.now() > deadline) throw new Error(`server did not start: ${output.slice(-1500)}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      // The Studio app is the listener that serves GraphQL (the MCP host's URL answers 404 there).
      for (const [, candidate] of output.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)) {
        const probe = await fetch(`${candidate}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "{__typename}" }) });
        if (probe.ok) { processUrl = candidate!; break; }
      }
      if (!processUrl) throw new Error(`no listener serves GraphQL: ${output.slice(-1500)}`);
      // The new process logs to its own output, the startup's lines included.
      await expectContained("new server process", { size: () => 0, linesFrom: (mark) => output.slice(mark).split("\n") });
    } finally {
      child.kill("SIGTERM");
      await new Promise((resolve) => { if (child.exitCode !== null) resolve(null); else child.once("exit", resolve); });
    }
  }, 300_000);
});
