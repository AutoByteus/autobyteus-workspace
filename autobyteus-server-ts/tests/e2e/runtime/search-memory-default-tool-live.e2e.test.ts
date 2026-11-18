import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MemorySearch, resetMemorySearchForTests } from "../../../src/memory-search/memory-search.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";
import { createFakeEmbeddingIndex } from "../../helpers/fake-embedding-model.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { agentStreamFramesOf } from "../helpers/agent-stream-frames.js";

/**
 * `search_memory` is given to every agent run (autobyteus-496: REQ-001..003, AC-001, AC-003, AC-004), through the real
 * Studio server (GraphQL definitions and runs, the agent WebSocket, the run's Agent Tools MCP endpoint), on a test-owned
 * data root. Every agent definition here has `toolNames: []`, so the tool can only come from the platform.
 *
 * Per runtime (`SM-<runtime>`):
 *  - an earlier run of the agent is told a unique codeword; the user builds the memory index (`startMemoryIndexing`,
 *    the Memory page's Index now);
 *  - a new run of the same definition calls `search_memory` for the codeword: the call succeeds and its result names
 *    the earlier run;
 *  - after the asking run's own turn (which holds the codeword too) is indexed, a second call still leaves the asking
 *    run out and still names the earlier run (the tool's behavior, unchanged).
 * Scripted AGY only (no model; it calls tools on request, `LIST_TOOLS` / `CALL_TOOL:` in its `linked_skills` case):
 *  - SM-agy-list: the run's real Agent Tools MCP `tools/list` has `search_memory` exactly once, both for a definition
 *    without it and for one that lists it;
 *  - SM-agy-upgrade (AC-003): a run whose seen-tool-names record was written before this build (the same
 *    `{version: 1, toolNames}` record without `search_memory`, written while the run is stopped) is restored; its
 *    first input carries "Now available: search_memory." once, the second carries no notice, the record is rewritten
 *    and the tool works.
 *
 * Only the embedding model is the deterministic stand-in (tests/helpers/fake-embedding-model.ts), so nothing is
 * downloaded; the text search, the tool and its adapter are the product's.
 *
 * Gate: SEARCH_MEMORY_LIVE_E2E=<runtime> (one runtime per run; a skip is not a pass):
 *   agy        (no model) ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs,
 *              HOME = a throwaway folder
 *   autobyteus (paid) AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault; SEARCH_MEMORY_E2E_NATIVE_PROVIDER (default DEEPSEEK)
 *              and SEARCH_MEMORY_E2E_MODEL (default deepseek-v4-flash)
 *   claude     (paid, host login: real HOME, USER, LOGNAME) SEARCH_MEMORY_E2E_MODEL (default haiku)
 *   codex      (paid, host login) SEARCH_MEMORY_E2E_MODEL (default gpt-6.1-terra, effort medium)
 *   grok       (paid, host login) SEARCH_MEMORY_E2E_MODEL (default grok-4.7, else the first offered)
 * Optional: SEARCH_MEMORY_E2E_EVIDENCE_DIR=<dir> writes search-memory-<runtime>.json (tool lists, calls, results,
 * notices); SEARCH_MEMORY_E2E_STEP_TIMEOUT_MS (default 240000).
 * Command:
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" SEARCH_MEMORY_LIVE_E2E=<runtime> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts --no-watch
 */
type Runtime = "agy" | "autobyteus" | "claude" | "codex" | "grok";
type Entry = { kind: string; role?: string | null; content?: string | null; toolName?: string; toolResult?: unknown;
  toolError?: string | null; senderId?: string | null };
type Wire = { type: string; payload: Record<string, unknown> };

const TOOL = "search_memory";
const runtime = (process.env.SEARCH_MEMORY_LIVE_E2E?.trim() ?? "") as Runtime | "";
const KIND: Record<Runtime, RuntimeKind> = { agy: RuntimeKind.ANTIGRAVITY_CLI, autobyteus: RuntimeKind.AUTOBYTEUS,
  claude: RuntimeKind.CLAUDE_AGENT_SDK, codex: RuntimeKind.CODEX_APP_SERVER, grok: RuntimeKind.GROK_BUILD };
