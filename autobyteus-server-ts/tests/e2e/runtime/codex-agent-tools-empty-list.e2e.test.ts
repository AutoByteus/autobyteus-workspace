import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import fastify from "fastify";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { materializeCodexAgentToolsMcpThreadConfig } from "../../../src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.js";
import { AgentToolMcpCatalog } from "../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { toAgentToolMcpOperationResult } from "../../../src/agent-tools/mcp/agent-tool-mcp-adapter.js";
import { AgentToolMcpSessionRegistry } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { AgentToolsMcpLocalAccessGate } from "../../../src/agent-tools/mcp/agent-tools-mcp-local-access.js";
import { AgentToolsMcpMethodDispatcher } from "../../../src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js";
import { registerAgentToolsMcpRoutes } from "../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import { AgentToolsMcpSessionStreams } from "../../../src/agent-tools/mcp/agent-tools-mcp-session-streams.js";

// Opt-in (RUN_CODEX_E2E=1): the installed `codex` CLI, no model use. autobyteus-324 step 1:
// every external run now has an Agent Tools MCP server, so Codex must accept one whose
// `enabled_tools` is empty and still connect to it. HOME and CODEX_HOME are temporary
// folders; the thread is ephemeral, so nothing is written outside them.
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";

type Exchange = { method: string; rpcMethod: string | null };

const startEndpoint = async () => {
  const exchanges: Exchange[] = [];
  const app = fastify();
  app.addHook("onRequest", async (request) => {
    exchanges.push({ method: request.method, rpcMethod: null });
  });
  app.addHook("preHandler", async (request) => {
    if (request.method !== "POST" || typeof request.body !== "string") return;
    try {
      const body = JSON.parse(request.body) as { method?: unknown };
      exchanges.at(-1)!.rpcMethod = typeof body.method === "string" ? body.method : null;
    } catch {
      // Not JSON-RPC; leave the method unset.
    }
  });
  const registry = new AgentToolMcpSessionRegistry();
  const streams = new AgentToolsMcpSessionStreams();
  const catalog = new AgentToolMcpCatalog({
    adapters: [{
      definition: {
        name: "probe_alpha",
        description: "Probe tool",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      isAvailable: () => true,
      execute: async () => toAgentToolMcpOperationResult({ accepted: true, code: "OK", message: "alpha" }),
    }],
  });
  await registerAgentToolsMcpRoutes(app, {
    registry,
    dispatcher: new AgentToolsMcpMethodDispatcher({
      catalog,
      toolExecutor: new AgentToolMcpToolExecutor({ catalog }),
    }),
    localAccessGate: new AgentToolsMcpLocalAccessGate(),
    streams,
  });
  app.addHook("preClose", async () => streams.closeAll());
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP port.");
  const service = new AgentToolMcpSessionService({
    registry,
    catalog,
    streams,
    getLocalBaseUrl: () => `http://127.0.0.1:${address.port}`,
    executionCapabilities: {
      publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
      applicationAgentTools: null,
    },
  });
  return { app, service, streams, exchanges };
};

const startCodexAppServer = async (cwd: string, home: string) => {
  const child: ChildProcessWithoutNullStreams = spawn("codex", ["app-server"], {
    cwd,
    env: { PATH: process.env.PATH ?? "", HOME: home, CODEX_HOME: path.join(home, ".codex"), TMPDIR: os.tmpdir() },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = (stderr + String(chunk)).slice(-4000); });
  let nextId = 1;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const notifications: { method: string; params: unknown }[] = [];
  readline.createInterface({ input: child.stdout }).on("line", (line) => {
    let message: any;
    try { message = JSON.parse(line); } catch { return; }
    if (message.id !== undefined && pending.has(message.id) && ("result" in message || "error" in message)) {
      const waiter = pending.get(message.id)!;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
      return;
    }
    if (typeof message.method === "string") notifications.push({ method: message.method, params: message.params });
  });
  const request = (method: string, params?: unknown) => new Promise<any>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) })}\n`);
  });
  const notify = (method: string, params: unknown) =>
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  const stop = async () => {
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5_000);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
    });
  };
  return { request, notify, notifications, stop, stderr: () => stderr };
};

describe.skipIf(!liveCodexTestsEnabled)("Codex app-server with an empty Agent Tools list (no model use)", () => {
  it("accepts enabled_tools: [] and connects to the Agent Tools endpoint", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "codex-empty-agent-tools-")));
    const home = path.join(root, "home");
    const workspace = path.join(root, "workspace");
    await fs.mkdir(path.join(home, ".codex"), { recursive: true });
    await fs.mkdir(workspace);
    const endpoint = await startEndpoint();
    const codex = await startCodexAppServer(workspace, home);
    onTestFinished(async () => {
      await codex.stop();
      await endpoint.app.close();
      await fs.rm(root, { recursive: true, force: true });
    });

    const activation = endpoint.service.activateForRun({
      owner: { runId: "codex-empty-run" },
      sender: buildAgentRunMessageSenderContext({ senderRunId: "codex-empty-run", senderName: "codex-empty-run" }),
      runtimeExposure: buildRuntimeAgentToolExposure([]),
    });
    const appServerConfig = materializeCodexAgentToolsMcpThreadConfig(activation.descriptor);
    expect(appServerConfig).toMatchObject({
      mcp_servers: { autobyteus_agent_tools: { enabled_tools: [] } },
    });

    await codex.request("initialize", {
      clientInfo: { name: "autobyteus-324-empty-list-check", version: "0.0.1" },
      capabilities: { experimentalApi: true },
    });
    codex.notify("initialized", {});
    const started = await codex.request("thread/start", {
      model: null,
      modelProvider: null,
      cwd: workspace,
      approvalPolicy: "never",
      sandbox: "read-only",
      personality: null,
      config: appServerConfig,
      ephemeral: true,
    });
    expect(typeof started.thread?.id).toBe("string");

    await vi.waitFor(() => {
      const rpcMethods = endpoint.exchanges.map((exchange) => exchange.rpcMethod);
      expect(rpcMethods).toContain("initialize");
      expect(rpcMethods).toContain("tools/list");
      expect(codex.notifications.some((entry) => entry.method === "mcpServer/startupStatus/updated"
        && (entry.params as { status?: string }).status === "ready")).toBe(true);
    }, { timeout: 20_000, interval: 250 });

    const evidenceDir = process.env.CODEX_EMPTY_LIST_EVIDENCE_DIR;
    if (evidenceDir) {
      await fs.mkdir(evidenceDir, { recursive: true });
      await fs.writeFile(path.join(evidenceDir, "codex-empty-enabled-tools.json"), `${JSON.stringify({
        codexAppServerConfig: appServerConfig,
        threadId: started.thread.id,
        endpointExchanges: endpoint.exchanges,
        codexMcpNotifications: codex.notifications.filter((entry) => /mcp/i.test(entry.method)),
        codexStderrTail: codex.stderr().slice(-1500),
      }, null, 2)}\n`);
    }
    const statuses = codex.notifications
      .filter((entry) => entry.method === "mcpServer/startupStatus/updated")
      .map((entry) => entry.params as { name: string; status: string; error: unknown });
    expect(statuses.filter((status) => status.name === "autobyteus_agent_tools").map((status) => status.status))
      .toContain("ready");
    expect(statuses.filter((status) => status.status === "failed" || status.error !== null)).toEqual([]);
  }, 60_000);
});
