import { spawnSync } from "node:child_process";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { vi } from "vitest";
import WebSocket from "ws";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import type { AgentRunStatusProjection } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { ClaudeAgentRunBackend } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { ClaudeAgentRunContext } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import type { ClaudeSession } from "../../../src/agent-execution/backends/claude/session/claude-session.js";
import { ClaudeSessionManager } from "../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { composeSharedCarpenterPrompt } from "../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { ClaudeSdkClient } from "../../../src/runtime-management/claude/client/claude-sdk-client.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  buildStandaloneClaudeProcessEnv,
  type ClaudeCliExecutableCandidate,
} from "../../helpers/claude-cli-executable-candidates.js";

export type StreamMessage = { type?: string; payload?: Record<string, unknown> };

export type ClaudeLiveAgentHarness = {
  app: FastifyInstance;
  socket: WebSocket;
  agentRun: AgentRun;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
  sessionManager: ClaudeSessionManager;
  session: ClaudeSession;
  messages: StreamMessage[];
};

export const LIVE_CLAUDE_TURN_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 180_000);

/**
 * Makes the test process behave like a standalone AutoByteus server (no parent Claude Code
 * session env) and selects the Claude CLI executable for this case.
 */
export const useStandaloneClaudeCli = (candidate: ClaudeCliExecutableCandidate): void => {
  const standaloneEnv = buildStandaloneClaudeProcessEnv();
  for (const key of Object.keys(process.env)) {
    if (!(key in standaloneEnv)) {
      vi.stubEnv(key, undefined);
    }
  }
  vi.stubEnv("CLAUDE_CODE_EXECUTABLE_PATH", candidate.executablePath);
};

const buildRunContext = (runId: string, workspaceRoot: string): AgentRunContext<ClaudeAgentRunContext> =>
  new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      agentDefinitionId: "agent-claude-live-e2e",
      llmModelIdentifier: "haiku",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: "haiku",
        workingDirectory: workspaceRoot,
        permissionMode: "default",
        autoExecuteTools: true,
      }),
      carpenterSystemPrompt: composeSharedCarpenterPrompt({
        agentDefinition: {
          name: "Claude Live E2E Agent",
          description: "Runs shell commands for the user",
          instructions: "Do what the user asks with the available tools. Keep replies short.",
        },
      }),
      runtimeToolExposure: buildRuntimeAgentToolExposure([]),
      skillAccessMode: SkillAccessMode.NONE,
    }),
  });

/**
 * Real AgentRun + Claude backend/session + real SDK/CLI behind the agent websocket. Pass
 * `restoreSessionId` to build a fresh stack that restores an existing Claude session, as a
 * restarted server does.
 */
