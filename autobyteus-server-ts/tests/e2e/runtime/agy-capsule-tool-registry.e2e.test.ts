import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import {
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// The capsule tool allowlist against the CLI's registry on the BUILT server (agy-capsule-tools-and-spill-shapes, autobyteus-588, AC-002, AC-003).
// The capsule's `tools:` allowlist stays the CLI's eight registry names; a start whose `init.tools` lacks one of them logs one
// `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<id> names=<list>` warning and never fails.
//   CR-01..03 (scripted CLI, gate RUN_AGY_FAILURE_E2E=1 + ANTIGRAVITY_CLI_COMMAND): `init.tools` lacking one name -> one warning naming it, the run answers;
//             all eight present -> no warning; no `tools` field -> no warning. (AGY_FAKE_INIT_TOOLS drives the scripted init message.)
//   CR-04 (REAL agy, gate RUN_AGY_CAPSULE_TOOLS_LIVE_E2E=1, host login, real HOME/USER/LOGNAME): no warning, and the agent reads, writes, edits
//         and runs a command with the capsule the server wrote. Adds synthetic conversations to the user's agy history.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs \
//   pnpm exec vitest run tests/e2e/runtime/agy-capsule-tool-registry.e2e.test.ts --no-watch
const FAKE = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const BUILT = existsSync(path.resolve("dist/app.js"));
const SCRIPTED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE) && existsSync(FAKE) && spawnSync(FAKE, ["--version"], { stdio: "ignore" }).status === 0 && BUILT;
const LIVE = process.env.RUN_AGY_CAPSULE_TOOLS_LIVE_E2E === "1" && spawnSync("agy", ["--version"], { stdio: "ignore" }).status === 0 && BUILT;
const AGY = "antigravity_cli";
const REGISTRY = ["view_file", "write_to_file", "replace_file_content", "grep_search", "list_dir", "find_by_name", "run_command", "generate_image"];
type Json = Record<string, any>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check: () => boolean | Promise<boolean>, label: string, ms = 60_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await check()) return; await wait(100); }
  throw new Error(`Timed out: ${label}`);
};
const findDir = (base: string, name: string, depth = 0): string | null => {
  if (depth > 6 || !existsSync(base)) return null;
  for (const entry of readdirSync(base)) {
    const full = path.join(base, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === name) return full;
    const nested = findDir(full, name, depth + 1);
    if (nested) return nested;
  }
  return null;
};

