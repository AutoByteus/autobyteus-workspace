import "reflect-metadata";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// The production AGY step-output reader resolves AGY's brain root from the home directory when its module loads.
// Point this worker's HOME at a temporary directory before any server module is imported, so the test owns every
// AGY brain file it plants and never touches the real ~/.gemini.
const { home } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "" };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const tempHome = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "agy-step-output-home-")));
  process.env["HOME"] = tempHome;
  return { home: tempHome };
});

const fakeCommand = process.env["ANTIGRAVITY_CLI_COMMAND"] ?? "";
const enabled = process.env["RUN_AGY_FAILURE_E2E"] === "1" &&
  spawnSync(fakeCommand, ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = enabled ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
  "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");

suite("AGY native generate_image step output through the real server (fake AGY transport)", () => {
  let dataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  let definitionId = "";
  const runIds: string[] = [];
  const sockets: WebSocket[] = [];
  const brainRoot = path.join(home, ".gemini", "antigravity-cli", "brain");
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(home, "app-data-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-step-output-" + randomUUID(), role: "assistant", description: "native image step output probe",
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
    await fs.rm(home, { recursive: true, force: true });
    delete process.env["AGY_FAKE_CASE"];
    delete process.env["AGY_FAKE_CONVERSATION_ID"];
  });

  /** Plants AGY's step output for step 1 of a fresh conversation, as AGY 1.2.12 persists it. */
  const plantStepOutput = async (conversationId: string, reportedImage: string) => {
    const stepDir = path.join(brainRoot, conversationId, ".system_generated", "steps", "1");
    await fs.mkdir(stepDir, { recursive: true });
    const text = `Using prompt: blue dog\n\nGenerated image is saved at ${reportedImage}.\n\n Do not output the path of this image.\n`;
    await fs.writeFile(path.join(stepDir, "output.txt"), text);
    return text.trim();
  };

  const runImageTurn = async (conversationId: string) => {
    process.env["AGY_FAKE_CASE"] = "image_done";
    process.env["AGY_FAKE_CONVERSATION_ID"] = conversationId;
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
    const warn = vi.spyOn(console, "warn");
    try {
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content: "Generate a blue dog image." });
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline && !messages.some((m) => m.type === "TURN_COMPLETED")) await wait(100);
      expect(messages.some((m) => m.type === "TURN_COMPLETED"), JSON.stringify(messages)).toBe(true);
      await wait(200);
      const warnings = warn.mock.calls.map((args) => String(args[0]))
        .filter((line) => line.startsWith("AGY_NATIVE_IMAGE_PATH_UNRESOLVED"));
      const started = messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED" && m.payload["tool_name"] === "generate_image");
      const succeeded = messages.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["tool_name"] === "generate_image");
      expect(started).toHaveLength(1);
      expect(started[0]!.payload["arguments"]).toEqual({ ImageName: "blue_dog", Prompt: "blue dog" });
      expect(succeeded).toHaveLength(1);
      expect(messages.some((m) => m.type === "ERROR" || m.type === "TOOL_EXECUTION_FAILED")).toBe(false);
      const projection = (await graphql<{ getRunProjection: { conversation: Array<Record<string, unknown>> } }>(
        "query($runId: String!) { getRunProjection(runId: $runId) { conversation } }", { runId })).getRunProjection;
      const fileChanges = (await graphql<{ getRunFileChanges: Array<Record<string, unknown>> }>(
        "query($runId: String!) { getRunFileChanges(runId: $runId) { path sourceTool sourceInvocationId status } }",
        { runId })).getRunFileChanges;
      return { runId, messages, warnings, invocationId: succeeded[0]!.payload["invocation_id"],
        result: succeeded[0]!.payload["result"], historyRow: projection.conversation
          .find((row) => row["toolName"] === "generate_image"), fileChanges };
    } finally { warn.mockRestore(); }
  };

  const expectUnresolved = (observed: Awaited<ReturnType<typeof runImageTurn>>, reason: string) => {
    expect(observed.result).toEqual({ provider_state: "DONE", output: null });
    expect(observed.warnings).toEqual([`AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=${observed.runId} step=1 reason=${reason}`]);
    expect(observed.messages.some((m) => m.type === "FILE_CHANGE" && m.payload["sourceTool"] === "generated_output")).toBe(false);
    expect(observed.historyRow).toMatchObject({ kind: "tool_call", toolResult: { provider_state: "DONE", output: null } });
    expect(observed.fileChanges).toEqual([]);
  };

  it("publishes the AGY-reported image path, output text, one previewable Artifacts entry and replayable history", async () => {
    const conversationId = randomUUID();
    const image = path.join(brainRoot, conversationId, "blue_dog_1.png");
    const outputText = await plantStepOutput(conversationId, image);
    await fs.writeFile(image, PNG);
    const observed = await runImageTurn(conversationId);
    const expected = { provider_state: "DONE", output: outputText, file_path: image };
    expect(observed.result).toEqual(expected);
    expect(observed.warnings).toEqual([]);
    const live = observed.messages.filter((m) => m.type === "FILE_CHANGE" && m.payload["sourceTool"] === "generated_output");
    expect(new Set(live.map((m) => m.payload["path"]))).toEqual(new Set([image]));
    expect(observed.historyRow).toMatchObject({ kind: "tool_call", toolResult: expected });
    expect(observed.fileChanges).toEqual([{ path: image, sourceTool: "generated_output",
      sourceInvocationId: observed.invocationId, status: "available" }]);
    const preview = await fetch(new URL(`/rest/runs/${observed.runId}/file-change-content?path=${encodeURIComponent(image)}`, url));
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toMatch(/^image\//);
    expect(Buffer.from(await preview.arrayBuffer()).equals(PNG)).toBe(true);
  }, 40_000);

  it("keeps DONE successful with output null when AGY's step output is missing", async () => {
    expectUnresolved(await runImageTurn(randomUUID()), "OUTPUT_MISSING");
  }, 40_000);

  it("ignores a reported image outside the conversation brain directory", async () => {
    const conversationId = randomUUID();
    const outside = path.join(home, "outside.png");
    await fs.writeFile(outside, PNG);
    await plantStepOutput(conversationId, outside);
    expectUnresolved(await runImageTurn(conversationId), "PATH_OUTSIDE_CONVERSATION");
  }, 40_000);

  it("ignores a symlinked reported image inside the conversation brain directory", async () => {
    const conversationId = randomUUID();
    const outside = path.join(home, "symlink-target.png");
    await fs.writeFile(outside, PNG);
    const link = path.join(brainRoot, conversationId, "blue_dog_link.png");
    await plantStepOutput(conversationId, link);
    await fs.symlink(outside, link);
    expectUnresolved(await runImageTurn(conversationId), "IMAGE_MISSING");
  }, 40_000);
});
