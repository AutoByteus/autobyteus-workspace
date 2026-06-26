import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { PrismaClient } from "@prisma/client";
import { buildGraphqlSchema } from "../../../autobyteus-server-ts/src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../autobyteus-server-ts/src/api/websocket/agent.js";
import { appConfigProvider } from "../../../autobyteus-server-ts/src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { sendE2eSendMessageCommand } from "../../../autobyteus-server-ts/tests/e2e/helpers/websocket-command-helpers.js";

const prisma = new PrismaClient();
const TIMEOUT_MS = 300_000;
const EVENT_WAIT_TIMEOUT_MS = 180_000;
const evidenceDir = path.resolve(process.cwd(), "tickets/token-input-prompt-discrepancy-analysis/experiment-evidence");

type WsMessage = { type: string; payload: Record<string, unknown> };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString());
    if (typeof parsed.type !== "string") return null;
    const payload = parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
      ? parsed.payload as Record<string, unknown>
      : {};
    return { type: parsed.type, payload };
  } catch {
    return null;
  }
};

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => { clearTimeout(timer); resolve(); });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) return match;
    await wait(250);
  }
  const preview = messages.slice(Math.max(startIndex, messages.length - 20)).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 220)}`).join(" | ");
  throw new Error(`Timed out waiting for ${label}. preview=${preview}`);
};

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const chooseCodexModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) return override;
  for (const preferred of ["gpt-5.4-mini", "gpt-5.5", "gpt-5.4", "gpt-5.3-codex-spark", "gpt-5.3-codex"]) {
    if (modelIdentifiers.includes(preferred)) return preferred;
  }
  return modelIdentifiers.find((m) => m.toLowerCase().includes("codex")) ?? modelIdentifiers[0]!;
};

const sanitizePayload = (payload: Record<string, unknown>) => {
  const clone = JSON.parse(JSON.stringify(payload));
  // Payloads should not contain secrets; keep token/cost fields intact.
  return clone;
};

describe("codex runtime two-round token usage probe", () => {
  it("captures two sequential Codex App Server token usage events", async () => {
    const testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-two-round-token-probe-data-"));
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-two-round-token-probe-workspace-"));
    const createdRunIds = new Set<string>();
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let app: Awaited<ReturnType<typeof fastify>> | null = null;
    let socket: WebSocket | null = null;
    try {
      await writeFile(path.join(testDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      schema = await buildGraphqlSchema();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;

      const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
        const result = await graphql({ schema, source: query, variableValues: variables });
        if (result.errors?.length) throw result.errors[0];
        return result.data as T;
      };

      const modelsResult = await execGraphql<{ availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }> }>(`
        query Models($runtimeKind: String) {
          availableLlmProvidersWithModels(runtimeKind: $runtimeKind) { models { modelIdentifier } }
        }
      `, { runtimeKind: "codex_app_server" });
      const modelIdentifiers = modelsResult.availableLlmProvidersWithModels.flatMap((p) => p.models.map((m) => m.modelIdentifier).filter(Boolean));
      expect(modelIdentifiers.length).toBeGreaterThan(0);
      const llmModelIdentifier = chooseCodexModelIdentifier(modelIdentifiers);

      const agentResult = await execGraphql<{ createAgentDefinition: { id: string } }>(`
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) { id }
        }
      `, { input: {
        name: `codex-two-round-token-probe-${randomUUID()}`,
        role: "assistant",
        description: "codex runtime two-round token usage probe",
        instructions: "Reply directly and briefly. Do not use tools. If asked for a marker, output only that marker.",
        category: "runtime-probe",
        toolNames: [],
        skillNames: [],
      }});

      const runResult = await execGraphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(`
        mutation CreateAgentRun($input: CreateAgentRunInput!) {
          createAgentRun(input: $input) { success message runId }
        }
      `, { input: {
        agentDefinitionId: agentResult.createAgentDefinition.id,
        workspaceRootPath,
        llmModelIdentifier,
        autoExecuteTools: true,
        runtimeKind: "codex_app_server",
        llmConfig: { reasoning_effort: "low" },
        skillAccessMode: "NONE",
      }});
      expect(runResult.createAgentRun.success, runResult.createAgentRun.message).toBe(true);
      const runId = runResult.createAgentRun.runId!;
      createdRunIds.add(runId);

      app = fastify();
      await app.register(websocket);
      const dummyTeamHandler = { connect: async () => null, handleMessage: async () => {}, disconnect: async () => {} } as unknown as Parameters<typeof registerAgentWebsocket>[2];
      await registerAgentWebsocket(app, undefined, dummyTeamHandler);
      const address = await app.listen({ port: 0, host: "127.0.0.1" });
      const url = new URL(address);
      socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      const messages: WsMessage[] = [];
      socket.on("message", (raw) => {
        const parsed = parseWsMessage(raw);
        if (parsed) messages.push(parsed);
      });
      await waitForSocketOpen(socket);
      await waitForMessageAfter(messages, 0, (m) => m.type === "CONNECTED", "CONNECTED", 15_000);

      const stablePrefix = Array.from({ length: 260 }, (_, idx) => {
        const n = String(idx + 1).padStart(3, "0");
        return `CODEX_RUNTIME_CACHE_PROBE_PREFIX_${n}: alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu. Keep this line stable.`;
      }).join("\n");
      const sendRound = async (label: "warmup" | "probe", marker: string) => {
        const startIndex = messages.length;
        sendE2eSendMessageCommand(socket!, {
          content: `Token usage cache probe. Do not use tools. Stable prefix:\n${stablePrefix}\nReply exactly: ${marker}`,
        });
        await waitForMessageAfter(messages, startIndex, (m) => m.type === "AGENT_COMMAND_ACK" && m.payload.accepted === true, `${label} ack`, 30_000);
        const tokenUsageMessage = await waitForMessageAfter(messages, startIndex, (m) => {
          if (m.type !== "TOKEN_USAGE_UPDATED") return false;
          if (m.payload.run_id !== runId) return false;
          if (m.payload.runtime_kind !== "codex_app_server") return false;
          const total = asNumber(m.payload.accounting_total_tokens) ?? asNumber(m.payload.reported_total_tokens);
          return total !== null && total > 0;
        }, `${label} token usage`);
        await waitForMessageAfter(messages, startIndex, (m) => m.type === "AGENT_STATUS" && m.payload.status === "idle", `${label} idle`);
        return sanitizePayload(tokenUsageMessage.payload);
      };

      const warmupPayload = await sendRound("warmup", "WARMUP");
      const probePayload = await sendRound("probe", "PROBE");

      const summary = await execGraphql<{ getAgentRunTokenUsageSummary: Record<string, unknown> }>(`
        query RunTokenUsage($runId: String!) {
          getAgentRunTokenUsageSummary(runId: $runId) {
            runId inputTokens outputTokens totalTokens reasoningOutputTokens estimatedApiTotalCost currency apiCostStatus latestModelIdentifier latestRuntimeKind eventCount
          }
        }
      `, { runId });

      const evidence = {
        ok: true,
        provider: "codex_app_server_runtime",
        model: llmModelIdentifier,
        runId,
        completed_at: new Date().toISOString(),
        prompt_shape: { sequential_user_messages: 2, repeated_prefix_line_count: 260, second_message_same_stable_prefix: true },
        warmupPayload,
        probePayload,
        summary: summary.getAgentRunTokenUsageSummary,
      };
      await mkdir(evidenceDir, { recursive: true });
      const file = path.join(evidenceDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-codex-runtime-two-round.json`);
      await writeFile(file, JSON.stringify(evidence, null, 2));
      console.log(JSON.stringify({ ok: true, evidence_file: file, warmup: warmupPayload, probe: probePayload, summary: summary.getAgentRunTokenUsageSummary }, null, 2));
    } finally {
      try { socket?.close(); } catch {}
      try { await app?.close(); } catch {}
      for (const runId of createdRunIds) {
        try {
          await prisma.tokenUsageLedgerEvent.deleteMany({ where: { runId } });
        } catch {}
      }
      try { await getCodexAppServerClientManager().close(); } catch {}
      await rm(workspaceRootPath, { recursive: true, force: true }).catch(() => undefined);
      await rm(testDataDir, { recursive: true, force: true }).catch(() => undefined);
      await prisma.$disconnect().catch(() => undefined);
    }
  }, TIMEOUT_MS);
});
