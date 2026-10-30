import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// autobyteus-324: a running agent gets its new tool list when its definition changes, with its
// conversation kept, on a real runtime with a real model, through the real Studio server
// (GraphQL definition save, WebSocket input, Agent Tools MCP endpoint) on an isolated data root.
// The turn script: call alpha; add beta; call beta (and quote the first message); remove alpha;
// try alpha. alpha = list_projects, beta = list_project_tasks (side-effect free).
//
// Gate (spends the provider's credits):
//   RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=<runtime kind> LIVE_TOOL_LIST_MODEL=<model id>
// Runtime CLIs need their usual sign-in (see TESTING.md). AutoByteus data is a temp folder only.
// Optional LIVE_TOOL_LIST_EVIDENCE_DIR: writes live-tool-list-<runtime>.json.
const runtimeKind = process.env.LIVE_TOOL_LIST_RUNTIME ?? "";
const model = process.env.LIVE_TOOL_LIST_MODEL ?? "";
const enabled = process.env.RUN_LIVE_TOOL_LIST_E2E === "1" && Boolean(runtimeKind) && Boolean(model);
const suite = enabled ? describe : describe.skip;

const ALPHA = "list_projects";
const BETA = "list_project_tasks";
const CODEWORD = `OKAPI-${Math.floor(1000 + Math.random() * 9000)}`;
const TURN_TIMEOUT_MS = Number(process.env.LIVE_TOOL_LIST_TURN_TIMEOUT_MS ?? 240_000);

type Entry = { kind: string; role?: string | null; content?: string | null; toolName?: string; toolResult?: unknown;
  toolError?: string | null; senderId?: string | null };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTool = (entry: Entry, name: string) => entry.kind === "tool_call" && Boolean(entry.toolName)
  && (entry.toolName === name || entry.toolName!.endsWith(`__${name}`) || entry.toolName!.endsWith(`.${name}`));
const resultText = (entry: Entry) => `${entry.toolError ?? ""} ${typeof entry.toolResult === "string" ? entry.toolResult : JSON.stringify(entry.toolResult ?? "")}`;
const succeeded = (entry: Entry) => !entry.toolError && !/not enabled|unknown mcp tool|isError":true|"error"/i.test(resultText(entry));

suite(`live tool list update on ${runtimeKind || "<runtime>"} (real model, isolated data)`, () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  let socket: WebSocket | undefined;
  let definitionId = "", runId = "", projectId = "";
  const evidence: Record<string, unknown> = { runtimeKind, model, codeword: CODEWORD, turns: [] as unknown[] };

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const conversation = async (): Promise<Entry[]> =>
    ((await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? []) as Entry[];
  const saveTools = async (toolNames: string[]) => {
    await graphql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}`,
      { input: { id: definitionId, toolNames } });
    // The definition change signal applies the change to the run asynchronously.
    await wait(3_000);
  };
  const turn = async (label: string, content: string, marker: string) => {
    const before = (await conversation()).length;
    sendE2eSendMessageCommand(socket!, { agent_run_id: runId, content });
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    let entries: Entry[] = [];
    for (;;) {
      entries = (await conversation()).slice(before);
      const replied = entries.some((entry) => entry.kind === "message" && entry.role !== "user" && (entry.content ?? "").includes(marker));
      if (replied) break;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${marker}; got ${JSON.stringify(entries).slice(0, 3000)}`);
      await wait(1_000);
    }
    await wait(2_000);
    entries = (await conversation()).slice(before);
    (evidence.turns as unknown[]).push({ label, content, entries });
    return entries;
  };
  const notices = (entries: Entry[]) => entries.filter((entry) => entry.kind === "system_task_notification"
    && (entry.senderId === "system.tool_list_update_notifier" || (entry.content ?? "").startsWith("[Platform notice — tools updated]")));
  const userTexts = (entries: Entry[]) => entries.filter((entry) => entry.kind === "message" && entry.role === "user").map((entry) => entry.content ?? "");

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "live-tool-list-e2e-")));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Tool List Live ${suffix}` } })).createProject.projectId as string;
    definitionId = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`, { input: {
      name: `Tool List Live ${suffix}`, role: "assistant", description: "autobyteus-324 live tool list check",
      instructions: "Follow the user's request exactly. Use only the tools you have.", toolNames: [ALPHA],
    } })).createAgentDefinition.id as string;
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: {
      agentDefinitionId: definitionId, workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null,
      autoExecuteTools: true, runtimeKind,
    } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    runId = created.runId as string;
    socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    const frames: Array<{ type: string }> = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket!.once("open", resolve); socket!.once("error", reject); });
    const deadline = Date.now() + 30_000;
    while (!frames.some((frame) => frame.type === "CONNECTED")) {
      if (Date.now() > deadline) throw new Error("agent stream not connected");
      await wait(50);
    }
  }, 120_000);

  afterAll(async () => {
    socket?.terminate();
    if (runId) {
      evidence.terminate = await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })
        .catch((error) => String(error));
    }
    if (app) await app.close();
    const dir = process.env.LIVE_TOOL_LIST_EVIDENCE_DIR;
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `live-tool-list-${runtimeKind}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
    }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  it("call alpha; add beta; call beta with the conversation kept; remove alpha; alpha is refused", async () => {
    const first = await turn("1 call alpha",
      `Remember this codeword: ${CODEWORD}. Call the ${ALPHA} tool once, then reply with exactly: DONE-1`, "DONE-1");
    expect(first.filter((entry) => isTool(entry, ALPHA)).some(succeeded), "alpha works at the start").toBe(true);

    await saveTools([ALPHA, BETA]);
    const second = await turn("2 add beta, call beta",
      `Call the ${BETA} tool once with project_id "${projectId}". Then reply with DONE-2 followed by the codeword from my first message.`,
      "DONE-2");
    expect(second.filter((entry) => isTool(entry, BETA)).some(succeeded), "beta works after it was added").toBe(true);
    expect(notices(second).map((entry) => entry.content).join("\n")).toContain(`Now available: ${BETA}.`);
    expect(second.filter((entry) => entry.kind === "message" && entry.role !== "user").map((entry) => entry.content).join("\n"),
      "the conversation was kept").toContain(CODEWORD);
    expect(userTexts(second).join("\n")).toContain(`Call the ${BETA} tool once`);

    await saveTools([BETA]);
    const third = await turn("3 remove alpha, try alpha",
      `Try to call the ${ALPHA} tool once. If you do not have it or it fails, do not retry. Then reply with exactly: DONE-3`, "DONE-3");
    expect(third.filter((entry) => isTool(entry, ALPHA)).some(succeeded), "alpha is refused after its removal").toBe(false);
    expect(notices(third).map((entry) => entry.content).join("\n")).toContain(`No longer available: ${ALPHA}.`);

    const seenRecords: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name === "seen_tool_names.json") seenRecords.push(await fs.readFile(full, "utf8"));
      }
    };
    await walk(dataDir);
    evidence.seenToolNames = seenRecords;
    expect(seenRecords.map((record) => JSON.parse(record))).toContainEqual(
      expect.objectContaining({ version: 1, toolNames: expect.arrayContaining([BETA]) }));
  }, TURN_TIMEOUT_MS * 3 + 60_000);
});
