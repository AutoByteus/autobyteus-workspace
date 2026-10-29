/**
 * Saved AutoByteus Anthropic runs whose stored llmConfig holds a key no Claude schema declares any more
 * (real saved runs hold `thinking_display`) keep resuming and running, and the stale key never reaches
 * Anthropic (ticket claude-anthropic-effort-control, REQ-011 / AC-011).
 *
 * Real studio server in process (HTTP GraphQL + agent WebSocket). `globalThis.fetch` records the body of every
 * Anthropic `POST /v1/messages`; every other request (GraphQL to this server) goes to the real fetch.
 *   - Default (no credits, runs with every suite): Anthropic is answered with a canned streamed reply, and the
 *     server reads a synthetic key from a synthetic test vault (test-support `createSyntheticTestVault`).
 *   - Live (`RUN_ANTHROPIC_STORED_CONFIG_LIVE=1` with `AUTOBYTEUS_TEST_VAULT`): requests go to the real
 *     Anthropic API with the test vault's key, so Anthropic itself must accept the request sent after the
 *     restore. A missing key is reported as a skip, never a pass.
 *
 * Per model (claude-opus-5-5 without a thinking switch, claude-sonnet-5-5 with one): create a run with a
 * current config, send a message, stop it, add `thinking_display: "omitted"` to the run's stored llmConfig
 * on disk (the shape found in user data), restore it, send again, and check the request sent after restore.
 * Team run (members on both models; the root default and every member hold the key, like the saved team run in
 * user data) and AgentOrg run (director on Opus 5.5, a mounted team's worker on Sonnet 5.5): the same, with one
 * request per member after restore (live mode: 12 short calls in total).
 *
 * Run with a clean environment (TESTING.md), from the repository root:
 *   env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" corepack pnpm -C autobyteus-server-ts exec vitest run \
 *     tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts --no-watch
 * Live: add `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_ANTHROPIC_STORED_CONFIG_LIVE=1` after `env -i`.
 */
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_VAULT_SETTING_NAME } from "autobyteus-ts/secrets/test-vault-setting.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveServerVault, initializeLiveServerVault, requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";
import { createSyntheticTestVault } from "../../../../test-support/test-vault/synthetic-test-vault.js";
import { captureTestVaultSelection, capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

type Json = Record<string, unknown>;
type WsMessage = { type: string; payload: Json };

const LIVE = process.env.RUN_ANTHROPIC_STORED_CONFIG_LIVE === "1";
const STALE_KEY = "thinking_display";
const STEP_TIMEOUT_MS = 60_000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isRecord = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** A minimal streamed Messages reply: one text block "OK", then end_turn. */
const cannedStream = (model: string): string => [
  ["message_start", { type: "message_start", message: {
    id: `msg_${randomUUID()}`, type: "message", role: "assistant", model, content: [], stop_reason: null,
    stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } }],
  ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
  ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "OK" } }],
  ["content_block_stop", { type: "content_block_stop", index: 0 }],
  ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } }],
  ["message_stop", { type: "message_stop" }],
].map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");

const MODELS: Array<{ model: string; llmConfig: Json; expectedThinking: Json; expectedEffort: string }> = [
  { model: "claude-opus-5-5", llmConfig: { reasoning_effort: "max" }, expectedThinking: { type: "adaptive" }, expectedEffort: "max" },
  { model: "claude-sonnet-5-5", llmConfig: { thinking_enabled: true, reasoning_effort: "high" },
    expectedThinking: { type: "adaptive" }, expectedEffort: "high" },
];

