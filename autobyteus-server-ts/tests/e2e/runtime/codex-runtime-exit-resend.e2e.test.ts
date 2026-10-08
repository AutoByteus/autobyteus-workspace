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
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";

// A standalone Codex run whose runtime stops by itself (its `codex app-server` crashes) is restarted by the next
// message in the same Codex thread, through the real server, WebSocket and app server. Before the fix the run was
// parked as "still owns retired cleanup" and every later send was refused until the app restarted (ticket
// interrupt-resend-retired-cleanup-stuck, AC-003). Uses the local `codex` login and a few tiny turns of quota.
// Run: RUN_CODEX_E2E=1 [CODEX_EXIT_RESEND_E2E_EVIDENCE_DIR=<dir>] pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-exit-resend.e2e.test.ts --no-watch
const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const suite = codexBinaryReady && process.env.RUN_CODEX_E2E === "1" ? describe : describe.skip;
const evidenceDir = process.env.CODEX_EXIT_RESEND_E2E_EVIDENCE_DIR?.trim() || null;
type Wire = { at: number; type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

/** `codex app-server` processes in this worker's process tree only (never the user's own Codex daemon). */
const ownedAppServers = (): Array<{ pid: number; command: string }> => {
  const rows = spawnSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf8" }).stdout.split("\n").flatMap((line) => {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), command: match[3]! }] : [];
  });
  const tree = new Set([process.pid]);
  for (let grew = true; grew;) {
    grew = false;
    for (const row of rows) if (!tree.has(row.pid) && tree.has(row.ppid)) { tree.add(row.pid); grew = true; }
  }
  return rows.filter((row) => row.pid !== process.pid && tree.has(row.pid) && /\bapp-server\b/.test(row.command))
    .map(({ pid, command }) => ({ pid, command }));
};

suite("Codex runtime exit followed by a new message through the app WebSocket", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
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
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-exit-resend-e2e-"));
    await fs.mkdir(path.join(dataDir, "workspace"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    definitionId = (await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "codex-exit-resend-" + randomUUID(), role: "assistant", description: "Codex exit resend probe",
        instructions: "Reply exactly as asked. Do not use tools.", category: "runtime-e2e", toolNames: [] } }))
      .createAgentDefinition.id;
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) await graphql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }",
        { id: runId }).catch(() => undefined);
      if (definitionId) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id: definitionId }).catch(() => undefined);
      await app.close();
    }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 120_000);

  const codexModel = async (): Promise<string> => {
    const snapshots = (await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { runtimeKind: "codex_app_server" })).providerModelCatalogSnapshots;
    const ids = snapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
    const model = [process.env.CODEX_E2E_TOOL_MODEL?.trim(), "gpt-5.4-mini", "gpt-5.6-luna", "gpt-5.3-codex-spark"]
      .find((candidate): candidate is string => Boolean(candidate) && ids.includes(candidate!)) ?? ids[0];
    expect(model, `Codex models: ${ids.join(", ")}`).toBeTruthy();
    return model!;
  };

  it("restarts a standalone Codex run in the same thread after its app server crashed (AC-003)", async () => {
    const evidence: Record<string, unknown> = { case: "LIVE-CODEX-EXIT" };
    try {
      const model = await codexModel();
      evidence.model = model;
      const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
        "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
        { input: { agentDefinitionId: definitionId, workspaceRootPath: path.join(dataDir, "workspace"),
          llmModelIdentifier: model, llmConfig: { reasoning_effort: "low" }, autoExecuteTools: false,
          runtimeKind: "codex_app_server" } });
      expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
      const runId = created.createAgentRun.runId!;
      runIds.push(runId);
      evidence.runId = runId;
      const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      sockets.push(socket);
      const t0 = Date.now();
      const frames: Wire[] = [];
      socket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type === "string") frames.push({ at: Date.now() - t0, type: parsed.type,
            payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? parsed.payload as Record<string, unknown> : {} });
        } catch { /* Ignore only malformed diagnostic transport rows. */ }
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
      const until = async (predicate: () => boolean, ms: number) => {
        const deadline = Date.now() + ms;
        while (Date.now() < deadline && !predicate()) await wait(100);
        return predicate();
      };
      const send = (content: string) => {
        const ids = buildE2eClientCommandIds();
        const start = frames.length;
        socket.send(JSON.stringify({ type: "SEND_MESSAGE",
          payload: { ...ids, context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
        return { messageId: ids.message_id, start };
      };
      const ack = (messageId: string) => frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload["message_id"] === messageId)?.payload;
      const textFrom = (start: number) => frames.slice(start).filter((f) => f.type === "SEGMENT_CONTENT")
        .map((f) => String(f.payload["delta"] ?? "")).join("");
      const statuses = (start = 0) => frames.slice(start).filter((f) => f.type === "AGENT_STATUS").map((f) => String(f.payload["status"] ?? ""));
      const turnCompleted = (start: number) => frames.slice(start).some((f) => f.type === "TURN_COMPLETED");

      const code = `CODE-C-${randomUUID().slice(0, 8)}`;
      const remember = send(`Remember the code ${code}. Reply with exactly OK.`);
      expect(await until(() => turnCompleted(remember.start), 180_000), JSON.stringify(frames.slice(-10))).toBe(true);
      expect(ack(remember.messageId)).toMatchObject({ accepted: true });

      // The runtime stops by itself: the app server this server spawned crashes.
      const crashed = ownedAppServers();
      evidence.crashed = crashed;
      expect(crashed.length, "owned codex app-server").toBeGreaterThan(0);
      const crashStart = frames.length;
      for (const { pid } of crashed) process.kill(pid, "SIGKILL");
      expect(await until(() => crashed.every(({ pid }) => !alive(pid)), 10_000)).toBe(true);
      expect(await until(() => statuses(crashStart).includes("offline") || statuses(crashStart).includes("error"), 30_000),
        JSON.stringify(frames.slice(crashStart))).toBe(true);
      evidence.framesAfterCrash = frames.slice(crashStart).map((f) => ({ type: f.type, payload: f.payload }));
      await wait(1_000);

      const recall = send("Which code did I ask you to remember earlier in this conversation? Reply with the code only.");
      await until(() => Boolean(ack(recall.messageId)), 120_000);
      evidence.recallAck = ack(recall.messageId) ?? null;
      expect(ack(recall.messageId), JSON.stringify(ack(recall.messageId))).toMatchObject({ accepted: true });
      expect(await until(() => textFrom(recall.start).includes(code), 180_000), `recall reply: ${textFrom(recall.start)}`).toBe(true);
      expect(await until(() => statuses(recall.start).at(-1) === "idle", 60_000), JSON.stringify(statuses(recall.start))).toBe(true);
      evidence.recallText = textFrom(recall.start);
      evidence.statusesAfterRecall = statuses(recall.start);
      const restarted = ownedAppServers();
      evidence.restarted = restarted;
      expect(restarted.length).toBeGreaterThan(0);
      expect(restarted.some(({ pid }) => crashed.some((old) => old.pid === pid))).toBe(false);
      const text = JSON.stringify(frames);
      expect(text).not.toContain("retired cleanup");
      expect(text).not.toContain("AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING");
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail"; evidence.error = String(error); throw error;
    } finally {
      if (evidenceDir) {
        await fs.mkdir(evidenceDir, { recursive: true });
        await fs.writeFile(path.join(evidenceDir, "live-codex-exit.json"), JSON.stringify(evidence, null, 2));
      }
    }
  }, 600_000);
});
