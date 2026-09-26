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
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const live = process.env["RUN_AGY_CAPABILITY_E2E"] === "1" &&
  spawnSync("agy", ["--version"], { stdio: "ignore" })["status"] === 0;
const suite = live ? describe : describe.skip;
type WsMessage = { type: string; payload: Record<string, unknown> };
const evidenceDir = path.resolve(process.env["AGY_CAPABILITY_EVIDENCE_DIR"] ?? path.join(os.tmpdir(), "agy-capability-e2e-evidence"));
const packageRoot = process.env["AGY_CODEX_PACKAGE_ROOT"] ?? "";
const exactNativeNames = ["view_file", "write_to_file", "replace_file_content", "grep_search",
  "list_dir", "find_by_name", "run_command", "generate_image"];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("real AutoByteus AGY standalone native image chat", () => {
  let appDataDir = "";
  let workspace = "";
  let app: FastifyInstance;
  let url: URL;
  const runIds: string[] = [];
  const definitionIds: string[] = [];
  const sockets: WebSocket[] = [];
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const readNativeGrantLine = async (runId: string): Promise<string> => {
    const root = path.join(appDataDir, "memory", "agents", runId, "agy-project", ".agents", "agents");
    const names = await fs.readdir(root);
    expect(names).toHaveLength(1);
    const markdown = await fs.readFile(path.join(root, names[0]!, "agent.md"), "utf-8");
    return markdown.split("\n").find((line) => line.startsWith("tools: ")) ?? "";
  };
  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-app-image-e2e-"));
    workspace = path.join(appDataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const runId of runIds) await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }",
        { agentRunId: runId }).catch(() => undefined);
      for (const id of definitionIds) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }",
        { id }).catch(() => undefined);
    }
    if (app) await app.close();
    if (appDataDir) await fs.rm(appDataDir, { recursive: true, force: true });
  });

  it("publishes native generate_image ACTIVE/DONE and an ordinary reply via GraphQL/WebSocket", async () => {
    const unique = randomUUID();
    const created = await graphql<{ createAgentDefinition: { id: string } }>(
      "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: "agy-native-image-" + unique, role: "assistant",
        description: "Real native image E2E agent", category: "runtime-e2e",
        instructions: "For image requests, invoke AGY's own native generate_image tool, not AutoByteus MCP. Reply briefly after the tool completes.",
        toolNames: [] } });
    const id = created.createAgentDefinition.id;
    definitionIds.push(id);
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: id, workspaceRootPath: workspace,
        llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: {},
        autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: "antigravity_cli" } });
    expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
    const runId = started.createAgentRun.runId;
    expect(runId).toBeTruthy();
    runIds.push(runId!);
    const nativeGrantLine = await readNativeGrantLine(runId!);
    expect(nativeGrantLine).toBe("tools: [" + exactNativeNames.join(", ") + "]");
    expect(nativeGrantLine).not.toMatch(/call_mcp_tool|send_message|subagent|manage_task/);
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type !== "string") return;
        messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object"
          && !Array.isArray(parsed.payload) ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* ignore malformed diagnostic row */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: runId,
      content: "Use your own native generate_image tool to make a small simple blue dog illustration. Then tell me briefly what you did." });
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline && !messages.some((m) => m.type === "TURN_COMPLETED")
      && !messages.some((m) => m.type === "ERROR" && m.payload["error_effect"] === "terminal")) await wait(500);
    const simplified = messages.map((m, eventIndex) => ({
      event_index: eventIndex, type: m.type, tool_name: m.payload["tool_name"] ?? null,
      invocation_id: m.payload["invocation_id"] ?? null,
      turn_id: m.payload["turn_id"] ?? null,
      provider_state: (m.payload["result"] as Record<string, unknown> | undefined)?.["provider_state"] ?? m.payload["provider_state"] ?? null,
      delta: m.type === "SEGMENT_CONTENT" ? String(m.payload["delta"] ?? "").slice(0, 500) : null,
      code: m.payload["code"] ?? null,
    }));
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, "app-native-image-chat.json"), JSON.stringify({
      runId, model: "gemini-3.8-flash-low", nativeGrantLine, events: simplified,
    }, null, 2));
    const starts = messages.filter((m) => m.type === "TOOL_EXECUTION_STARTED" && m.payload["tool_name"] === "generate_image");
    const success = messages.filter((m) => m.type === "TOOL_EXECUTION_SUCCEEDED" && m.payload["tool_name"] === "generate_image");
    expect(starts).toHaveLength(1);
    expect(success).toHaveLength(1);
    const startedEvent = starts[0]!;
    const succeededEvent = success[0]!;
    const invocationId = startedEvent.payload["invocation_id"];
    const turnId = startedEvent.payload["turn_id"];
    expect(typeof invocationId).toBe("string");
    expect(String(invocationId).trim()).not.toBe("");
    expect(typeof turnId).toBe("string");
    expect(String(turnId).trim()).not.toBe("");
    expect(succeededEvent.payload["invocation_id"]).toBe(invocationId);
    expect(succeededEvent.payload["turn_id"]).toBe(turnId);
    const completedEvent = messages.find((m) => m.type === "TURN_COMPLETED");
    expect(completedEvent?.payload["turn_id"]).toBe(turnId);
    expect(messages.indexOf(startedEvent)).toBeLessThan(messages.indexOf(succeededEvent));
    expect(messages.indexOf(succeededEvent)).toBeLessThan(messages.indexOf(completedEvent!));
    expect(success[0]?.payload["result"]).toMatchObject({ provider_state: "DONE", output: null });
    expect(messages.some((m) => m.type === "TOOL_EXECUTION_STARTED" && m.payload["tool_name"] === "call_mcp_tool")).toBe(false);
    expect(messages.some((m) => m.type === "SEGMENT_CONTENT" && String(m.payload["delta"] ?? "").trim())).toBe(true);
    expect(messages.some((m) => m.type === "TURN_COMPLETED")).toBe(true);
    expect(messages.some((m) => m.type === "ERROR" && m.payload["error_effect"] === "terminal")).toBe(false);
  }, 240_000);

  it.skipIf(!packageRoot)("starts imported Codex package with bundled workflow skill on a real first turn", async () => {
    let linked = (await graphql<{ agentPackages: Array<{ packageId: string; path: string }> }>(
      "query { agentPackages { packageId path } }")).agentPackages.find((item) => item.path === packageRoot);
    if (!linked) {
      const packages = await graphql<{ importAgentPackage: Array<{ packageId: string; path: string }> }>(
        "mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId path } }",
        { input: { sourceKind: "LOCAL_PATH", source: packageRoot } });
      linked = packages.importAgentPackage.find((item) => item.path === packageRoot);
    }
    expect(linked).toBeDefined();
    const definition = await graphql<{ agentDefinition: { id: string; skillNames: string[]; ownerPackageId: string | null } | null }>(
      "query { agentDefinition(id: \"codex\") { id skillNames ownerPackageId } }");
    expect(definition.agentDefinition).toMatchObject({ id: "codex",
      skillNames: ["software-engineering-workflow-skill"] });
    // Shared package definitions have no ownerPackageId. Resolve the selected
    // source instead, so the actual run cannot silently use a shadow copy.
    const selected = await AgentDefinitionService.getInstance().getFreshAgentDefinitionById("codex");
    expect(selected?.sourceInfo?.agentDirPath).toBe(path.join(packageRoot, "agents", "codex"));
    const selectedSkill = path.join(selected!.sourceInfo!.agentDirPath, "skills",
      "software-engineering-workflow-skill", "SKILL.md");
    const bundledSkill = path.join(packageRoot, "agents", "codex", "skills",
      "software-engineering-workflow-skill", "SKILL.md");
    expect(await fs.readFile(selectedSkill, "utf-8")).toBe(await fs.readFile(bundledSkill, "utf-8"));
    const started = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: "codex", workspaceRootPath: workspace,
        llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null,
        autoExecuteTools: true, skillAccessMode: "PRELOADED_ONLY", runtimeKind: "antigravity_cli" } });
    expect(started.createAgentRun.success, started.createAgentRun.message).toBe(true);
    const runId = started.createAgentRun.runId;
    expect(runId).toBeTruthy();
    runIds.push(runId!);
    expect(await readNativeGrantLine(runId!)).toBe("tools: [" + exactNativeNames.join(", ") + "]");
    const socket = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws/agent/" + runId);
    sockets.push(socket);
    const messages: WsMessage[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
            ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* ignore malformed diagnostic row */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    sendE2eSendMessageCommand(socket, { agent_run_id: runId,
      content: "Use your configured software-engineering-workflow-skill. In one sentence, what is its first stage for a new software request?" });
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline && !messages.some((m) => m.type === "TURN_COMPLETED")
      && !messages.some((m) => m.type === "ERROR" && m.payload["error_effect"] === "terminal")) await wait(500);
    const evidence = { packageRoot, packageId: linked?.packageId, runId,
      events: messages.map((m) => ({ type: m.type,
        delta: m.type === "SEGMENT_CONTENT" ? String(m.payload["delta"] ?? "").slice(0, 500) : null,
        code: m.payload["code"] ?? null })) };
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, "app-codex-first-turn.json"), JSON.stringify(evidence, null, 2));
    expect(messages.some((m) => m.type === "TURN_COMPLETED")).toBe(true);
    expect(messages.some((m) => m.type === "ERROR" && m.payload["error_effect"] === "terminal")).toBe(false);
    expect(messages.filter((m) => m.type === "SEGMENT_CONTENT")
      .map((m) => String(m.payload["delta"] ?? "")).join(" ")).toMatch(/stage\s+0|bootstrap/i);
  }, 180_000);
});