describe("AutoByteus Anthropic run resumes with a stored config key no schema declares (AC-011)", () => {
  const originalFetch = globalThis.fetch;
  const previousTestVaultSetting = capturedTestVaultSetting();
  const anthropicBodies: Json[] = [];
  const anthropicStatuses: number[] = [];
  let app: FastifyInstance | null = null;
  let mainUrl: URL;
  let dataDir = "";
  let workspaceRootPath = "";
  let agentDefinitionId = "";

  const gql = async <T>(query: string, variables: Json = {}): Promise<T> => {
    const response = await originalFetch(new URL("/graphql", mainUrl), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((error) => error.message).join("; ")}`);
    return body.data as T;
  };

  /** Finds the stored metadata files (under the data dir) that hold this run's llmConfig. */
  const storedConfigFiles = async (runId: string): Promise<string[]> => {
    const found: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.name.endsWith(".json")) {
          const text = await readFile(full, "utf-8");
          if (text.includes(runId) && text.includes("\"llmConfig\"")) found.push(full);
        }
      }
    };
    await walk(dataDir);
    return found;
  };

  /** Adds the stale key to every stored llmConfig object of the run, like configs saved by earlier versions. */
  const addStaleKeyToStoredConfig = async (runId: string): Promise<number> => {
    let changed = 0;
    const visit = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(visit);
      if (!isRecord(value)) return value;
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
        if (key === "llmConfig" && isRecord(entry)) { changed += 1; return [key, { ...entry, [STALE_KEY]: "omitted" }]; }
        return [key, visit(entry)];
      }));
    };
    for (const file of await storedConfigFiles(runId)) {
      await writeFile(file, JSON.stringify(visit(JSON.parse(await readFile(file, "utf-8"))), null, 2), "utf-8");
    }
    return changed;
  };

  const openSocket = async (runId: string, frames: WsMessage[], route = "agent",
    ready: (frame: WsMessage) => boolean = (frame) => frame.type === "CONNECTED"): Promise<WebSocket> => {
    const start = frames.length;
    const ws = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/${route}/${runId}`);
    ws.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {} });
      } catch { /* not a frame */ }
    });
    await new Promise<void>((resolve, reject) => { ws.once("open", () => resolve()); ws.once("error", reject); });
    await waitFor(frames, start, ready, `${route} socket ready`);
    return ws;
  };
  const closeSocket = async (ws: WebSocket) => {
    await new Promise<void>((resolve) => { ws.once("close", () => resolve()); ws.close(); setTimeout(resolve, 3_000); });
  };
  const waitFor = async (frames: WsMessage[], from: number, predicate: (frame: WsMessage) => boolean, label: string) => {
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const found = frames.slice(from).find(predicate);
      if (found) return found;
      await wait(100);
    }
    throw new Error(`Timed out waiting for ${label}; frames: ${frames.slice(from).map((frame) => frame.type).join(", ")}`);
  };
  /** Sends one message and returns the Anthropic request body it produced. */
  const sendTurn = async (ws: WebSocket, frames: WsMessage[], label: string): Promise<Json> => {
    const from = frames.length;
    const callsBefore = anthropicBodies.length;
    sendE2eSendMessageCommand(ws, { content: "Reply with exactly: OK" });
    await waitFor(frames, from, (frame) => frame.type === "TURN_COMPLETED" || frame.type === "ERROR", `${label} TURN_COMPLETED`);
    const error = frames.slice(from).find((frame) => frame.type === "ERROR");
    expect(error, `${label} ERROR frame: ${JSON.stringify(error?.payload)}`).toBeUndefined();
    await waitFor(frames, from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", `${label} idle`);
    expect(anthropicBodies.length, `${label}: one Anthropic request`).toBe(callsBefore + 1);
    expect(anthropicStatuses[anthropicStatuses.length - 1], `${label}: Anthropic accepted the request`).toBe(200);
    return anthropicBodies[anthropicBodies.length - 1]!;
  };

  beforeAll(async () => {
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.hostname !== "api.anthropic.com" || url.pathname !== "/v1/messages") return originalFetch(input, init);
      const raw = init?.body ?? (input instanceof Request ? await input.clone().text() : null);
      const body = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer)) as Json;
      anthropicBodies.push(body);
      if (LIVE) {
        const response = await originalFetch(input, init);
        anthropicStatuses.push(response.status);
        return response;
      }
      anthropicStatuses.push(200);
      return new Response(cannedStream(String(body.model)), { status: 200, headers: { "content-type": "text/event-stream" } });
    }) as typeof fetch;

    dataDir = await mkdtemp(path.join(os.tmpdir(), "anthropic-stored-config-e2e-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    if (!LIVE) {
      const vault = createSyntheticTestVault(path.join(dataDir, "synthetic-test-vault"),
        { "provider.anthropic.api-key": "synthetic-anthropic-key-for-stored-config-e2e" });
      captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: vault.directory });
    }
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    mainUrl = started.mainUrl;
    workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "anthropic-stored-config-e2e-ws-"));

    await gql("mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier } } }",
      { p: "ANTHROPIC", r: "autobyteus" });
    const definition = await gql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: {
        name: `anthropic-stored-config-e2e-${randomUUID().slice(0, 8)}`, role: "assistant",
        description: "Stored-config resume check.", instructions: "Reply briefly.", category: "runtime-e2e",
        toolNames: [], skillNames: [],
      } });
    agentDefinitionId = definition.createAgentDefinition.id;
  }, 180_000);

  afterAll(async () => {
    if (agentDefinitionId) {
      await gql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id: agentDefinitionId }).catch(() => undefined);
    }
    await app?.close();
    app = null;
    await closeLiveServerVault();
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: previousTestVaultSetting ?? "" });
    globalThis.fetch = originalFetch;
    if (workspaceRootPath) await rm(workspaceRootPath, { recursive: true, force: true });
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  for (const { model, llmConfig, expectedThinking, expectedEffort } of MODELS) {
    it(`${model}: restore succeeds and the request after restore carries no stored stale key`, async (context) => {
      if (LIVE) await requireLiveCapability(context, "provider.anthropic.api-key");
      const created = await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
        { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: model, autoExecuteTools: true,
          runtimeKind: "autobyteus", llmConfig } });
      expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
      const runId = created.createAgentRun.runId!;

      const frames: WsMessage[] = [];
      let ws = await openSocket(runId, frames);
      await sendTurn(ws, frames, "before stop");
      const stopped = await gql<{ terminateAgentRun: { success: boolean; message: string } }>(
        "mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId });
      expect(stopped.terminateAgentRun.success, stopped.terminateAgentRun.message).toBe(true);
      await closeSocket(ws);

      expect(await addStaleKeyToStoredConfig(runId), "stored llmConfig objects updated").toBeGreaterThan(0);
      const storedTexts = await Promise.all((await storedConfigFiles(runId)).map((file) => readFile(file, "utf-8")));
      expect(storedTexts.some((text) => text.includes(`"${STALE_KEY}"`)), "stale key is on disk before restore").toBe(true);

      const restored = await gql<{ restoreAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message runId } }", { id: runId });
      expect(restored.restoreAgentRun.success, restored.restoreAgentRun.message).toBe(true);
      ws = await openSocket(runId, frames);
      const body = await sendTurn(ws, frames, "after restore");
      await closeSocket(ws);
      await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);

      expect(body.model).toBe(model);
      expect(body).not.toHaveProperty(STALE_KEY);
      expect(body.thinking).toEqual(expectedThinking);
      expect(body.output_config).toEqual({ effort: expectedEffort });
      expect(JSON.stringify(body)).not.toContain(STALE_KEY);
      expect(JSON.stringify(body)).not.toContain("\"display\"");
    }, 180_000);
  }

  const expectCleanBody = (body: Json, model: string, expectedThinking: Json, expectedEffort: string) => {
    expect(body.model).toBe(model);
    expect(body.thinking).toEqual(expectedThinking);
    expect(body.output_config).toEqual({ effort: expectedEffort });
    expect(JSON.stringify(body)).not.toContain(STALE_KEY);
    expect(JSON.stringify(body)).not.toContain("\"display\"");
  };
  /** Waits for the Anthropic request a member turn produced and for that member to finish. */
  const awaitMemberTurn = async (frames: WsMessage[], from: number, callsBefore: number, done: (frame: WsMessage) => boolean,
    label: string): Promise<Json> => {
    await waitFor(frames, from, (frame) => done(frame) || frame.type === "ERROR", `${label} done`);
    const error = frames.slice(from).find((frame) => frame.type === "ERROR");
    expect(error, `${label} ERROR frame: ${JSON.stringify(error?.payload)}`).toBeUndefined();
    expect(anthropicBodies.length, `${label}: one Anthropic request`).toBe(callsBefore + 1);
    expect(anthropicStatuses[anthropicStatuses.length - 1], `${label}: Anthropic accepted the request`).toBe(200);
    return anthropicBodies[anthropicBodies.length - 1]!;
  };
  const createTeamDefinition = async (memberNames: string[]): Promise<string> => (await gql<{ createAgentTeamDefinition: { id: string } }>(
    "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
    { input: { name: `anthropic-stored-config-team-${randomUUID().slice(0, 8)}`, description: "Stored-config resume check.",
      instructions: "Reply briefly.", coordinatorMemberName: memberNames[0],
      nodes: memberNames.map((memberName) => ({ memberName, ref: agentDefinitionId, refScope: "SHARED" })) } })).createAgentTeamDefinition.id;

  // Team members (SCN-005-T): the shape found in a real saved team run (root default + members hold the key).
  const TEAM_MEMBERS = [
    { name: "lead", ...MODELS[0]! },
    { name: "helper", ...MODELS[1]! },
  ];

  it("team run: restore succeeds and every member's request after restore carries no stored stale key", async (context) => {
    if (LIVE) await requireLiveCapability(context, "provider.anthropic.api-key");
    const teamDefinitionId = await createTeamDefinition(TEAM_MEMBERS.map((member) => member.name));
    const created = await gql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: MODELS[0]!.model, llmConfig: MODELS[0]!.llmConfig,
          autoExecuteTools: true, runtimeKind: "autobyteus", workspaceRootPath }],
        memberConfigs: TEAM_MEMBERS.map((member) => ({ memberAddress: `/${member.name}`, agentDefinitionId,
          llmModelIdentifier: member.model, llmConfig: member.llmConfig, autoExecuteTools: true, runtimeKind: "autobyteus",
          workspaceRootPath })) } });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId!;
    const config = await gql<{ getTeamRunResumeConfig: { executionTree: Json } }>(
      "query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }", { teamRunId });
    const members = flattenE2eConfiguredAgentExecutions(config.getTeamRunResumeConfig.executionTree);
    const runIdOf = (name: string) => members.find((member) => member.memberName === name)!.agentRunId;

    const frames: WsMessage[] = [];
    const sendToMember = async (ws: WebSocket, name: string, label: string): Promise<Json> => {
      const from = frames.length;
      const callsBefore = anthropicBodies.length;
      const agentRunId = runIdOf(name);
      sendE2eSendMessageCommand(ws, { agent_run_id: agentRunId, content: "Reply with exactly: OK" });
      const body = await awaitMemberTurn(frames, from, callsBefore, (frame) => frame.type === "TURN_COMPLETED"
        && frame.payload.agent_run_id === agentRunId, `${label} ${name}`);
      await waitFor(frames, from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.agent_run_id === agentRunId
        && frame.payload.status === "idle", `${label} ${name} idle`);
      return body;
    };
    let ws = await openSocket(teamRunId, frames, "agent-team");
    await sendToMember(ws, "lead", "before stop");
    const stopped = await gql<{ terminateAgentTeamRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success message } }", { id: teamRunId });
    expect(stopped.terminateAgentTeamRun.success, stopped.terminateAgentTeamRun.message).toBe(true);
    await closeSocket(ws);

    // Root default + every member: at least 3 stored llmConfig objects in the team tree.
    expect(await addStaleKeyToStoredConfig(teamRunId), "stored llmConfig objects updated").toBeGreaterThanOrEqual(3);
    const restored = await gql<{ restoreAgentTeamRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { restoreAgentTeamRun(teamRunId: $id) { success message } }", { id: teamRunId });
    expect(restored.restoreAgentTeamRun.success, restored.restoreAgentTeamRun.message).toBe(true);
    ws = await openSocket(teamRunId, frames, "agent-team");
    for (const member of TEAM_MEMBERS) {
      expectCleanBody(await sendToMember(ws, member.name, "after restore"), member.model, member.expectedThinking, member.expectedEffort);
    }
    await closeSocket(ws);
    await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId }).catch(() => undefined);
    const storedTexts = await Promise.all((await storedConfigFiles(teamRunId)).map((file) => readFile(file, "utf-8")));
    expect(storedTexts.some((text) => text.includes(`"${STALE_KEY}"`)), "stored data is not rewritten").toBe(true);
  }, 240_000);

  it("Org run: restore succeeds and the member requests after restore carry no stored stale key", async (context) => {
    if (LIVE) await requireLiveCapability(context, "provider.anthropic.api-key");
    const teamDefinitionId = await createTeamDefinition(["worker"]);
    const org = await gql<{ createAgentOrgDefinition: { id: string } }>(
      "mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }",
      { input: { name: `anthropic-stored-config-org-${randomUUID().slice(0, 8)}`, description: "Stored-config resume check.",
        instructions: "Reply briefly.", handoffs: [], members: [
          { memberName: "director", ref: agentDefinitionId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "team", ref: teamDefinitionId, refType: "AGENT_TEAM", refScope: "SHARED" },
        ] } });
    const created = await gql<{ createAgentOrgRun: { success: boolean; message: string; agentOrgRunId: string | null } }>(
      "mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }",
      { input: { agentOrgDefinitionId: org.createAgentOrgDefinition.id,
        rootConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: MODELS[0]!.model, llmConfig: MODELS[0]!.llmConfig,
          autoExecuteTools: true, workspaceRootPath },
        agentOverrides: [{ address: "/team/worker", configuration: { llmModelIdentifier: MODELS[1]!.model, llmConfig: MODELS[1]!.llmConfig } }],
        teamOverrides: [] } });
    expect(created.createAgentOrgRun.success, created.createAgentOrgRun.message).toBe(true);
    const orgRunId = created.createAgentOrgRun.agentOrgRunId!;
    const tree = (await gql<{ getAgentOrgRunConfig: { executionTree: { rootOrg: { members: Json[] } } } }>(
      "query($orgRunId: String!) { getAgentOrgRunConfig(orgRunId: $orgRunId) { executionTree } }", { orgRunId }))
      .getAgentOrgRunConfig.executionTree;
    const director = tree.rootOrg.members.find((member) => member.address === "/director")!;
    const worker = (tree.rootOrg.members.find((member) => member.address === "/team")!.members as Json[])
      .find((member) => member.address === "/team/worker")!;
    const targets = [
      { address: "/director", agentRunId: String(director.agentRunId), ...MODELS[0]! },
      { address: "/team/worker", agentRunId: String(worker.agentRunId), ...MODELS[1]! },
    ];

    const frames: WsMessage[] = [];
    const presentation = (frame: WsMessage) => frame.type === "ROOT_EXECUTION_EVENT" && isRecord(frame.payload.event)
      && frame.payload.event.kind === "agent_presentation" ? frame.payload.event : null;
    const sendToMember = async (ws: WebSocket, target: (typeof targets)[number], label: string): Promise<Json> => {
      const from = frames.length;
      const callsBefore = anthropicBodies.length;
      ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
        target_agent_run_id: target.agentRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(),
        context_file_paths: [], image_urls: [], content: "Reply with exactly: OK" } }));
      return awaitMemberTurn(frames, from, callsBefore, (frame) => {
        const event = presentation(frame);
        return Boolean(event && event.member_address === target.address && isRecord(event.message)
          && (event.message.type === "TURN_COMPLETED" || event.message.type === "ERROR"));
      }, `${label} ${target.address}`);
    };
    const orgReady = (frame: WsMessage) => frame.type === "ROOT_LIFECYCLE" && frame.payload.is_active === true;
    let ws = await openSocket(orgRunId, frames, "agent-org", orgReady);
    await sendToMember(ws, targets[0]!, "before stop");
    await wait(500);
    const stopped = await gql<{ terminateAgentOrgRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId });
    expect(stopped.terminateAgentOrgRun.success, stopped.terminateAgentOrgRun.message).toBe(true);
    await closeSocket(ws);

    expect(await addStaleKeyToStoredConfig(orgRunId), "stored llmConfig objects updated").toBeGreaterThanOrEqual(3);
    const restored = await gql<{ restoreAgentOrgRun: { success: boolean; message: string } }>(
      "mutation($id: String!) { restoreAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId });
    expect(restored.restoreAgentOrgRun.success, restored.restoreAgentOrgRun.message).toBe(true);
    ws = await openSocket(orgRunId, frames, "agent-org", orgReady);
    for (const target of targets) {
      const body = await sendToMember(ws, target, "after restore");
      expectCleanBody(body, target.model, target.expectedThinking, target.expectedEffort);
      await wait(500);
    }
    await closeSocket(ws);
    await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId }).catch(() => undefined);
  }, 240_000);
});
