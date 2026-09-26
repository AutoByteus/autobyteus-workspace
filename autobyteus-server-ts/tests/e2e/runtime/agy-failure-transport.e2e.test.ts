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
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("controlled AGY failure through app WebSocket and history", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-failure-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-failure-" + randomUUID(), role: "assistant", description: "failure transport probe",
        instructions: "Use native image generation when requested.", category: "runtime-e2e", toolNames: [] } });
    definitionId = created.createAgentDefinition.id;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const runId of runIds) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
    }
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
  });

  const execute = async (mode: "tool_denied" | "terminal_error") => {
    process.env["AGY_FAKE_CASE"] = mode;
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, workspaceRootPath: workspace,
        llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null,
        autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: "antigravity_cli" } });
    expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
    const runId = started.createAgentRun.runId!;
    runIds.push(runId);
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
    sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
            ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore only malformed diagnostic transport rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Generate a blue dog image." });
    const expected = mode === "tool_denied" ? "TURN_COMPLETED" : "ERROR";
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !messages.some((m) => m.type === expected)) await wait(100);
    expect(messages.some((m) => m.type === expected), JSON.stringify(messages)).toBe(true);
    await wait(200);
    const publicWire = JSON.stringify(messages);
    expect(messages.some((m) => m.type === "AGENT_COMMAND_ACK")).toBe(true);
    expect(publicWire).not.toMatch(/PRIVATE_AGY_SECRET|SECRET_IMAGE|\/private\//);
    const history = await graphql<{ getRunProjection: { conversation: unknown[] } }>(
      "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId });
    expect(JSON.stringify(history.getRunProjection.conversation)).not.toMatch(/PRIVATE_AGY_SECRET|SECRET_IMAGE|\/private\//);
    const diagnosticFile = path.join(dataDir, "memory", "agents", runId,
      "agy-provider-diagnostics", "provider-failures.jsonl");
    for (let n = 0; n < 20; n++) {
      try { await fs.access(diagnosticFile); break; } catch { await wait(100); }
    }
    const privateDiagnostic = await fs.readFile(diagnosticFile, "utf-8");
    expect(privateDiagnostic).toContain("PRIVATE_AGY_SECRET");
    expect(privateDiagnostic.length).toBeLessThan(32 * 1024);
    expect((await fs.stat(diagnosticFile)).mode & 0o777).toBe(0o600);
    return { runId, messages, history: history.getRunProjection.conversation,
      privateDiagnosticKind: mode === "tool_denied" ? "tool" : "turn" };
  };

  it("redacts native image denial on ACK, tool card, history while retaining private bounded diagnostic", async () => {
    const observed = await execute("tool_denied");
    expect(observed.messages.some((m) => m.type === "TOOL_DENIED" && m.payload["tool_name"] === "generate_image")).toBe(true);
    expect(observed.messages.some((m) => m.type === "TOOL_EXECUTION_SUCCEEDED")).toBe(false);
  }, 40_000);

  it("redacts terminal provider error without a tool and does not fabricate completion", async () => {
    const observed = await execute("terminal_error");
    expect(observed.messages.some((m) => m.type === "ERROR" && m.payload["code"] === "AGY_TURN_ERROR"
      && m.payload["error_effect"] === "terminal")).toBe(true);
    expect(observed.messages.some((m) => m.type === "TURN_COMPLETED")).toBe(false);
  }, 40_000);
});
