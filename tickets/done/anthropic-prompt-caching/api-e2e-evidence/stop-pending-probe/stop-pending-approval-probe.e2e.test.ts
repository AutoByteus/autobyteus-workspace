/**
 * Temporary API/E2E probe (anthropic-prompt-caching, API-REV-001): does Stop (terminateAgentRun) of a native
 * Anthropic run hang while a tool approval is pending, and is that call's usage missing from the meter?
 * Copy into <worktree>/autobyteus-server-ts/tests/e2e/runtime/ and run with RUN_STOP_PENDING_PROBE=1 + ANTHROPIC_API_KEY.
 * Writes PROBE_OUT (JSON). One claude-opus-5-5 call.
 */
import "reflect-metadata";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveRuntimeSecretVault, initializeLiveRuntimeSecretVaultFromEnvironment } from "../helpers/live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const run = process.env.RUN_STOP_PENDING_PROBE === "1" ? describe : describe.skip;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

run("stop with pending approval probe", () => {
  let dataDir = "";
  let ws = "";
  let mainUrl: URL;
  let app: Awaited<ReturnType<typeof startStudioE2eRuntimeServer>>["fastify"] | null = null;
  const out: Record<string, unknown> = { at: new Date().toISOString() };
  const gql = async <T>(query: string, variables: Record<string, unknown> = {}, timeoutMs = 400_000): Promise<T> => {
    const response = await fetch(new URL("/graphql", mainUrl), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeoutMs) });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
    return body.data as T;
  };
  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "stop-pending-probe-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; mainUrl = started.mainUrl;
    ws = await mkdtemp(path.join(os.tmpdir(), "stop-pending-probe-ws-"));
    await writeFile(path.join(ws, "a.txt"), "CODE: A1");
  }, 120_000);
  afterAll(async () => {
    await writeFile(process.env.PROBE_OUT!, JSON.stringify(out, null, 2));
    await Promise.race([app?.close(), wait(20_000)]);
    await closeLiveRuntimeSecretVault();
    await rm(ws, { recursive: true, force: true }); await rm(dataDir, { recursive: true, force: true });
  }, 60_000);
  it("times Stop while an approval is pending", async () => {
    const def = await gql<{ createAgentDefinition: { id: string } }>("mutation($i: CreateAgentDefinitionInput!) { createAgentDefinition(input: $i) { id } }",
      { i: { name: `probe-${Date.now()}`, role: "engineer", description: "probe", instructions: "Use read_file when asked.", category: "probe", toolNames: ["read_file"], skillNames: [] } });
    const runRes = await gql<{ createAgentRun: { runId: string } }>("mutation($i: CreateAgentRunInput!) { createAgentRun(input: $i) { success message runId } }",
      { i: { agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: ws, llmModelIdentifier: "claude-opus-5-5", autoExecuteTools: false, runtimeKind: "autobyteus" } });
    const runId = runRes.createAgentRun.runId;
    const socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
    const frames: string[] = [];
    socket.on("message", (raw) => { try { frames.push(String((JSON.parse(raw.toString()) as { type: string }).type)); } catch { /* */ } });
    await new Promise<void>((r) => socket.once("open", () => r()));
    sendE2eSendMessageCommand(socket, { content: "Read a.txt with read_file, then reply with its code." });
    const deadline = Date.now() + 180_000;
    while (!frames.includes("TOOL_APPROVAL_REQUESTED") && Date.now() < deadline) await wait(300);
    out.approvalRequested = frames.includes("TOOL_APPROVAL_REQUESTED");
    await wait(2_000);
    const summaryQ = "query($id: String!) { getAgentRunTokenUsageSummary(runId: $id) { usageReportCount cacheReadInputTokens totalTokens } }";
    out.meterBeforeStop = (await gql<{ getAgentRunTokenUsageSummary: unknown }>(summaryQ, { id: runId })).getAgentRunTokenUsageSummary;
    const started = Date.now();
    try {
      const res = await gql<{ terminateAgentRun: { success: boolean; message: string } }>("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId });
      out.terminate = res.terminateAgentRun;
    } catch (error) { out.terminateError = String(error); }
    out.terminateMs = Date.now() - started;
    out.meterAfterStop = (await gql<{ getAgentRunTokenUsageSummary: unknown }>(summaryQ, { id: runId })).getAgentRunTokenUsageSummary;
    out.frames = frames;
    socket.close();
    expect(out.approvalRequested).toBe(true);
  }, 600_000);
});