export const createClaudeLiveAgentHarness = async (input: {
  runId: string;
  workspaceRoot: string;
  restoreSessionId?: string;
}): Promise<ClaudeLiveAgentHarness> => {
  const runContext = buildRunContext(input.runId, input.workspaceRoot);
  const sessionManager = new ClaudeSessionManager(
    { activateForRun: () => ({ kind: "not_exposed" as const }) } as never,
    {} as never,
    new ClaudeSdkClient(),
    { cleanupMaterializedWorkspaceSkills: async () => undefined } as never,
  );
  const session = input.restoreSessionId
    ? await sessionManager.restoreRunSession(runContext, input.restoreSessionId)
    : await sessionManager.createRunSession(runContext);
  const agentRun = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
    context: runContext,
    backend: new ClaudeAgentRunBackend(runContext, session),
  });

  const agentRunService = {
    getAgentRun: (runId: string) => (runId === input.runId ? agentRun : null),
    resolveAgentRun: async (runId: string) => (runId === input.runId ? agentRun : null),
    resolveCommandReadyAgentRun: async (runId: string) => {
      if (runId !== input.runId) throw new Error(`Unknown run '${runId}'.`);
      return agentRun;
    },
    recordRunActivity: async () => {},
  };
  const statusProjectionService = {
    getRunStatusProjection: async (runId: string): Promise<AgentRunStatusProjection> => {
      const snapshot = agentRun.getStatusSnapshot();
      return {
        runId,
        status: snapshot.status,
        canInterrupt: snapshot.can_interrupt === true,
        isActive: runId === input.runId,
        shouldConnectStream: runId === input.runId,
        lastKnownStatus: snapshot.status === "error" ? "ERROR" : "ACTIVE",
        statusSource: runId === input.runId ? "ACTIVE_RUNTIME" : "MISSING",
        statusPayload: snapshot,
        command: null,
      };
    },
  };
  const handler = new AgentStreamHandler(
    new AgentSessionManager(),
    agentRunService as never,
    undefined,
    undefined,
    new AgentRunCommandCoordinator({
      agentRunService: agentRunService as never,
      projectionService: statusProjectionService as never,
    }),
    statusProjectionService as never,
  );
  const dummyTeamHandler = {
    connect: async () => null,
    handleMessage: async () => {},
    disconnect: async () => {},
  } as unknown as Parameters<typeof registerAgentWebsocket>[2];

  const app = fastify();
  await app.register(websocket);
  await registerAgentWebsocket(app, handler, dummyTeamHandler);
  const url = new URL(await app.listen({ port: 0, host: "127.0.0.1" }));
  const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${input.runId}`);
  const messages: StreamMessage[] = [];
  socket.on("message", (data) => {
    try {
      messages.push(JSON.parse(data.toString()) as StreamMessage);
    } catch {
      // Non-JSON frames are not part of the agent stream contract.
    }
  });
  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
  return { app, socket, agentRun, runContext, sessionManager, session, messages };
};

export const closeClaudeLiveAgentHarness = async (harness: ClaudeLiveAgentHarness): Promise<void> => {
  if (harness.socket.readyState === WebSocket.OPEN || harness.socket.readyState === WebSocket.CONNECTING) {
    harness.socket.close();
  }
  await harness.sessionManager.closeRunSession(harness.runContext.runId);
  await harness.app.close();
};

/** Resolves with the index of the first stream message (after `fromIndex`) matching the predicate. */
export const waitForStreamMessage = (
  harness: Pick<ClaudeLiveAgentHarness, "messages">,
  predicate: (message: StreamMessage, index: number) => boolean,
  label: string,
  options: { fromIndex?: number; timeoutMs?: number } = {},
): Promise<number> =>
  new Promise((resolve, reject) => {
    const fromIndex = options.fromIndex ?? 0;
    const deadline = Date.now() + (options.timeoutMs ?? LIVE_CLAUDE_TURN_TIMEOUT_MS);
    const poll = () => {
      const index = harness.messages.findIndex((message, i) => i >= fromIndex && predicate(message, i));
      if (index >= 0) return resolve(index);
      if (Date.now() > deadline) {
        return reject(new Error(
          `Timed out waiting for ${label}; seen: ${harness.messages.map((m) => m.type).join(",")}`,
        ));
      }
      setTimeout(poll, 200);
    };
    poll();
  });

/** Assistant text streamed after `fromIndex`. */
export const assistantTextSince = (harness: Pick<ClaudeLiveAgentHarness, "messages">, fromIndex = 0): string =>
  harness.messages
    .slice(fromIndex)
    .filter((message) => message.type === "SEGMENT_CONTENT")
    .map((message) => String(message.payload?.delta ?? ""))
    .join("");

/** Pids of live processes whose command line contains `pattern` (e.g. a Claude session id). */
export const findProcessIds = (pattern: string): number[] => {
  const result = spawnSync("pgrep", ["-f", pattern], { encoding: "utf-8" });
  return result.stdout
    .split(/\s+/u)
    .map((entry) => Number(entry))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
};

/** Pids of Claude CLI processes serving `sessionId` (the SDK passes the id on the CLI argv). */
export const findClaudeCliProcessIds = (sessionId: string): number[] =>
  findProcessIds(sessionId).filter((pid) => {
    const command = spawnSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf-8" }).stdout;
    return /claude/iu.test(command) && !/pgrep|\bps\b/u.test(command);
  });

export const waitForCondition = async (
  predicate: () => boolean,
  label: string,
  timeoutMs = 15_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${label}`);
};
