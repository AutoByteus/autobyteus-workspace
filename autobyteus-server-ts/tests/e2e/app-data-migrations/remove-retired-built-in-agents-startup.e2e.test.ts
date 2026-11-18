import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { historyRow, put, snapshot, without, writeRun } from "../../fixtures/app-data-migrations/skill-improvement-data-fixtures.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// autobyteus-491: the retired built-in agents through the actual built Studio startup (`dist/app.js`): the registered
// startup migration `20261118_remove_retired_built_in_agents`, the repository migration runner, the agent catalog and
// GraphQL (AC-003, AC-004, AC-005). The data root is small and synthesized in the released shapes, never the user's
// data or a copy of it (TESTING.md).
// - RRB-1: the installed Skill Self-Evolver (with its own skill) and Memory Compactor are deleted and no longer listed;
//   every other agent folder and every run folder, the old compactor runs and old `episodic.jsonl`/`semantic.jsonl`
//   files included, is byte-identical; a second start runs nothing and changes nothing.
// - RRB-2: a data folder that never had them starts cleanly; the migration skips both.
// - RRB-3 (AC-004, the tool surface; gated): after the upgrade start, a run of the built-in Daily Assistant (whose
//   configuration enables `list_available_agents`) calls it (the scripted AGY CLI makes the real tool call): its answer
//   lists the user's agent and neither retired agent (name, id or the `/memory_compactor` address agents were offered).
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts --no-watch
// RRB-3 also needs: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs
const MIGRATION_ID = "20261118_remove_retired_built_in_agents";
const EVOLVER_ID = "autobyteus-skill-evolver";
const COMPACTOR_ID = "autobyteus-memory-compactor";
const COMPACTOR_RUNS = ["memory_compactor_1a2b", "memory_compactor_3c4d"];
const USER_RUN = "daily_assistant_aaaa";
const OLD_ITEMS_RUN = "codex_old_items_5e6f";

const agyCli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const agyEnabled = process.env.RUN_AGY_FAILURE_E2E === "1" && Boolean(agyCli) && spawnSync(agyCli, ["--version"], { stdio: "ignore" }).status === 0;

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

const setupRoot = async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "remove-retired-built-ins-startup-e2e-"));
  await fs.mkdir(path.join(root, "home"));
  await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
};

/** The retired installed copies as earlier builds left them, next to data that must stay byte-identical. */
const writeRetiredBuiltInsRoot = async () => {
  const agents = path.join(root, "agents");
  const memory = path.join(root, "memory");
  await put(path.join(agents, EVOLVER_ID, "agent.md"), "---\nname: Skill Self-Evolver\n---\n\nEvolve.\n");
  await put(path.join(agents, EVOLVER_ID, "agent-config.json"), { skillNames: ["retrospective-skill-coach"] });
  await put(path.join(agents, EVOLVER_ID, "skills", "retrospective-skill-coach", "SKILL.md"), "# coach\n");
  await put(path.join(agents, COMPACTOR_ID, "agent.md"), "---\nname: Memory Compactor\n---\n\nCompact.\n");
  await put(path.join(agents, COMPACTOR_ID, "agent-config.json"), {});
  await put(path.join(agents, "my-agent", "agent.md"), "---\nname: My Agent\n---\n\nMine.\n");
  // The retired compactor's own runs, a user run, and a run with the retired compactor's old item files (DEC-004, DEC-006).
  for (const runId of COMPACTOR_RUNS) await writeRun(memory, runId, COMPACTOR_ID);
  await writeRun(memory, USER_RUN, "autobyteus-daily-assistant");
  await writeRun(memory, OLD_ITEMS_RUN, "my-agent");
  await put(path.join(memory, "agents", OLD_ITEMS_RUN, "episodic.jsonl"), `${JSON.stringify({ id: "ep_1", ts: 1, summary: "old summary" })}\n`);
  await put(path.join(memory, "agents", OLD_ITEMS_RUN, "semantic.jsonl"), `${JSON.stringify({ id: "sem_1", ts: 1, category: "user_preference", fact: "old fact" })}\n`);
  await put(path.join(memory, "run_history_index.json"), [
    ...COMPACTOR_RUNS.map((runId) => historyRow(runId, COMPACTOR_ID, "Memory Compactor")),
    historyRow(USER_RUN, "autobyteus-daily-assistant", "Daily Assistant"),
    historyRow(OLD_ITEMS_RUN, "my-agent", "My Agent"),
  ]);
  // A Memory Sync mirror of another node: never touched.
  await put(path.join(memory, "imports", "docker-node-1", "agents", "memory_compactor_9999", "raw_traces_active.jsonl"), "{}\n");
};

