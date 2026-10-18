import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// remove-nested-task-team AC-002 (REQ-003, DESIGN.md rule 7) through the real Studio server and GraphQL, on data made by real
// Agent roots (scripted AGY actor; no inference): three standalone runs each delegate a task agent and are stopped; then one
// run's collaboration tree is truncated (a tree that cannot be read). The other runs keep working where the server looks agents
// up across standalone runs — file changes and the member conversation of their task agents, and the Token Meter summary of
// their runs; every scan that reaches the bad run warns naming it and continues; opening the bad run reports its error; no file
// changes; a server restart starts with the bad tree present and the same holds.
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

type Run = { host: string; child: string; childAddress: string };

const fingerprint = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (full.includes(`${path.sep}collaboration${path.sep}`)) out[path.relative(root, full)] = createHash("sha256").update(await fsp.readFile(full)).digest("hex");
    }
  };
  await walk(root);
  return out;
};

suite("An unreadable standalone tree is contained to its own run (real HTTP/GraphQL, runs made by real Agent roots)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const runs: Run[] = [];
  let bad!: Run;
  const warnings: string[] = [];

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
  const fileChanges = (runId: string) => query(`query($r:String!){getRunFileChanges(runId:$r){id runId}}`, { r: runId });
  const member = (run: Run) => query(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){agentRunId conversation}}`,
    { h: run.host, a: run.childAddress, r: run.child });
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
      runs.push({ host: root.managerRunId, child: delegated.target_agent_run_id as string, childAddress: `/${segment(helperName)}` });
      root.close();
      await h.terminate("agent", root.rootId);
    }
    // The run scanned first (hosts are scanned in sorted order) becomes unreadable (truncated JSON), so every
    // cross-run lookup for the other runs has to pass it.
    runs.sort((a, b) => a.host.localeCompare(b.host));
    bad = runs[0]!;
    const treePath = path.join(h.dataDir, "memory", "agents", bad.host, "collaboration", "collaboration_tree.json");
    const text = await fsp.readFile(treePath, "utf8");
    await fsp.writeFile(treePath, text.slice(0, Math.floor(text.length / 2)));
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); });
  }, 300_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  const expectContained = async (label: string, logLines?: () => string[]) => {
    const before = await fingerprint(path.join(h.dataDir, "memory", "agents"));
    warnings.length = 0;
    for (const run of [runs[1]!, runs[2]!]) {
      const changes = await fileChanges(run.child);
      expect(changes.error, `${label}: file changes of ${run.child}: ${changes.error}`).toBeNull();
      const projection = await member(run);
      expect(projection.error, `${label}: member projection of ${run.child}: ${projection.error}`).toBeNull();
      expect((projection.data as Rec).agentRunCollaborationMemberProjection.agentRunId, label).toBe(run.child);
      const summary = await tokenSummary(run.host);
      expect(summary.error, `${label}: Token Meter summary of ${run.host}`).toBeNull();
      expect(((await collaboration(run.host)).data as Rec).agentRunCollaboration, `${label}: ${run.host} opens`).toBeTruthy();
    }
    if (logLines) warnings.push(...logLines().filter((line) => line.includes("Skipping standalone run")));
    expect(warnings.some((w) => w.includes(`Skipping standalone run '${bad.host}'`) && w.includes("cannot be read")),
      `${label}: a warning names the skipped run; got ${JSON.stringify(warnings).slice(0, 600)}`).toBe(true);
    expect(warnings.every((w) => !w.includes(runs[1]!.host) && !w.includes(runs[2]!.host)), `${label}: no warning about readable runs`).toBe(true);
    // Opening the unreadable run reports its error.
    expect((await collaboration(bad.host)).error, `${label}: opening the bad run`).toBeTruthy();
    expect((await member(bad)).error, `${label}: the bad run's member`).toBeTruthy();
    expect(await fingerprint(path.join(h.dataDir, "memory", "agents")), `${label}: no collaboration file changed`).toEqual(before);
  };

  it("UC-1 the other runs work, the scan warns naming the bad run and continues, the bad run reports its error, no file changes", async () => {
    await expectContained("running server");
  }, 300_000);

  it("UC-2 a new server process starts with the unreadable tree present and the same holds", async () => {
    await h.stopServer();
    // An app restart is a new process: start the built server (dist/app.js) on the same data dir and database.
    const serverDir = path.resolve(__dirname, "../../..");
    const child: ChildProcess = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--data-dir", h.dataDir, "--host", "127.0.0.1", "--port", "0"],
      { cwd: serverDir, env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", TMPDIR: process.env.TMPDIR ?? "/tmp", USER: process.env.USER ?? "tester",
        DATABASE_URL: process.env.DATABASE_URL ?? "", ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills" }, stdio: ["ignore", "pipe", "pipe"] });
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
      // The new process logs to its own output; collect its warnings there.
      const mark = output.length;
      await expectContained("new server process", () => output.slice(mark).split("\n"));
    } finally {
      child.kill("SIGTERM");
      await new Promise((resolve) => { if (child.exitCode !== null) resolve(null); else child.once("exit", resolve); });
    }
  }, 300_000);
});
