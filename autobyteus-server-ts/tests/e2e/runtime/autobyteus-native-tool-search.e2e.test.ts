/**
 * Native tool search through the real studio server (autobyteus-515: AC-001, AC-003, AC-005, REQ-006, DS-003), with
 * tools not auto-executed, the way the desktop app drives a run: GraphQL definitions and runs, the agent WebSocket
 * (send, tool approval), definition saves (324 live tool updates), stop and restore, and the run's history projection.
 *
 * No provider credits. A synthetic test vault holds a synthetic Anthropic key, and `globalThis.fetch` answers Anthropic
 * `POST /v1/messages` from a script: each request takes the next scripted reply (a `search_tools` call, a `call_tool`
 * call, or a text). Every request body is recorded exactly as the server built it. Other requests go to the real fetch.
 *
 * One run, in this order (the agent definition lists `list_projects`; the server adds the base tools and `search_memory`):
 *   NTS-E2E-001  search, then call a found tool, in approval mode: `search_tools` asks approval (FU-004), the found
 *                tool's approval names `list_projects` with its arguments (never `call_tool`), the tool card's END names
 *                it, it runs, and its result reaches the model; the model's own `call_tool` form is what the next request
 *                replays. Requests carry the four base tools + `search_tools` + `call_tool`, and the search tool's
 *                description names the searchable tools (AC-001, AC-003, DS-002/DS-003).
 *   NTS-E2E-002  stop and restore, then call again: every request's tools and system prompt are byte-identical to the
 *                first request's (REQ-006 across a restore).
 *   NTS-E2E-003  the definition adds `list_project_tasks` (324): the notice names it, the model calls it through
 *                `call_tool`, and the request's tools and system prompt are still byte-identical (AC-005).
 *   NTS-E2E-004  the definition removes `list_projects`: the notice says so, a call of it is refused ("not found or
 *                configured"), and the tools are still byte-identical (AC-005).
 *   NTS-E2E-005  run history (the projection the app shows) names the real tools with their results, never `call_tool`
 *                (DS-003: raw traces hold the real tool).
 *
 * Run with a clean environment (TESTING.md), from the repository root:
 *   env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run \
 *     tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts --no-watch
 * Optional: NATIVE_TOOL_SEARCH_E2E_EVIDENCE_DIR=<dir> writes native-tool-search-e2e.json (request summaries, approvals,
 * segment ends, history entries).
 */
import { testLaunchCredential } from "../../setup/test-launch-credential.js";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_VAULT_SETTING_NAME } from "autobyteus-ts/secrets/test-vault-setting.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveServerVault, initializeLiveServerVault } from "../../../../test-support/test-vault/live-server-vault.js";
import { createSyntheticTestVault } from "../../../../test-support/test-vault/synthetic-test-vault.js";
import { captureTestVaultSelection, capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

type Json = Record<string, unknown>;
type WsMessage = { type: string; payload: Json };
type Entry = { kind: string; role?: string | null; content?: string | null; toolName?: string; toolArgs?: unknown;
  toolResult?: unknown; toolError?: string | null };
type Reply = { tool: string; input: Json } | { text: string };

const MODEL = "claude-sonnet-5-5";
const ALPHA = "list_projects";
const BETA = "list_project_tasks";
const BASE_TOOLS = ["run_bash", "read_file", "edit_file", "write_file"];
const STEP_TIMEOUT_MS = 60_000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isRecord = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** A streamed Messages reply: one text block or one tool_use block. */
const cannedStream = (model: string, block: Json): string => {
  const isTool = block.type === "tool_use";
  const events: Array<[string, Json]> = [
    ["message_start", { type: "message_start", message: { id: `msg_${randomUUID()}`, type: "message", role: "assistant", model,
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: isTool ? { ...block, input: {} } : { type: "text", text: "" } }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta: isTool
      ? { type: "input_json_delta", partial_json: JSON.stringify(block.input) } : { type: "text_delta", text: String(block.text) } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: isTool ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } }],
    ["message_stop", { type: "message_stop" }],
  ];
  return events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
};