const studio = async (extraEnv: NodeJS.ProcessEnv = {}) => {
  await fs.access(path.resolve("dist/app.js"));
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { env: { ...environment(), ...extraEnv, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
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
  const migration = async () => (await gql("{getAppDataMigrations{migrationId status attempts summary errorMessage}}"))
    .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === MIGRATION_ID);
  const agentIds = async (): Promise<string[]> => ((await gql("{agentDefinitions{id}}")).agentDefinitions as Array<{ id: string }>).map((d) => d.id);
  const historyRunIds = async (): Promise<string[]> => {
    const groups = (await gql("{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId}}}}")).listWorkspaceRunHistory as any[];
    return groups.flatMap((group) => group.agentDefinitions.flatMap((definition: any) => definition.runs.map((run: any) => run.runId as string)));
  };
  return { child, origin, gql, migration, agentIds, historyRunIds };
};

afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (root) await fs.rm(root, { recursive: true, force: true });
  root = "";
});

describe("Removal of the retired built-in agents on startup (built Studio)", () => {
  it("RRB-1 deletes exactly the two installed copies once; other agents and every run, old item files included, stay byte-identical", async () => {
    await setupRoot();
    await writeRetiredBuiltInsRoot();
    const before = await snapshot(root);
    const removed = [`agents/${EVOLVER_ID}`, `agents/${COMPACTOR_ID}`];
    // Every file that existed and is not a retired copy is byte-identical (the server may add files of its own, and
    // keeps the history index it reads; its rows are checked through history below).
    const expected = without(before, [...removed, "memory/run_history_index.json"]);
    const keptNow = (files: Record<string, string>) => Object.fromEntries(Object.entries(files).filter(([rel]) => rel in expected));

    const first = await studio();
    const record = await first.migration();
    expect(record, JSON.stringify(record)).toMatchObject({ status: "SUCCEEDED", errorMessage: null, attempts: 1 });
    expect(record.summary).toBe("Scanned 2; migrated 2; skipped 0; failed 0.");
    for (const gone of removed) expect(await exists(path.join(root, gone)), gone).toBe(false);
    expect(keptNow(await snapshot(root))).toEqual(expected);
    for (const rel of [`memory/agents/${OLD_ITEMS_RUN}/episodic.jsonl`, `memory/agents/${OLD_ITEMS_RUN}/semantic.jsonl`,
      ...COMPACTOR_RUNS.map((runId) => `memory/agents/${runId}/raw_traces_active.jsonl`)]) expect(expected, rel).toHaveProperty(rel);
    const agents = await first.agentIds();
    expect(agents).not.toContain(EVOLVER_ID);
    expect(agents).not.toContain(COMPACTOR_ID);
    expect(agents).toEqual(expect.arrayContaining(["my-agent", "autobyteus-daily-assistant"]));
    // The retired compactor's runs stay in history.
    expect(await first.historyRunIds()).toEqual(expect.arrayContaining([...COMPACTOR_RUNS, USER_RUN, OLD_ITEMS_RUN]));
    await stop(first.child);
    const afterFirst = await snapshot(root);

    const second = await studio();
    expect(await second.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    expect(keptNow(await snapshot(root))).toEqual(expected);
    for (const gone of removed) expect(await exists(path.join(root, gone)), gone).toBe(false);
    expect(Object.keys(await snapshot(root)).filter((rel) => rel.startsWith("memory/agents/")).sort())
      .toEqual(Object.keys(afterFirst).filter((rel) => rel.startsWith("memory/agents/")).sort());
  }, 180_000);

  (agyEnabled ? it : it.skip)("RRB-3 after the upgrade start, an agent's list_available_agents answer names neither retired agent", async () => {
    await setupRoot();
    await writeRetiredBuiltInsRoot();
    const workspace = path.join(root, "workspace");
    await fs.mkdir(workspace);
    const server = await studio({ ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: "linked_skills" });
    expect(await server.migration()).toMatchObject({ status: "SUCCEEDED", summary: "Scanned 2; migrated 2; skipped 0; failed 0." });
    const created = (await server.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: {
      agentDefinitionId: "autobyteus-daily-assistant", workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null,
      autoExecuteTools: true, runtimeKind: "antigravity_cli" } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const socket = new WebSocket(`${server.origin.replace(/^http/, "ws")}/ws/agent/${created.runId}`);
    const frames: Array<{ type: string }> = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    try {
      await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
      await until(() => frames.some((frame) => frame.type === "CONNECTED"), "agent stream connected");
      sendE2eSendMessageCommand(socket, { agent_run_id: created.runId,
        content: `CALL_TOOL:${JSON.stringify({ name: "list_available_agents", arguments: {} })}` });
      // The scripted agent answers with `CALLED:<tool result>`; the run's own projection holds it.
      let called = "";
      let conversationText = "";
      await until(async () => {
        const conversation = (await server.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: created.runId }))
          .getRunProjection?.conversation;
        conversationText = JSON.stringify(conversation ?? []);
        called = conversationText.match(/CALLED:(.*?)(?<!\\)"/)?.[1] ?? "";
        return called.length > 0;
      }, "the list_available_agents result", 90_000).catch((error) => {
        throw new Error(`${String(error).slice(0, 600)}\nframe types: ${frames.map((frame) => frame.type).join(",")}\nerror frames: ${JSON.stringify(frames.filter((frame) => frame.type === "ERROR")).slice(0, 2000)}\nlast frames: ${JSON.stringify(frames.slice(-4)).slice(0, 3000)}\nserver log tail: ${logs.join("\n").split("\n").filter((line) => !line.includes("Memory file missing")).slice(-40).join("\n").slice(-5000)}\nconversation: ${conversationText.slice(0, 3000)}`);
      });
      logs.push(`RRB-3 list_available_agents result: ${called.slice(0, 4000)}`);
      expect(called).toContain("My Agent");
      for (const retired of ["Skill Self-Evolver", "Memory Compactor", EVOLVER_ID, COMPACTOR_ID, "/memory_compactor", "/skill_self_evolver"]) {
        expect(called, `list_available_agents names no ${retired}`).not.toContain(retired);
      }
      const evidence = process.env.RRB_E2E_EVIDENCE;
      if (evidence) await fs.writeFile(evidence, `${JSON.stringify({ runId: created.runId, listAvailableAgentsResult: called }, null, 2)}\n`);
    } finally {
      socket.terminate();
      await server.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: created.runId }).catch(() => undefined);
    }
  }, 240_000);

  it("RRB-2 starts on a data folder that never had them: both are skipped", async () => {
    await setupRoot();
    const studioRun = await studio();
    const record = await studioRun.migration();
    expect(record, JSON.stringify(record)).toMatchObject({ status: "SUCCEEDED", errorMessage: null });
    expect(record.summary).toBe("Scanned 2; migrated 0; skipped 2; failed 0.");
    const agents = await studioRun.agentIds();
    expect(agents).toContain("autobyteus-daily-assistant");
    expect(agents).not.toContain(EVOLVER_ID);
    expect(agents).not.toContain(COMPACTOR_ID);
  }, 120_000);
});
