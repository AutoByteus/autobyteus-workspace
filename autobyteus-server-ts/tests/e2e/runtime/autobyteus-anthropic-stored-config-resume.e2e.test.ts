/**
 * Saved AutoByteus Anthropic runs whose stored llmConfig holds a key no Claude schema declares any more
 * (real saved runs hold `thinking_display`) keep resuming and running, and the stale key never reaches
 * Anthropic (ticket claude-anthropic-effort-control, REQ-011 / AC-011).
 *
 * Real studio server in process (HTTP GraphQL + agent WebSocket), no provider credits: `globalThis.fetch`
 * answers Anthropic `POST /v1/messages` with a canned streamed reply and records each request body; every
 * other request (GraphQL to this server) goes to the real fetch. The server reads a synthetic Anthropic key
 * from a synthetic test vault (test-support `createSyntheticTestVault`, selected the way in-process suites do).
 *
 * Per model (claude-opus-5-5 without a thinking switch, claude-sonnet-5-5 with one): create a run with a
 * current config, send a message, stop it, add `thinking_display: "omitted"` to the run's stored llmConfig
 * on disk (the shape found in user data), restore it, send again, and check the request sent after restore.
 *
 * Run with a clean environment (TESTING.md), from the repository root:
 *   env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" corepack pnpm -C autobyteus-server-ts exec vitest run \
 *     tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts --no-watch
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
import { closeLiveServerVault, initializeLiveServerVault } from "../../../../test-support/test-vault/live-server-vault.js";
import { createSyntheticTestVault } from "../../../../test-support/test-vault/synthetic-test-vault.js";
import { captureTestVaultSelection } from "../../../../test-support/test-vault/test-vault.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

type Json = Record<string, unknown>;
type WsMessage = { type: string; payload: Json };

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
  const anthropicBodies: Json[] = [];
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

  const openSocket = async (runId: string, frames: WsMessage[]): Promise<WebSocket> => {
    const ws = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    ws.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") frames.push({ type: parsed.type, payload: isRecord(parsed.payload) ? parsed.payload : {} });
      } catch { /* not a frame */ }
    });
    await new Promise<void>((resolve, reject) => { ws.once("open", () => resolve()); ws.once("error", reject); });
    await waitFor(frames, 0, (frame) => frame.type === "CONNECTED", "CONNECTED");
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
    return anthropicBodies[anthropicBodies.length - 1]!;
  };

  beforeAll(async () => {
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.hostname !== "api.anthropic.com" || url.pathname !== "/v1/messages") return originalFetch(input, init);
      const raw = init?.body ?? (input instanceof Request ? await input.text() : null);
      const body = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer)) as Json;
      anthropicBodies.push(body);
      return new Response(cannedStream(String(body.model)), { status: 200, headers: { "content-type": "text/event-stream" } });
    }) as typeof fetch;

    dataDir = await mkdtemp(path.join(os.tmpdir(), "anthropic-stored-config-e2e-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const vault = createSyntheticTestVault(path.join(dataDir, "synthetic-test-vault"),
      { "provider.anthropic.api-key": "synthetic-anthropic-key-for-stored-config-e2e" });
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: vault.directory });
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
    captureTestVaultSelection({ [TEST_VAULT_SETTING_NAME]: "" });
    globalThis.fetch = originalFetch;
    if (workspaceRootPath) await rm(workspaceRootPath, { recursive: true, force: true });
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  for (const { model, llmConfig, expectedThinking, expectedEffort } of MODELS) {
    it(`${model}: restore succeeds and the request after restore carries no stored stale key`, async () => {
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
});
