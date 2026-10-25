import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

/**
 * Internal agents (autobyteus-308) through the real Studio HTTP/WebSocket server, GraphQL, the agent runs' scoped Agent
 * Tools MCP and the AGY backend. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs,
 * `linked_skills`): `CALL_TOOL:{…}` makes the agent call that actual tool and reply `CALLED:<tool result>`. No inference.
 * The internal agent is synthesized as an installed agent is: `agents/<id>/agent.md` + `agent-config.json`
 * (`"internal": true`) in the server's data root before it starts. The setting changes through the Settings API
 * (`updateServerSetting`) or the environment, never with a restart.
 * - IA-01 the agent list leaves it out while hidden (normal agents unchanged), it opens by ID, and it is listed with
 *   `internal: true` once shown (AC-001, AC-005, AC-007, REQ-008).
 * - IA-02 saving it keeps `"internal": true` in its file; saving a normal agent adds no key (AC-006, no migration).
 * - IA-03 a real recorded run of it: absent from workspace run history and the Memory page while hidden, open by run ID,
 *   present once shown (AC-002, REQ-008).
 * - IA-04 an agent's collaboration surfaces while hidden: `list_available_agents` leaves it out, `delegate_task` to its
 *   address is refused with today's text and starts nothing, the `@` candidates leave it out and an `@` mention of it is
 *   refused; once shown (no restart) all of them offer it and delegation starts a copy (AC-003, AC-005).
 * - IA-05 the setting: only true/false are accepted; the environment variable alone shows it (AC-005, REQ-002).
 * Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/internal-agents.e2e.test.ts --no-watch
 */
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "internal-agents-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
type Rec = Record<string, any>;
const SETTING = "AUTOBYTEUS_SHOW_INTERNAL_AGENTS";
const INTERNAL_ID = "e2e-internal-helper";
const INTERNAL_NAME = "E2E Internal Helper";
const INTERNAL_ADDRESS = "/e2e_internal_helper";
const MODEL = "gemini-3.8-flash-low";
const NOT_AVAILABLE = "is not the address of an available agent or agent team";
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
/** The agent's own replies (not the user's message). */
const assistantTexts = (conversation: unknown): string[] => objectsIn(conversation)
  .filter((record) => record.role === "assistant" && typeof record.content === "string").map((record) => record.content as string);
const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return { ...JSON.parse(text), isError: raw.isError === true }; } catch { return { text: text ?? called, isError: raw.isError === true }; }
};