type Started = Awaited<ReturnType<typeof startBuiltTestServer>>;
const session = async (environment: Record<string, string | undefined>, label: string, model: (ids: string[]) => string) => {
  const suffix = `agy-capsule-${label}-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  const workspace = path.join(runtimeRoot, "workspace");
  await fs.mkdir(path.join(runtimeRoot, "isolated-home"), { recursive: true });
  await fs.mkdir(workspace, { recursive: true });
  const server: Started = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl, environment });
  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server.serverUrl, query, variables);
  const models = (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
    "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: AGY }))
    .providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier));
  const definition = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", { input: {
    name: `capsule ${randomUUID().slice(0, 6)}`, role: "assistant", description: "capsule tool registry", category: "runtime-e2e", toolNames: [],
    instructions: "Do exactly what the user asks with your own file and shell tools in the workspace. Keep replies to one word." } })).createAgentDefinition.id as string;
  const sockets: WebSocket[] = [];
  const run = async () => {
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", { input: {
      agentDefinitionId: definition, runtimeKind: AGY, llmModelIdentifier: model(models), llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    return created.runId as string;
  };
  const turn = async (runId: string, content: string) => {
    const messages: Json[] = [];
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(server.serverUrl).port}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (data: unknown) => { try { messages.push(JSON.parse(String(data)) as Json); } catch { /* diagnostic rows only */ } });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED"), "CONNECTED", 120_000);
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    await until(() => messages.some((m) => ["TURN_COMPLETED", "TURN_INTERRUPTED", "ERROR"].includes(m.type)), "turn end", 240_000);
    expect(messages.filter((m) => m.type === "ERROR").map((m) => m.payload), "errors").toEqual([]);
    await wait(800);
    socket.close();
  };
  const warnings = () => (server.output().match(/AGY_CAPSULE_TOOL_NOT_IN_REGISTRY[^\n]*/g) ?? []);
  const stop = async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    try { await server.stop(); } finally { await removeOwnedTestRuntime(runtimeRoot, database); }
  };
  return { run, turn, warnings, stop, workspace, runtimeRoot };
};

describe.runIf(SCRIPTED)("the capsule allowlist against the CLI's registry (scripted CLI, built server)", () => {
  const cases: Array<[string, string | undefined, string[]]> = [
    ["CR-01 a registry that lacks one allowlist name", JSON.stringify(REGISTRY.filter((name) => name !== "find_by_name")), ["find_by_name"]],
    ["CR-02 a registry that lists every allowlist name", JSON.stringify(REGISTRY), []],
    ["CR-03 an init message with no tools field", "ABSENT", []],
  ];
  for (const [title, initTools, missing] of cases) {
    it(`${title}: ${missing.length ? "one warning naming it" : "no warning"}, and the run answers`, async () => {
      const s = await session({ HOME: undefined, ANTIGRAVITY_CLI_COMMAND: FAKE, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_INIT_TOOLS: initTools }, title.slice(0, 5).toLowerCase(), (ids) => ids.find((id) => id.includes("flash-low")) ?? ids[0]!);
      try {
        const runId = await s.run();
        await s.turn(runId, "ECHO_INPUT");
        const mine = s.warnings().filter((line) => line.includes(`run=${runId}`));
        if (missing.length) {
          expect(mine, "exactly one warning for this run").toHaveLength(1);
          expect(mine[0]).toBe(`AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=${runId} names=${missing.join(",")}`);
        } else expect(mine, "no warning").toEqual([]);
        const dir = findDir(path.join(s.runtimeRoot, "memory", "agents"), runId)!;
        expect(readFileSync(path.join(dir, "raw_traces_active.jsonl"), "utf8"), "the run answered").toContain("ECHO:");
      } finally { await s.stop(); }
    }, 300_000);
  }
});

describe.runIf(LIVE)("the capsule the server writes starts the real agy with its tools (live)", () => {
  it("CR-04: no warning; the agent reads, writes, edits and runs a command", async () => {
    const s = await session({ HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME }, "live", (ids) => ids.find((id) => /low/.test(id)) ?? ids[0]!);
    try {
      await fs.writeFile(path.join(s.workspace, "a.txt"), "alpha\nbeta\n");
      const runId = await s.run();
      await s.turn(runId, "Use your read_file tool on a.txt, then use your edit_file tool to replace `beta` with `gamma` in a.txt, then use your write_file tool to create b.txt containing `bravo`, then use your run_command tool to run exactly: sh -c 'cat a.txt; exit 3'. Then reply DONE.");
      await until(async () => (await fs.readFile(path.join(s.workspace, "b.txt"), "utf8").catch(() => "")).includes("bravo"), "b.txt written", 60_000);
      expect(await fs.readFile(path.join(s.workspace, "a.txt"), "utf8"), "the edit was made").toBe("alpha\ngamma\n");
      const dir = findDir(path.join(s.runtimeRoot, "memory", "agents"), runId)!;
      const calls = readFileSync(path.join(dir, "raw_traces_active.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Json)
        .filter((r) => r.trace_type === "tool_call").map((r) => r.tool_name as string);
      process.stderr.write(`CR-04 tools used: ${[...new Set(calls)].join(",")}\n`);
      for (const name of ["read_file", "edit_file", "write_file", "run_command"]) expect(calls, `the agent called ${name}`).toContain(name);
      expect(s.warnings(), "no warning on the real CLI").toEqual([]);
    } finally { await s.stop(); }
  }, 600_000);
});
