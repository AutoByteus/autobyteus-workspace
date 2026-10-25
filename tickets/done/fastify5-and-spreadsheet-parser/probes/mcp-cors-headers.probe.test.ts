// AC-003 route probe (implementation-scoped). Drives the real MCP route registrations with
// app.inject and prints status + Access-Control-* headers for each case, so the base and
// branch outputs can be diffed.
// - MCP gateway: registered on a studio-like instance exactly in the studio order
//   (registerMcpGatewayRoutes, then @fastify/cors with the studio options).
// - Agent-tools MCP: its own instance with no cors plugin (agent-tools-mcp-local-server.ts).
// Run: copy to autobyteus-server-ts/tests/integration/zz-imp-probe/ and
//   TEST_IMP_PROBE_OUT=<file> pnpm -C autobyteus-server-ts exec vitest run tests/integration/zz-imp-probe --no-watch
// then delete the copy. Lines go to TEST_IMP_PROBE_OUT (the test setup silences console output).
import { appendFileSync } from "node:fs";
import fastify from "fastify";
import cors from "@fastify/cors";
import { it } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { registerAgentToolsMcpRoutes } from "../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import { AgentToolMcpSessionRegistry } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpCatalog } from "../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolsMcpMethodDispatcher } from "../../../src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js";
import { AgentToolsMcpLocalAccessGate } from "../../../src/agent-tools/mcp/agent-tools-mcp-local-access.js";
import type { AgentToolMcpToolExecutor } from "../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { registerMcpGatewayRoutes } from "../../../src/mcp-gateway/mcp-gateway-routes.js";
import { McpGatewayAccessGate } from "../../../src/mcp-gateway/mcp-gateway-access.js";
import { McpGatewayMethodDispatcher } from "../../../src/mcp-gateway/mcp-gateway-method-dispatcher.js";
import { McpGatewayToolCatalog } from "../../../src/mcp-gateway/mcp-gateway-tool-catalog.js";
import { McpGatewayToolExecutor } from "../../../src/mcp-gateway/mcp-gateway-tool-executor.js";

type InjectApp = ReturnType<typeof fastify>;

const emit = (line: string): void => {
  const out = process.env.TEST_IMP_PROBE_OUT;
  if (!out) throw new Error("Set TEST_IMP_PROBE_OUT to the output file.");
  appendFileSync(out, `${line}\n`);
};

const LOOPBACK = "http://127.0.0.1:3000";
const FOREIGN = "https://evil.example";
const listTools = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });

const cases = (url: string) => [
  { name: "POST no Origin", method: "POST", url, headers: { "content-type": "application/json", accept: "application/json" }, payload: listTools },
  { name: "POST loopback Origin", method: "POST", url, headers: { "content-type": "application/json", accept: "application/json", origin: LOOPBACK }, payload: listTools },
  { name: "POST non-loopback Origin", method: "POST", url, headers: { "content-type": "application/json", accept: "application/json", origin: FOREIGN }, payload: listTools },
  { name: "OPTIONS preflight loopback", method: "OPTIONS", url, headers: { origin: LOOPBACK, "access-control-request-method": "POST", "access-control-request-headers": "content-type" } },
  { name: "OPTIONS preflight non-loopback", method: "OPTIONS", url, headers: { origin: FOREIGN, "access-control-request-method": "POST" } },
  { name: "OPTIONS no Origin", method: "OPTIONS", url, headers: {} },
] as const;

const report = async (label: string, app: InjectApp, url: string) => {
  for (const c of cases(url)) {
    const res = await app.inject(c as never);
    const acHeaders = Object.fromEntries(
      Object.entries(res.headers)
        .filter(([key]) => key.startsWith("access-control-") || key === "vary")
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    emit(`PROBE ${label} | ${c.name} | status=${res.statusCode} | ${JSON.stringify(acHeaders)}`);
  }
};

it("prints MCP route status and CORS headers", async () => {
  const gatewayApp = fastify();
  const emptyRegistry = { listTools: () => [], getToolDefinition: () => undefined, createTool: () => { throw new Error("none"); } };
  const catalog = new McpGatewayToolCatalog({ registry: emptyRegistry as never });
  await registerMcpGatewayRoutes(gatewayApp, {
    dispatcher: new McpGatewayMethodDispatcher({ catalog, toolExecutor: new McpGatewayToolExecutor({ catalog }) }),
    accessGate: new McpGatewayAccessGate({ readConfiguredToken: () => null }),
  });
  await gatewayApp.register(cors, { origin: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] });
  await gatewayApp.ready();
  emit(`PROBE fastify ${gatewayApp.version}`);
  await report("mcp-gateway (studio order + cors)", gatewayApp, "/mcp/gateway");
  await gatewayApp.close();

  const agentToolsApp = fastify();
  const registry = new AgentToolMcpSessionRegistry();
  await registerAgentToolsMcpRoutes(agentToolsApp, {
    registry,
    dispatcher: new AgentToolsMcpMethodDispatcher({
      catalog: new AgentToolMcpCatalog(),
      toolExecutor: { executeAgentToolMcpCall: async () => { throw new Error("not called"); } } as unknown as AgentToolMcpToolExecutor,
    }),
    localAccessGate: new AgentToolsMcpLocalAccessGate(),
  });
  await agentToolsApp.ready();
  const { sessionId } = registry.activateSession({
    owner: { runId: "probe-run" },
    sender: buildAgentRunMessageSenderContext({ senderRunId: "probe-run", senderName: "probe", runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    runtimeExposure: buildRuntimeAgentToolExposure([]),
    executionContext: {},
    executionCapabilities: {
      kind: "agent",
      publishedArtifactPublisher: { publishManyForRun: async () => [] },
      applicationAgentTools: null,
    },
    enabledTools: [],
    toolRoutes: {} as never,
  } as never);
  await report("agent-tools (own instance, no cors)", agentToolsApp, `/mcp/agent-tools/${sessionId}`);
  await agentToolsApp.close();
});
