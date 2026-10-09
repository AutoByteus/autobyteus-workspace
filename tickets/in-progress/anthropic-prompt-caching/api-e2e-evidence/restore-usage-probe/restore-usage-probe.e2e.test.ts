/**
 * Temporary API/E2E probe (anthropic-prompt-caching, API-REV-001): is the token usage of a native Anthropic run
 * recorded by the meter after Stop → restoreAgentRun? Two one-call turns (before and after restore).
 * Copy into <worktree>/autobyteus-server-ts/tests/e2e/runtime/ and run with RUN_RESTORE_USAGE_PROBE=1 + ANTHROPIC_API_KEY.
 */
import "reflect-metadata";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rootPrismaClient } from "repository_prisma";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { closeLiveRuntimeSecretVault, initializeLiveRuntimeSecretVaultFromEnvironment } from "../helpers/live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const run = process.env.RUN_RESTORE_USAGE_PROBE === "1" ? describe : describe.skip;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

run("restore usage probe", () => {
  let dataDir = ""; let ws = ""; let mainUrl: URL;
  let app: Awaited<ReturnType<typeof startStudioE2eRuntimeServer>>["fastify"] | null = null;
  const out: Record<string, unknown> = { at: new Date().toISOString() };
  const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const response = await fetch(new URL("/graphql", mainUrl), { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(120_000) });
    const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
    return body.data as T;
  };
  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), "restore-usage-probe-appdata-"));
    await writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; mainUrl = started.mainUrl;
    ws = await mkdtemp(path.join(os.tmpdir(), "restore-usage-probe-ws-"));
  }, 120_000);
  afterAll(async () => {
    await writeFile(process.env.PROBE_OUT!, JSON.stringify(out, null, 2));
    await Promise.race([app?.close(), wait(20_000)]);
    await closeLiveRuntimeSecretVault();
    await rm(ws, { recursive: true, force: true }); await rm(dataDir, { recursive: true, force: true });
  }, 60_000);
  it("counts recorded usage before and after restore", async () => {
    const def = await gql<{ createAgentDefinition: { id: string } }>("mutation($i: CreateAgentDefinitionInput!) { createAgentDefinition(input: $i) { id } }",
      { i: { name: `probe-${Date.now()}`, role: "engineer", description: "probe", instructions: "Reply briefly.", category: "probe", toolNames: [], skillNames: [] } });
    const runRes = await gql<{ createAgentRun: { runId: string } }>("mutation($i: CreateAgentRunInput!) { createAgentRun(input: $i) { success message runId } }",
      { i: { agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: ws, llmModelIdentifier: "claude-opus-5-5", autoExecuteTools: true, runtimeKind: "autobyteus" } });
    const runId = runRes.createAgentRun.runId;
    const frames: string[] = [];
    const open = async () => {
      const socket = new WebSocket(`ws://${mainUrl.hostname}:${mainUrl.port}/ws/agent/${runId}`);
      socket.on("message", (raw) => { try { frames.push(String((JSON.parse(raw.toString()) as { type: string }).type)); } catch { /* */ } });
      await new Promise<void>((r) => socket.once("open", () => r()));
      return socket;
    };
    const turn = async (socket: WebSocket, content: string) => {
      const from = frames.length;
      sendE2eSendMessageCommand(socket, { content });
      const deadline = Date.now() + 180_000;
      while (!frames.slice(from).includes("TURN_COMPLETED") && Date.now() < deadline) await wait(300);
      await wait(3_000);
    };
    const summaryQ = "query($id: String!) { getAgentRunTokenUsageSummary(runId: $id) { usageReportCount totalTokens } }";
    const read = async () => ({
      summary: (await gql<{ getAgentRunTokenUsageSummary: unknown }>(summaryQ, { id: runId })).getAgentRunTokenUsageSummary,
      ledgerEvents: await rootPrismaClient.tokenUsageLedgerEvent.count({ where: { runId } }),
      usageFrames: frames.filter((f) => f === "TOKEN_USAGE_UPDATED").length,
    });
    let socket = await open();
    await turn(socket, "Reply with the single word ONE.");
    out.beforeStop = await read();
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: runId });
    socket.close();
    const restored = await gql<{ restoreAgentRun: { success: boolean; message: string } }>("mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message runId } }", { id: runId });
    out.restore = restored.restoreAgentRun;
    socket = await open();
    await turn(socket, "Reply with the single word TWO.");
    await wait(5_000);
    out.afterRestore = await read();
    socket.close();
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
    await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId } });
    expect(out.restore).toBeTruthy();
  }, 600_000);
});