const COMMAND: Record<Runtime, string> = { agy: process.env.ANTIGRAVITY_CLI_COMMAND?.trim() ?? "", autobyteus: "",
  claude: "claude", codex: "codex", grok: process.env.GROK_BUILD_COMMAND?.trim() || "grok" };
const commandReady = (command: string) => !command || spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const enabled = runtime !== "" && runtime in KIND && commandReady(COMMAND[runtime as Runtime]);
const suite = enabled ? describe : describe.skip;
const scripted = runtime === "agy";
const NATIVE_PROVIDER = process.env.SEARCH_MEMORY_E2E_NATIVE_PROVIDER?.trim() || "DEEPSEEK";
const MODEL_PREFERENCE: Record<Runtime, string> = { agy: "gemini-3.8-flash-low", autobyteus: "deepseek-v4-flash",
  claude: "haiku", codex: "gpt-6.1-terra", grok: "grok-4.7" };
const LLM_CONFIG: Partial<Record<Runtime, Record<string, unknown>>> = { codex: { reasoning_effort: "medium" } };
const STEP_TIMEOUT_MS = Number(process.env.SEARCH_MEMORY_E2E_STEP_TIMEOUT_MS || 240_000);
const EVIDENCE_DIR = process.env.SEARCH_MEMORY_E2E_EVIDENCE_DIR?.trim() || "";
// One word the text index keeps whole; unique per suite run.
const CODEWORD = `quokka${Math.floor(100000 + Math.random() * 900000)}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTool = (entry: Entry, name: string) => entry.kind === "tool_call" && Boolean(entry.toolName)
  && (entry.toolName === name || entry.toolName!.endsWith(`__${name}`) || entry.toolName!.endsWith(`.${name}`));
const resultText = (value: unknown) => typeof value === "string" ? value : JSON.stringify(value ?? "");
const notices = (entries: Entry[]) => entries.filter((entry) => entry.kind === "system_task_notification"
  && (entry.senderId === "system.tool_list_update_notifier" || (entry.content ?? "").startsWith("[Platform notice — tools updated]")));

/** The run's memory folder: the folder named by the run ID that holds its raw traces. */
const findRunMemoryDir = async (root: string, runId: string): Promise<string | null> => {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  if (path.basename(root) === runId && entries.some((entry) => entry.name === "raw_traces_active.jsonl")) return root;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findRunMemoryDir(path.join(root, entry.name), runId);
    if (found) return found;
  }
  return null;
};

suite(`search_memory given to every agent run, on ${runtime || "<runtime>"} (real server, isolated data)`, () => {
  let dataDir = "", app: FastifyInstance | undefined, url!: URL, model = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];
  const evidence: Record<string, unknown> = { runtime, codeword: CODEWORD, cases: {} as Record<string, unknown> };
  const record = (key: string, value: unknown) => { (evidence.cases as Record<string, unknown>)[key] = value; };

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const conversation = async (runId: string): Promise<Entry[]> =>
    ((await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? []) as Entry[];
  const until = async (check: () => boolean | Promise<boolean>, label: string, ms = STEP_TIMEOUT_MS) => {
    const deadline = Date.now() + ms;
    while (!(await check())) {
      if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
      await wait(500);
    }
  };

  const pickModel = async (): Promise<string> => {
    const kind = KIND[runtime as Runtime];
    if (runtime === "autobyteus") {
      await graphql("mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }",
        { p: NATIVE_PROVIDER, r: kind });
    }
    const available = (await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($r: String) { providerModelCatalogSnapshots(runtimeKind: $r) { llmModels { modelIdentifier } } }", { r: kind }))
      .providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((m) => m.modelIdentifier));
    const fragment = process.env.SEARCH_MEMORY_E2E_MODEL?.trim() || MODEL_PREFERENCE[runtime as Runtime];
    const chosen = available.find((id) => id === fragment) ?? available.find((id) => id.includes(fragment))
      ?? (runtime === "grok" ? available[0] : undefined);
    expect(chosen, `${runtime} model '${fragment}' among: ${available.join(", ")}`).toBeTruthy();
    return chosen!;
  };

  const createDefinition = async (label: string, toolNames: string[]) => (await graphql<{ createAgentDefinition: { id: string } }>(
    "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name: `search-memory-${label}-${randomUUID().slice(0, 6)}`, role: "assistant", category: "runtime-e2e",
      description: "autobyteus-496 live check: search_memory for every agent", toolNames,
      instructions: "Follow the user's request exactly. Use only the tools named in the request. Keep replies short." } }))
    .createAgentDefinition.id;

  /** Starts a run of the definition with an open agent stream; `send` waits for the turn to end and returns its new entries. */
  const startRun = async (definitionId: string, label: string) => {
    const workspace = path.join(dataDir, `workspace-${label}`);
    await fs.mkdir(workspace, { recursive: true });
    const created = (await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: model,
        llmConfig: LLM_CONFIG[runtime as Runtime] ?? null, autoExecuteTools: true, runtimeKind: KIND[runtime as Runtime] } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId!;
    runIds.push(runId);
    return { runId, ...(await connect(runId)) };
  };
  const connect = async (runId: string) => {
    const frames: Wire[] = [];
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try { frames.push(...agentStreamFramesOf(JSON.parse(String(raw)))); } catch { /* diagnostics only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "agent stream connected", 30_000);
    const turnsEnded = () => frames.filter((frame) => frame.type === "TURN_COMPLETED" || frame.type === "TURN_INTERRUPTED").length;
    const send = async (content: string): Promise<Entry[]> => {
      const before = (await conversation(runId)).length;
      const ended = turnsEnded();
      const errorsBefore = frames.filter((frame) => frame.type === "ERROR").length;
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      await until(() => turnsEnded() > ended || frames.filter((frame) => frame.type === "ERROR").length > errorsBefore, "turn end");
      expect(frames.filter((frame) => frame.type === "ERROR").slice(errorsBefore).map((frame) => frame.payload), "runtime errors").toEqual([]);
      await wait(1_500);
      return (await conversation(runId)).slice(before);
    };
    return { socket, frames, send };
  };
  const replies = (entries: Entry[]) => entries.filter((entry) => entry.kind === "message" && entry.role !== "user")
    .map((entry) => entry.content ?? "").join("\n");

  const buildIndex = async () => {
    expect((await graphql<{ startMemoryIndexing: boolean }>("mutation { startMemoryIndexing }")).startMemoryIndexing).toBe(true);
    await until(async () => (await graphql<{ memoryIndexStatus: { state: string } }>("{ memoryIndexStatus { state } }"))
      .memoryIndexStatus.state === "READY", "memory index READY", 60_000);
  };
  /** The user's Memory page search (no asking run): waits until the run's journal is indexed and found. */
  const waitIndexed = async (runId: string) => until(async () => (await graphql<{ memorySearch: { results: Array<{ runId: string }> } }>(
    "query($q: String!) { memorySearch(query: $q, limit: 20) { results { runId } } }", { q: CODEWORD }))
    .memorySearch.results.some((result) => result.runId === runId), `run ${runId} indexed`, 90_000);

  /** One `search_memory` call through the runtime; returns the result text the agent received. */
  const searchThroughAgent = async (send: (content: string) => Promise<Entry[]>, label: string): Promise<string> => {
    if (scripted) {
      const entries = await send(`CALL_TOOL:${JSON.stringify({ name: TOOL, arguments: { query: CODEWORD } })}`);
      const reply = replies(entries);
      record(label, { entries, reply });
      expect(reply, "the scripted agent called the tool").toContain("CALLED:");
      expect(reply).not.toMatch(/"isError":true/);
      return reply;
    }
    const entries = await send([
      `Call the ${TOOL} tool exactly once with the query "${CODEWORD}". Do not call any other tool.`,
      "Then reply with SEARCHED followed by the runId of every result, or SEARCHED NONE when there is no result.",
    ].join(" "));
    const calls = entries.filter((entry) => isTool(entry, TOOL));
    record(label, { calls, reply: replies(entries) });
    expect(calls.length, `${TOOL} called; entries: ${JSON.stringify(entries).slice(0, 3000)}`).toBeGreaterThan(0);
    const succeeded = calls.filter((call) => !call.toolError);
    expect(succeeded.length, `${TOOL} succeeded: ${JSON.stringify(calls).slice(0, 3000)}`).toBeGreaterThan(0);
    return succeeded.map((call) => resultText(call.toolResult)).join("\n");
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "search-memory-live-e2e-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    if (scripted) process.env.AGY_FAKE_CASE = "linked_skills";
    // Provider keys come from the test vault when AUTOBYTEUS_TEST_VAULT is set (never from the environment).
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    // The node's memory search over this data root, with the deterministic embedding stand-in; started as the
    // server's startup step does (it follows journal changes).
    const fake = await createFakeEmbeddingIndex({ filesPresent: true, rootDir: path.join(dataDir, "embeddings-fake") });
    const memory = new MemorySearch({ appDataDir: appConfigProvider.config.getAppDataDir(),
      memoryDir: appConfigProvider.config.getMemoryDir(), embeddings: () => fake.index, activeModelId: () => "fake-model-a" });
    resetMemorySearchForTests(memory);
    memory.start();
    model = await pickModel();
    evidence.model = model;
  }, 180_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    if (app) {
      for (const runId of runIds) {
        await graphql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
      }
      await app.close();
    }
    await closeLiveServerVault();
    resetMemorySearchForTests(null);
    delete process.env.AGY_FAKE_CASE;
    if (EVIDENCE_DIR) {
      await fs.mkdir(EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(EVIDENCE_DIR, `search-memory-${runtime}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
    }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it(`SM-${runtime}: a run of a definition without ${TOOL} finds an earlier run and leaves itself out`, async (context) => {
    if (runtime === "autobyteus") await requireLiveCapability(context, `provider.${NATIVE_PROVIDER.toLowerCase()}.api-key`);
    const definitionId = await createDefinition("plain", []);
    const definition = (await graphql<{ agentDefinition: { toolNames: string[] } }>(
      "query($id: String!) { agentDefinition(id: $id) { toolNames } }", { id: definitionId })).agentDefinition;
    expect(definition.toolNames, "the definition does not list the tool").not.toContain(TOOL);

    const earlier = await startRun(definitionId, "earlier");
    await earlier.send(`For the record: the lighthouse renovation codename is ${CODEWORD}. Reply with exactly: NOTED`);
    await buildIndex();
    await waitIndexed(earlier.runId);

    const asking = await startRun(definitionId, "asking");
    const first = await searchThroughAgent(asking.send, "first search");
    expect(first, "the result names the earlier run").toContain(earlier.runId);
    expect(first, "the result shows the earlier run's line").toContain(CODEWORD);

    // The asking run's own journal now holds the codeword too; once it is indexed, a search still leaves it out.
    await waitIndexed(asking.runId);
    const second = await searchThroughAgent(asking.send, "second search");
    expect(second, "the earlier run is still found").toContain(earlier.runId);
    expect(second, "the asking run is left out").not.toContain(asking.runId);
    record("runs", { definitionToolNames: definition.toolNames, earlier: earlier.runId, asking: asking.runId });
  }, STEP_TIMEOUT_MS * 4 + 240_000);

  it.runIf(scripted)("SM-agy-list: the run's Agent Tools MCP tools/list has search_memory once, listed or not", async () => {
    const toolsOf = async (toolNames: string[], label: string) => {
      const run = await startRun(await createDefinition(label, toolNames), label);
      const reply = replies(await run.send("LIST_TOOLS"));
      expect(reply).toMatch(/^TOOLS:/);
      const names = (JSON.parse(reply.slice("TOOLS:".length)) as Array<{ name: string }>).map((tool) => tool.name);
      record(`tools/list ${label}`, { toolNames, listed: names });
      return names;
    };
    const plain = await toolsOf([], "list-plain");
    expect(plain.filter((name) => name === TOOL)).toEqual([TOOL]);
    const listing = await toolsOf([TOOL, "list_projects"], "list-listing");
    expect(listing.filter((name) => name === TOOL)).toEqual([TOOL]);
    expect(listing).toContain("list_projects");
  }, STEP_TIMEOUT_MS * 2 + 60_000);

  it.runIf(scripted)("SM-agy-upgrade: a run from before this build, restored, hears the notice once and has the tool", async () => {
    const definitionId = await createDefinition("upgrade", []);
    const run = await startRun(definitionId, "upgrade");
    await run.send("Hello before the upgrade.");
    const memoryDir = await findRunMemoryDir(appConfigProvider.config.getMemoryDir(), run.runId);
    expect(memoryDir, "run memory folder").toBeTruthy();
    const seenFile = path.join(memoryDir!, "seen_tool_names.json");
    const current = JSON.parse(await fs.readFile(seenFile, "utf8")) as { version: number; toolNames: string[] };
    expect(current.toolNames).toContain(TOOL);

    expect((await graphql<{ terminateAgentRun: { success: boolean } }>(
      "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: run.runId })).terminateAgentRun.success).toBe(true);
    run.socket.terminate();
    // The record the previous build wrote for this run: the same structure, without the platform-given tool.
    const before = { version: current.version, toolNames: current.toolNames.filter((name) => name !== TOOL) };
    await fs.writeFile(seenFile, `${JSON.stringify(before)}\n`);

    const restored = (await graphql<{ restoreAgentRun: { success: boolean; message: string; runId: string } }>(
      "mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message runId } }", { id: run.runId })).restoreAgentRun;
    expect(restored, restored.message).toMatchObject({ success: true, runId: run.runId });
    const reopened = await connect(run.runId);
    const firstEntries = await reopened.send("ECHO_INPUT first after the upgrade");
    const firstInput = replies(firstEntries);
    const secondEntries = await reopened.send("ECHO_INPUT second after the upgrade");
    const secondInput = replies(secondEntries);
    const rewritten = JSON.parse(await fs.readFile(seenFile, "utf8")) as { version: number; toolNames: string[] };
    const call = replies(await reopened.send(`CALL_TOOL:${JSON.stringify({ name: TOOL, arguments: { query: "upgrade" } })}`));
    record("upgrade", { seenBefore: before, seenAfter: rewritten, firstInput, firstNotices: notices(firstEntries),
      secondInput, secondNotices: notices(secondEntries), call });

    const firstText = `${firstInput}\n${notices(firstEntries).map((entry) => entry.content).join("\n")}`;
    expect(firstText.split(`Now available: ${TOOL}.`).length - 1, "the notice once at the first input").toBeGreaterThanOrEqual(1);
    expect(firstInput.split(`Now available: ${TOOL}.`).length - 1, "the notice once in the runtime input").toBe(1);
    expect(secondInput, "no notice at the second input").not.toContain("Now available");
    expect(notices(secondEntries)).toEqual([]);
    expect(rewritten.toolNames, "the record is rewritten").toContain(TOOL);
    expect(call).toContain("CALLED:");
    expect(call).not.toMatch(/"isError":true/);
  }, STEP_TIMEOUT_MS * 4 + 60_000);
});