suite("Internal agents: hidden unless \"Show internal agents\" is on (real HTTP/WS/GraphQL/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];
  const savedEnv = new Map<string, string | undefined>();
  const ids: Record<string, string> = {};
  let internalRunId = "";

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  /** The Settings page's call. */
  const setShown = async (value: string) => (await graphql(`mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}`, { k: SETTING, v: value })).updateServerSetting as string;
  const listedIds = async () => ((await graphql(`{agentDefinitions{id name internal}}`)).agentDefinitions as Rec[]);
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const createRun = async (agentDefinitionId: string) => {
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId, ...config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    runIds.push(created.runId);
    return created.runId as string;
  };
  const connect = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), `run ${runId} stream ready`);
    return { socket, frames };
  };
  const conversation = async (runId: string) => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation;
  /** One message on a run; returns the SEND_MESSAGE acknowledgement. */
  const send = async (run: { socket: WebSocket; frames: Frame[] }, runId: string, content: string, mentions?: Array<{ kind: string; definition_id: string }>) => {
    const from = run.frames.length;
    sendE2eSendMessageCommand(run.socket, { agent_run_id: runId, content, ...(mentions ? { mentions } : {}) });
    let ack: Frame | undefined;
    await until(() => Boolean(ack = run.frames.slice(from).find((frame) => frame.type === "AGENT_COMMAND_ACK" && frame.payload.command_type === "SEND_MESSAGE")), "SEND_MESSAGE ack");
    return ack!.payload;
  };
  /** One scripted tool call by the run's agent; returns the tool result it reports. */
  const calls = async (run: { socket: WebSocket; frames: Frame[] }, runId: string, content: string): Promise<Rec> => {
    const before = calledResults(await conversation(runId)).length;
    const ack = await send(run, runId, content);
    expect(ack.accepted, JSON.stringify(ack)).toBe(true);
    let results: string[] = [];
    await until(async () => { results = calledResults(await conversation(runId)); return results.length > before; }, `tool result for ${content.slice(0, 100)}`, 60_000);
    return toolResult(results[before]!);
  };
  const historyRunIds = async () => objectsIn((await graphql(`{listWorkspaceRunHistory{agentDefinitions{agentDefinitionId runs{runId}}}}`)).listWorkspaceRunHistory)
    .flatMap((record) => typeof record.runId === "string" ? [record.runId as string] : []);
  const memoryAgents = async () => ((await graphql(`{listAgentsWithMemory(pageSize:200){entries{attribution agentDefinitionId displayName runCount}}}`)).listAgentsWithMemory.entries as Rec[]);
  const memoryRunsOf = async (attribution: string, agentDefinitionId: string | null) => ((await graphql(
    `query($s:AgentWithMemorySelectorInput!){listAgentRunsWithMemory(selector:$s,pageSize:200){entries{runId agentDefinitionId}}}`,
    { s: { attribution, agentDefinitionId } })).listAgentRunsWithMemory.entries as Rec[]).map((entry) => entry.runId as string);

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "internal-agents-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    // The synthesized internal agent, installed as files before the server starts (as a shipped helper is).
    const agentDir = path.join(dataDir, "agents", INTERNAL_ID);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(path.join(agentDir, "agent.md"), ["---", `name: ${INTERNAL_NAME}`, "description: The system's own helper (E2E)", "role: assistant", "---", "", "Follow the user's request."].join("\n"));
    await fs.writeFile(path.join(agentDir, "agent-config.json"), JSON.stringify({ internal: true, toolNames: [], skillNames: [] }, null, 2));
    for (const key of ["AGY_FAKE_CASE", SETTING]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    delete process.env[SETTING];
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    const create = async (name: string, toolNames: string[]) => (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: `${name} (internal agents E2E)`, instructions: "Follow the user's request.", toolNames } })).createAgentDefinition.id as string;
    ids.normal = await create(`IA Normal ${suffix}`, []);
    ids.scout = await create(`IA Scout ${suffix}`, ["list_available_agents", "delegate_task"]);
    ids.normalName = `IA Normal ${suffix}`;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const runId of runIds) await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: runId }).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  it("IA-01 the agent list leaves the internal agent out while hidden and lists it with internal: true once shown; it opens by ID either way (AC-001, AC-005, AC-007, REQ-008)", async () => {
    const hidden = await listedIds();
    expect(hidden.map((entry) => entry.id), "hidden by default").not.toContain(INTERNAL_ID);
    expect(hidden.find((entry) => entry.id === ids.normal), "a normal agent is unchanged").toMatchObject({ internal: false });
    expect(hidden.every((entry) => entry.internal === false), "nothing internal is listed").toBe(true);
    const byId = (await graphql(`query($id:String!){agentDefinition(id:$id){id name internal}}`, { id: INTERNAL_ID })).agentDefinition;
    expect(byId, "opens by ID while hidden").toEqual({ id: INTERNAL_ID, name: INTERNAL_NAME, internal: true });

    await setShown("true");
    const shown = await listedIds();
    expect(shown.find((entry) => entry.id === INTERNAL_ID), "shown without a restart").toEqual({ id: INTERNAL_ID, name: INTERNAL_NAME, internal: true });
    expect(shown.length).toBe(hidden.length + 1);
    await setShown("false");
    expect((await listedIds()).map((entry) => entry.id), "hidden again").not.toContain(INTERNAL_ID);
  });

  it("IA-02 saving the internal agent keeps \"internal\": true in its file; saving a normal agent adds no key (AC-006)", async () => {
    await graphql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}`,
      { input: { id: INTERNAL_ID, description: "The system's own helper (E2E, edited)" } });
    const internalConfig = JSON.parse(await fs.readFile(path.join(dataDir, "agents", INTERNAL_ID, "agent-config.json"), "utf8"));
    expect(internalConfig.internal, JSON.stringify(internalConfig)).toBe(true);
    expect((await graphql(`query($id:String!){agentDefinition(id:$id){description internal}}`, { id: INTERNAL_ID })).agentDefinition)
      .toEqual({ description: "The system's own helper (E2E, edited)", internal: true });
    expect((await listedIds()).map((entry) => entry.id), "still hidden after the save").not.toContain(INTERNAL_ID);

    await graphql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id}}`,
      { input: { id: ids.normal, description: "A normal agent (edited)" } });
    const normalDirs = await fs.readdir(path.join(dataDir, "agents"));
    const normalDir = normalDirs.find((dir) => dir === ids.normal) ?? ids.normal;
    const normalConfig = JSON.parse(await fs.readFile(path.join(dataDir, "agents", normalDir, "agent-config.json"), "utf8"));
    expect(Object.keys(normalConfig), JSON.stringify(normalConfig)).not.toContain("internal");
  });

  it("IA-03 a recorded run of the internal agent: absent from run history and the Memory page while hidden, open by run ID, present once shown (AC-002, REQ-008)", async () => {
    // A system-started run is recorded as today: the run is made and messaged through the same API.
    internalRunId = await createRun(INTERNAL_ID);
    const run = await connect(internalRunId);
    const ack = await send(run, internalRunId, "Reply OK.");
    expect(ack.accepted, JSON.stringify(ack)).toBe(true);
    await until(async () => assistantTexts(await conversation(internalRunId)).some((text) => text.includes("OK")), "the internal agent's own reply recorded", 60_000);
    const normalRunId = await createRun(ids.normal);
    const normalRun = await connect(normalRunId);
    expect((await send(normalRun, normalRunId, "Reply OK.")).accepted).toBe(true);
    await until(async () => (await historyRunIds()).includes(normalRunId), "the normal run in history", 30_000);
    await until(async () => (await memoryAgents()).some((entry) => entry.agentDefinitionId === ids.normal), "the normal agent on the Memory page", 30_000);

    const hiddenHistory = await historyRunIds();
    expect(hiddenHistory, "a normal run is listed").toContain(normalRunId);
    expect(hiddenHistory, "the internal agent's run is not in run history").not.toContain(internalRunId);
    const hiddenMemory = await memoryAgents();
    expect(hiddenMemory.map((entry) => entry.agentDefinitionId), "not on the Memory page").not.toContain(INTERNAL_ID);
    expect(await memoryRunsOf("DEFINITION", INTERNAL_ID), "no run list for it").toEqual([]);
    expect(await memoryRunsOf("UNATTRIBUTED", null), "not moved under unattributed").not.toContain(internalRunId);
    const projection = (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: internalRunId })).getRunProjection;
    expect(assistantTexts(projection.conversation), "the run opens by ID while hidden, with the agent's reply").toEqual(expect.arrayContaining([expect.stringContaining("OK")]));

    await setShown("true");
    expect(await historyRunIds(), "in run history once shown").toContain(internalRunId);
    expect((await memoryAgents()).find((entry) => entry.agentDefinitionId === INTERNAL_ID), "on the Memory page once shown").toMatchObject({ displayName: INTERNAL_NAME });
    expect(await memoryRunsOf("DEFINITION", INTERNAL_ID)).toContain(internalRunId);
    await setShown("false");
    expect(await historyRunIds(), "hidden again").not.toContain(internalRunId);
  }, 180_000);

  it("IA-04 while hidden an agent cannot find, mention or delegate to it; once shown (no restart) it can (AC-003, AC-005)", async () => {
    const scoutRunId = await createRun(ids.scout);
    const scout = await connect(scoutRunId);
    const candidates = async () => ((await graphql(`query($k:String!,$id:String!,$f:String){collaboratorMentionCandidates(rootSubjectKind:$k,rootRunId:$id,focusedAgentRunId:$f){candidates{kind definitionId name}}}`,
      { k: "agent", id: scoutRunId, f: scoutRunId })).collaboratorMentionCandidates.candidates as Rec[]);
    const delegatedRuns = async () => objectsIn((await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: scoutRunId })).agentRunCollaboration)
      .filter((record) => (record.address === INTERNAL_ADDRESS) && (record.agentRunId ?? record.agent_run_id)).length;

    // Hidden: list, delegate, @ candidates, @ by ID.
    const hiddenList = await calls(scout, scoutRunId, callTool("list_available_agents", {}));
    const hiddenNames = (hiddenList.agents as Rec[]).map((agent) => agent.name);
    expect(hiddenNames, JSON.stringify(hiddenList)).toContain(ids.normalName);
    expect(hiddenNames, "list_available_agents leaves it out").not.toContain(INTERNAL_NAME);
    const refused = await calls(scout, scoutRunId, callTool("delegate_task", { recipient_address: INTERNAL_ADDRESS, description: "Reply OK." }));
    expect(JSON.stringify(refused), "today's refusal").toContain(NOT_AVAILABLE);
    expect(refused).not.toHaveProperty("target_agent_run_id");
    expect(await delegatedRuns(), "nothing started").toBe(0);
    expect((await candidates()).map((candidate) => candidate.definitionId), "@ candidates leave it out").not.toContain(INTERNAL_ID);
    expect((await candidates()).map((candidate) => candidate.definitionId)).toContain(ids.normal);
    const mention = await send(scout, scoutRunId, "Reply OK.", [{ kind: "agent", definition_id: INTERNAL_ID }]);
    // A message's mentions are admitted as collaborators: an ineligible one is today's COLLABORATOR_ADD_FAILED with the reason.
    expect(mention, "an @ mention of it fails as unavailable").toMatchObject({ accepted: false, code: "COLLABORATOR_ADD_FAILED" });
    expect(String(mention.message)).toBe(`'${INTERNAL_ID}' is not a shared Agent that can be mentioned.`);

    // Shown, with the same live run and no restart.
    await setShown("true");
    const shownList = await calls(scout, scoutRunId, callTool("list_available_agents", {}));
    expect((shownList.agents as Rec[]).find((agent) => agent.name === INTERNAL_NAME), JSON.stringify(shownList)).toMatchObject({ kind: "agent", address: INTERNAL_ADDRESS });
    expect((await candidates()).map((candidate) => candidate.definitionId), "an @ candidate once shown").toContain(INTERNAL_ID);
    expect((await send(scout, scoutRunId, "Reply OK.", [{ kind: "agent", definition_id: INTERNAL_ID }])).accepted, "an @ mention is accepted").toBe(true);
    const delegated = await calls(scout, scoutRunId, callTool("delegate_task", { recipient_address: INTERNAL_ADDRESS, description: "Reply OK." }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    if (delegated.target_agent_run_id) runIds.push(delegated.target_agent_run_id);

    // Hidden again: the next call follows the setting.
    await setShown("false");
    const againRefused = await calls(scout, scoutRunId, callTool("delegate_task", { recipient_address: INTERNAL_ADDRESS, description: "Reply OK." }));
    expect(JSON.stringify(againRefused)).toContain(NOT_AVAILABLE);
  }, 240_000);

  it("IA-05 the setting: only true or false is saved; the environment variable alone shows it (REQ-002)", async () => {
    const invalid = await setShown("yes");
    expect(invalid).toContain("Show internal agents must be true or false.");
    expect((await listedIds()).map((entry) => entry.id), "an invalid value does not show it").not.toContain(INTERNAL_ID);
    // The env path: a node started with AUTOBYTEUS_SHOW_INTERNAL_AGENTS=true and no saved setting.
    await graphql(`mutation($k:String!){deleteServerSetting(key:$k)}`, { k: SETTING }).catch(() => undefined);
    process.env[SETTING] = "true";
    try {
      expect((await listedIds()).map((entry) => entry.id), "the environment variable shows it").toContain(INTERNAL_ID);
      expect(await historyRunIds()).toContain(internalRunId);
    } finally {
      delete process.env[SETTING];
    }
    expect((await listedIds()).map((entry) => entry.id), "off again").not.toContain(INTERNAL_ID);
  });
});