const toolNamesOf = (body: Json): string[] => ((body.tools ?? []) as Json[]).map((tool) => String(tool.name));
const lastMessageText = (body: Json): string => JSON.stringify(((body.messages ?? []) as Json[]).at(-1) ?? {});

describe("AutoByteus native tool search through the real server, tools not auto-executed (autobyteus-515)", () => {
  const originalFetch = globalThis.fetch;
  const previousTestVaultSetting = capturedTestVaultSetting();
  const bodies: Json[] = [];
  const script: Reply[] = [];
  const unscripted: string[] = [];
  const frames: WsMessage[] = [];
  const approvals: Array<{ toolName: string; arguments: unknown }> = [];
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  let dataDir = "";
  let workspaceRootPath = "";
  let definitionId = "";
  let projectId = "";
  let runId = "";
  let socket: WebSocket | null = null;

  const gql = async <T = any>(query: string, variables: Json = {}): Promise<T> => {
    const response = await originalFetch(new URL("/graphql", mainUrl), {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${testLaunchCredential()}` },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  };
  const history = async (): Promise<Entry[]> =>
    ((await gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? []) as Entry[];
  const saveTools = async (toolNames: string[]) => {
    await gql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}`, { input: { id: definitionId, toolNames } });
    // The definition change signal applies the change to the run asynchronously.
    await wait(3_000);
  };
  const openSocket = async () => {
    socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    const opened = socket;
    opened.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type !== "string") return;
        const frame = { type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {} };
        frames.push(frame);
        // The user approves every tool, as in the app; the requests are recorded for the assertions.
        if (frame.type === "TOOL_APPROVAL_REQUESTED") {
          approvals.push({ toolName: String(frame.payload.tool_name), arguments: frame.payload.arguments });
          opened.send(JSON.stringify({ type: "APPROVE_TOOL", payload: { invocation_id: frame.payload.invocation_id, reason: "approved by e2e" } }));
        }
      } catch { /* not a frame */ }
    });
    await new Promise<void>((resolve, reject) => { opened.once("open", () => resolve()); opened.once("error", reject); });
    const connectedFrom = frames.length;
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    while (!frames.slice(connectedFrom).some((frame) => frame.type === "CONNECTED") && Date.now() < deadline) await wait(50);
  };
  /** One user turn: sends `content` with `replies` scripted, waits for the final text `marker` in history. */
  const turn = async (content: string, replies: Reply[], marker: string) => {
    expect(script, "previous turn consumed its script").toEqual([]);
    script.push(...replies);
    const requestsBefore = bodies.length;
    const framesBefore = frames.length;
    const approvalsBefore = approvals.length;
    const entriesBefore = (await history()).length;
    sendE2eSendMessageCommand(socket!, { agent_run_id: runId, content });
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    let entries: Entry[] = [];
    for (;;) {
      entries = (await history()).slice(entriesBefore);
      if (entries.some((entry) => entry.kind === "message" && entry.role !== "user" && (entry.content ?? "").includes(marker))) break;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${marker}: ${JSON.stringify({ entries, unscripted }).slice(0, 3000)}`);
      await wait(250);
    }
    while (!frames.slice(framesBefore).some((frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle")
      && Date.now() < deadline) await wait(100);
    return { requests: bodies.slice(requestsBefore), frames: frames.slice(framesBefore), approvals: approvals.slice(approvalsBefore), entries };
  };
  const segmentEndToolNames = (turnFrames: WsMessage[]) => turnFrames
    .filter((frame) => frame.type === "SEGMENT_END" && isRecord(frame.payload.metadata) && frame.payload.metadata.tool_name)
    .map((frame) => String((frame.payload.metadata as Json).tool_name));

  beforeAll(async () => {
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.hostname !== "api.anthropic.com" || url.pathname !== "/v1/messages") return originalFetch(input, init);
      const raw = init?.body ?? (input instanceof Request ? await input.clone().text() : null);
      const body = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer)) as Json;
      bodies.push(body);
      const reply = script.shift();
      if (!reply) unscripted.push(lastMessageText(body).slice(0, 500));
      const block = reply && "tool" in reply
        ? { type: "tool_use", id: `toolu_${randomUUID().replace(/-/g, "")}`, name: reply.tool, input: reply.input }
        : { type: "text", text: reply?.text ?? "UNSCRIPTED" };
      return new Response(cannedStream(String(body.model), block), { status: 200, headers: { "content-type": "text/event-stream" } });
    }) as typeof fetch;

    dataDir = await mkdtemp(path.join(os.tmpdir(), "native-tool-search-e2e-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const vault = createSyntheticTestVault(path.join(dataDir, "synthetic-test-vault"),
      { "provider.anthropic.api-key": "synthetic-anthropic-key-for-native-tool-search-e2e" });
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: vault.directory });
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
    workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "native-tool-search-e2e-ws-"));

    await gql("mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }",
      { p: "ANTHROPIC", r: "autobyteus" });
    projectId = (await gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Tool Search E2E ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
    definitionId = (await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `native-tool-search-${randomUUID().slice(0, 8)}`, role: "assistant", description: "Native tool search check.",
        instructions: "Use your tools as asked.", category: "runtime-e2e", toolNames: [ALPHA], skillNames: [] } })).createAgentDefinition.id;
    const created = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath, llmModelIdentifier: MODEL, autoExecuteTools: false,
        runtimeKind: "autobyteus", llmConfig: null } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    runId = created.createAgentRun.runId!;
    await openSocket();
  }, 180_000);

  afterAll(async () => {
    socket?.terminate();
    if (runId) await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
    const evidenceDir = process.env.NATIVE_TOOL_SEARCH_E2E_EVIDENCE_DIR;
    if (evidenceDir) {
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(path.join(evidenceDir, "native-tool-search-e2e.json"), `${JSON.stringify({
        requests: bodies.map((body) => ({ tools: toolNamesOf(body), toolsBytes: JSON.stringify(body.tools).length,
          systemBytes: JSON.stringify(body.system ?? null).length, lastMessage: lastMessageText(body).slice(0, 1500) })),
        approvals, unscripted,
        segmentEnds: frames.filter((frame) => frame.type === "SEGMENT_END").map((frame) => frame.payload.metadata),
        history: runId ? await history().catch(() => []) : [],
      }, null, 2)}\n`, "utf-8");
    }
    await app?.close();
    app = null;
    await closeLiveServerVault();
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: previousTestVaultSetting ?? "" });
    globalThis.fetch = originalFetch;
    for (const dir of [workspaceRootPath, dataDir]) if (dir) await rm(dir, { recursive: true, force: true });
  }, 120_000);

  it("NTS-E2E-001…005: search and call a found tool with approval, restore, add and remove a tool; history names the real tools", async () => {
    // NTS-E2E-001: search, approve, call the found tool through call_tool, approve the real tool.
    const first = await turn(`List the projects.`, [
      { tool: "search_tools", input: { query: ALPHA } },
      { tool: "call_tool", input: { name: ALPHA, arguments: {} } },
      { text: "DONE-1" },
    ], "DONE-1");
    expect(first.requests).toHaveLength(3);
    const firstRequest = first.requests[0]!;
    expect(toolNamesOf(firstRequest)).toEqual([...BASE_TOOLS, "search_tools", "call_tool"]);
    const searchDescription = String(((firstRequest.tools as Json[]).find((tool) => tool.name === "search_tools"))?.description);
    expect(searchDescription).toMatch(new RegExp(`Searchable tools: [^.]*\\b${ALPHA}\\b`));
    expect(searchDescription).toMatch(/Searchable tools: [^.]*\bsearch_memory\b/);
    // The search result reaches the model with list_projects' full definition.
    expect(lastMessageText(first.requests[1]!)).toContain("tool_result");
    expect(lastMessageText(first.requests[1]!)).toContain(`\\"name\\":\\"${ALPHA}\\"`);
    // Approvals: search_tools first (FU-004), then the real tool with its arguments, never call_tool.
    expect(first.approvals.map((approval) => approval.toolName)).toEqual(["search_tools", ALPHA]);
    expect(first.approvals[1]!.arguments ?? {}).toEqual({});
    expect(segmentEndToolNames(first.frames)).toEqual(["search_tools", ALPHA]);
    expect(first.frames.some((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED" && frame.payload.tool_name === ALPHA)).toBe(true);
    // The next request replays the model's own call_tool form and carries the tool's real result.
    const replayed = ((first.requests[2]!.messages as Json[]).at(-2)?.content ?? []) as Json[];
    expect(replayed.find((block) => block.type === "tool_use")).toMatchObject({ name: "call_tool", input: { name: ALPHA, arguments: {} } });
    expect(lastMessageText(first.requests[2]!)).toContain(projectId);

    const tools = JSON.stringify(firstRequest.tools);
    const system = JSON.stringify(firstRequest.system ?? null);
    const expectSameTools = (requests: Json[]) => {
      for (const request of requests) {
        expect(JSON.stringify(request.tools)).toBe(tools);
        expect(JSON.stringify(request.system ?? null)).toBe(system);
      }
    };
    expectSameTools(first.requests);

    // NTS-E2E-002: stop and restore; the restored run sends the same tools and system prompt.
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId });
    const restored = await gql(`mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message runId } }`, { id: runId });
    expect(restored.restoreAgentRun.success, restored.restoreAgentRun.message).toBe(true);
    const second = await turn("List the projects again.", [
      { tool: "call_tool", input: { name: ALPHA, arguments: {} } },
      { text: "DONE-2" },
    ], "DONE-2");
    expect(second.approvals.map((approval) => approval.toolName)).toEqual([ALPHA]);
    expect(lastMessageText(second.requests.at(-1)!)).toContain(projectId);
    expectSameTools(second.requests);

    // NTS-E2E-003: the definition adds a tool; the notice names it; the tools are unchanged; the model calls it.
    await saveTools([ALPHA, BETA]);
    const third = await turn(`List the tasks of project ${projectId}.`, [
      { tool: "call_tool", input: { name: BETA, arguments: { project_id: projectId } } },
      { text: "DONE-3" },
    ], "DONE-3");
    expect(JSON.stringify(third.requests[0]!.messages)).toContain(`Now available: ${BETA}.`);
    expect(third.approvals).toEqual([{ toolName: BETA, arguments: { project_id: projectId } }]);
    expect(third.frames.some((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED" && frame.payload.tool_name === BETA)).toBe(true);
    expectSameTools(third.requests);

    // NTS-E2E-004: the definition removes a tool; a call of it is refused; the tools are unchanged.
    await saveTools([BETA]);
    const fourth = await turn("List the projects once more.", [
      { tool: "call_tool", input: { name: ALPHA, arguments: {} } },
      { text: "DONE-4" },
    ], "DONE-4");
    expect(JSON.stringify(fourth.requests[0]!.messages)).toContain(`No longer available: ${ALPHA}.`);
    expect(lastMessageText(fourth.requests.at(-1)!)).toContain(`Tool '${ALPHA}' not found or configured`);
    expect(fourth.frames.some((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED" && frame.payload.tool_name === ALPHA)).toBe(false);
    expectSameTools(fourth.requests);
    expect(unscripted, "every request was scripted").toEqual([]);

    // NTS-E2E-005: run history names the real tools with their results, never call_tool.
    const toolEntries = (await history()).filter((entry) => entry.kind === "tool_call");
    expect(toolEntries.map((entry) => entry.toolName)).toEqual(["search_tools", ALPHA, ALPHA, BETA, ALPHA]);
    expect(JSON.stringify(toolEntries[1]!.toolResult)).toContain(projectId);
    expect(toolEntries[3]!.toolArgs).toMatchObject({ project_id: projectId });
    expect(toolEntries[4]!.toolError ?? JSON.stringify(toolEntries[4]!.toolResult)).toContain("not found or configured");
  }, 300_000);
});
