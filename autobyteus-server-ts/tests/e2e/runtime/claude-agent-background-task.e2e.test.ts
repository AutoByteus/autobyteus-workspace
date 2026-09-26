import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  resolveClaudeCliExecutableCandidates,
} from "../../helpers/claude-cli-executable-candidates.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const cliCandidates = resolveClaudeCliExecutableCandidates();
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeLiveClaudeRuntime =
  liveClaudeTestsEnabled && cliCandidates.length > 0 ? describe : describe.skip;
const LIVE_TURN_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 180_000);
const BACKGROUND_COMMAND_SECONDS = 20;

type StreamMessage = { type?: string; payload?: Record<string, unknown> };

type LiveHarness = {
  app: FastifyInstance;
  socket: WebSocket;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
  sessionManager: ClaudeSessionManager;
  messages: StreamMessage[];
};

const createLiveHarness = async (input: {
  runId: string;
  workspaceRoot: string;
}): Promise<LiveHarness> => {
  const runContext = new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      agentDefinitionId: "agent-claude-background-task",
      llmModelIdentifier: "haiku",
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: "haiku",
        workingDirectory: input.workspaceRoot,
        permissionMode: "default",
        autoExecuteTools: true,
      }),
      carpenterSystemPrompt: composeSharedCarpenterPrompt({
        agentDefinition: {
          name: "Claude Background Task E2E Agent",
          description: "Runs shell commands for the user",
          instructions: "Do what the user asks with the available tools.",
        },
      }),
      runtimeToolExposure: buildRuntimeAgentToolExposure([]),
      skillAccessMode: SkillAccessMode.NONE,
    }),
  });
  const sessionManager = new ClaudeSessionManager(
    { activateForRun: () => ({ kind: "not_exposed" as const }) } as never,
    {} as never,
    new ClaudeSdkClient(),
    { cleanupMaterializedWorkspaceSkills: async () => undefined } as never,
  );
  const session = await sessionManager.createRunSession(runContext);
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
  return { app, socket, runContext, sessionManager, messages };
};

const closeHarness = async (harness: LiveHarness): Promise<void> => {
  if (harness.socket.readyState === WebSocket.OPEN || harness.socket.readyState === WebSocket.CONNECTING) {
    harness.socket.close();
  }
  await harness.sessionManager.closeRunSession(harness.runContext.runId);
  await harness.app.close();
};

const waitForStreamMessage = (
  harness: LiveHarness,
  predicate: (message: StreamMessage, index: number) => boolean,
  label: string,
): Promise<number> =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + LIVE_TURN_TIMEOUT_MS;
    const poll = () => {
      const index = harness.messages.findIndex(predicate);
      if (index >= 0) return resolve(index);
      if (Date.now() > deadline) {
        return reject(new Error(`Timed out waiting for ${label}; seen: ${harness.messages.map((m) => m.type).join(",")}`));
      }
      setTimeout(poll, 200);
    };
    poll();
  });

describeLiveClaudeRuntime("Claude runtime background tasks (live E2E, AC-002)", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup().catch(() => undefined);
    }
  });

  it.each(cliCandidates.map((candidate) => [candidate.label, candidate] as const))(
    "keeps a background Bash command running after the turn ends and reports it in a turn Claude starts itself (%s)",
    async (_label, candidate) => {
      // Behave like a standalone server process even when launched from a Claude Code session.
      const standaloneEnv = buildStandaloneClaudeProcessEnv();
      for (const key of Object.keys(process.env)) {
        if (!(key in standaloneEnv)) {
          vi.stubEnv(key, undefined);
        }
      }
      vi.stubEnv("CLAUDE_CODE_EXECUTABLE_PATH", candidate.executablePath);

      const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "claude-live-background-task-"));
      cleanups.push(() => fs.rm(workspaceRoot, { recursive: true, force: true }));
      const markerPath = path.join(workspaceRoot, "marker");
      const command = `sleep ${String(BACKGROUND_COMMAND_SECONDS)}; echo done > ${markerPath}`;
      const harness = await createLiveHarness({
        runId: `claude-live-background-task-${randomUUID()}`,
        workspaceRoot,
      });
      cleanups.push(() => closeHarness(harness));

      sendE2eSendMessageCommand(harness.socket, {
        content: [
          "Use the Bash tool with run_in_background set to true to run this exact command:",
          command,
          "Do not wait for it. Reply only STARTED and end your turn.",
          "When you are later notified that it finished, reply with the content of the marker file.",
        ].join("\n"),
      });

      const firstCompleted = await waitForStreamMessage(harness, (message) => message.type === "TURN_COMPLETED", "first TURN_COMPLETED");
      expect(fsSync.existsSync(markerPath), "the command is still running when the first turn ends").toBe(false);
      const bashStart = harness.messages.find((message) =>
        message.type === "TOOL_EXECUTION_STARTED" &&
        message.payload?.tool_name === "Bash" &&
        String((message.payload?.arguments as Record<string, unknown> | undefined)?.command ?? "").includes(markerPath));
      expect((bashStart?.payload?.arguments as Record<string, unknown> | undefined)?.run_in_background).toBe(true);

      const noticeIndex = await waitForStreamMessage(
        harness,
        (message, index) => index > firstCompleted && message.type === "SYSTEM_TASK_NOTIFICATION",
        "background completion notice",
      );
      const notice = harness.messages[noticeIndex]!;
      expect(notice.payload?.sender_id).toBe("system.claude_background_task");
      expect(String(notice.payload?.content)).toMatch(/^Background task completed: .+ \(completed\)$/u);
      await waitForStreamMessage(
        harness,
        (message, index) => index > noticeIndex && message.type === "TURN_COMPLETED",
        "Claude-initiated TURN_COMPLETED",
      );

      expect(fsSync.readFileSync(markerPath, "utf-8").trim()).toBe("done");
      const reportText = harness.messages
        .slice(noticeIndex)
        .filter((message) => message.type === "SEGMENT_CONTENT")
        .map((message) => String(message.payload?.delta ?? ""))
        .join("");
      expect(reportText.toLowerCase()).toContain("done");
      expect(JSON.stringify(harness.messages)).not.toContain("[killed]");
      expect(harness.sessionManager.requireRunSession(harness.runContext.runId).processState).toBe("OPEN");
    },
    LIVE_TURN_TIMEOUT_MS * 2,
  );
});
