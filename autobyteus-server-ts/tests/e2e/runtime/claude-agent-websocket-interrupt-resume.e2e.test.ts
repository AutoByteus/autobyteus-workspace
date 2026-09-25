import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, vi } from "vitest";
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
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

type SdkQueryCall = {
  prompt?: unknown;
  options?: Record<string, unknown>;
};

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeLiveClaudeRuntime =
  claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;
const LIVE_CLAUDE_TEST_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 180_000);
const LIVE_CLAUDE_STEP_TIMEOUT_MS = Number(
  process.env.CLAUDE_LIVE_INTERRUPT_STEP_TIMEOUT_MS || 90_000,
);

type FakeCliUserMessage = { uuid: string; message: { content: Array<{ type: string; text?: string }> } };

/**
 * Stand-in for one Claude CLI process behind the SDK streaming-input query: it reads user
 * messages from the real `ClaudeSdkClient` input channel and emits scripted SDK frames.
 */
class FakeClaudeCliQuery {
  readonly userTexts: string[] = [];
  readonly interrupt = vi.fn(async (_options?: unknown) => this.onInterrupt(this));
  readonly close = vi.fn(() => this.end());
  readonly supportedModels = vi.fn(async () => []);
  private readonly queue: unknown[] = [];
  private wake: (() => void) | null = null;
  private ended = false;

  constructor(
    prompt: AsyncIterable<FakeCliUserMessage>,
    readonly sessionId: string,
    private readonly onInput: (message: FakeCliUserMessage, cli: FakeClaudeCliQuery) => void,
    private readonly onInterrupt: (cli: FakeClaudeCliQuery) => unknown,
  ) {
    void (async () => {
      for await (const message of prompt) {
        this.userTexts.push(message.message.content.map((block) => block.text ?? "").join(""));
        this.onInput(message, this);
      }
    })();
  }

  emit(...frames: Array<Record<string, unknown>>): void {
    this.queue.push(...frames.map((frame) => ({ session_id: this.sessionId, ...frame })));
    this.signal();
  }

  init(): void {
    this.emit({ type: "system", subtype: "init", capabilities: ["interrupt_receipt_v1", "interrupt_cancel_queued_v1"] });
  }

  assistant(text: string): void {
    this.emit({ type: "assistant", message: { id: `msg-${randomUUID()}`, role: "assistant", content: [{ type: "text", text }] } });
  }

  toolUse(): void {
    this.emit({ type: "assistant", message: { id: `msg-${randomUUID()}`, role: "assistant", content: [{ type: "tool_use", id: "toolu-long", name: "Bash", input: { command: "python3 long.py" } }] } });
  }

  result(answers: string[], extra: Record<string, unknown> = {}): void {
    this.emit({ type: "result", subtype: "success", user_message_uuids: answers, terminal_reason: "completed", ...extra });
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<unknown> {
    while (true) {
      const frame = this.queue.shift();
      if (frame !== undefined) {
        yield frame;
        continue;
      }
      if (this.ended) return;
      await new Promise<void>((resolve) => { this.wake = resolve; });
    }
  }

  private end(): void {
    this.ended = true;
    this.signal();
  }

  private signal(): void {
    const wake = this.wake;
    this.wake = null;
    wake?.();
  }
}

const createFakeCliSdkClient = (input: {
  onInput: (message: FakeCliUserMessage, cli: FakeClaudeCliQuery) => void;
  onInterrupt?: (cli: FakeClaudeCliQuery) => unknown;
}): { sdkClient: ClaudeSdkClient; sdkCalls: SdkQueryCall[]; clis: FakeClaudeCliQuery[] } => {
  const sdkCalls: SdkQueryCall[] = [];
  const clis: FakeClaudeCliQuery[] = [];
  const sdkClient = new ClaudeSdkClient();
  sdkClient.setCachedModuleForTesting({
    query: vi.fn((call: SdkQueryCall) => {
      sdkCalls.push(call);
      const sessionId = String(call.options?.sessionId ?? call.options?.resume);
      const cli = new FakeClaudeCliQuery(
        call.prompt as AsyncIterable<FakeCliUserMessage>,
        sessionId,
        input.onInput,
        input.onInterrupt ?? (() => ({ still_queued: [], cancelled: [] })),
      );
      clis.push(cli);
      return cli;
    }),
  });
  return { sdkClient, sdkCalls, clis };
};

const createClaudeRunContext = (input: {
  runId: string;
  modelIdentifier?: string;
  workspaceRoot?: string;
}): AgentRunContext<ClaudeAgentRunContext> => {
  const workspaceRoot = input.workspaceRoot ?? process.cwd();
  const carpenterSystemPrompt = composeSharedCarpenterPrompt({
    agentDefinition: {
      name: "Claude WebSocket E2E Agent",
      description: "Exercises Claude create and resume instruction projection",
      instructions: "Keep persistent instructions separate from user turns.",
    },
  });
  return new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      agentDefinitionId: "agent-claude-ws",
      llmModelIdentifier: input.modelIdentifier ?? "claude-test-model",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: input.modelIdentifier ?? "claude-test-model",
        workingDirectory: workspaceRoot,
        permissionMode: "default",
      }),
      carpenterSystemPrompt,
      runtimeToolExposure: buildRuntimeAgentToolExposure([]),
      skillAccessMode: SkillAccessMode.NONE,
    }),
  });
};

const createClaudeAgentRun = async (input: {
  runId: string;
  sdkClient: ClaudeSdkClient;
  modelIdentifier?: string;
  workspaceRoot?: string;
}): Promise<{
  agentRun: AgentRun;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
  sessionManager: ClaudeSessionManager;
}> => {
  const runContext = createClaudeRunContext({
    runId: input.runId,
    modelIdentifier: input.modelIdentifier,
    workspaceRoot: input.workspaceRoot,
  });
  const sessionManager = new ClaudeSessionManager(
    { activateForRun: () => ({ kind: "not_exposed" as const }) } as never,
    {} as never,
    input.sdkClient,
    { cleanupMaterializedWorkspaceSkills: async () => undefined } as never,
  );
  const session = await sessionManager.createRunSession(runContext);
  const backend = new ClaudeAgentRunBackend(runContext, session);
  return {
    agentRun: new AgentRun({ providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      context: runContext,
      backend,
    }),
    runContext,
    sessionManager,
  };
};

const waitForMessage = (socket: WebSocket, timeoutMs: number = 2_000): Promise<string> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket message")), timeoutMs);
    socket.once("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
  });

const waitForJsonMessage = (
  socket: WebSocket,
  predicate: (message: { type?: string; payload?: Record<string, unknown> }) => boolean,
  label: string,
  timeoutMs: number = 2_000,
): Promise<{ type?: string; payload?: Record<string, unknown> }> =>
  new Promise((resolve, reject) => {
    const seen: string[] = [];
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error(`Timed out waiting for ${label}; seen messages: ${seen.join(" | ")}`));
    }, timeoutMs);
    const onMessage = (data: WebSocket.RawData) => {
      const raw = data.toString();
      seen.push(raw);
      let parsed: { type?: string; payload?: Record<string, unknown> };
      try {
        parsed = JSON.parse(raw) as { type?: string; payload?: Record<string, unknown> };
      } catch {
        return;
      }
      if (!predicate(parsed)) {
        return;
      }
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(parsed);
    };
    socket.on("message", onMessage);
  });

const waitForAccumulatedSegmentContent = (
  socket: WebSocket,
  expectedText: string,
  label: string,
  timeoutMs: number = 2_000,
): Promise<string> =>
  new Promise((resolve, reject) => {
    let accumulated = "";
    const seen: string[] = [];
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(
        new Error(
          `Timed out waiting for ${label}; accumulated='${accumulated}'; seen messages: ${seen.join(" | ")}`,
        ),
      );
    }, timeoutMs);
    const onMessage = (data: WebSocket.RawData) => {
      const raw = data.toString();
      seen.push(raw);
      let parsed: { type?: string; payload?: Record<string, unknown> };
      try {
        parsed = JSON.parse(raw) as { type?: string; payload?: Record<string, unknown> };
      } catch {
        return;
      }
      if (parsed.type !== "SEGMENT_CONTENT" || typeof parsed.payload?.delta !== "string") {
        return;
      }
      accumulated += parsed.payload.delta;
      if (!accumulated.includes(expectedText)) {
        return;
      }
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(accumulated);
    };
    socket.on("message", onMessage);
  });

const waitForOpen = (socket: WebSocket, timeoutMs: number = 2_000): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const waitForCondition = async (
  predicate: () => boolean,
  label: string,
  timeoutMs = 2_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const createWorkspace = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const createClaudeWebSocketHarnessWithSdkClient = async (input: {
  runId: string;
  sdkClient: ClaudeSdkClient;
  sdkCalls: SdkQueryCall[];
  modelIdentifier?: string;
  workspaceRoot?: string;
}): Promise<{
  app: FastifyInstance;
  socket: WebSocket;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
  sdkCalls: SdkQueryCall[];
  sessionManager: ClaudeSessionManager;
}> => {
  const { agentRun, runContext, sessionManager } = await createClaudeAgentRun({
    runId: input.runId,
    sdkClient: input.sdkClient,
    modelIdentifier: input.modelIdentifier,
    workspaceRoot: input.workspaceRoot,
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
  const commandCoordinator = new AgentRunCommandCoordinator({
    agentRunService: agentRunService as never,
    projectionService: statusProjectionService as never,
  });
  const handler = new AgentStreamHandler(
    new AgentSessionManager(),
    agentRunService as never,
    undefined,
    undefined,
    commandCoordinator,
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
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  const url = new URL(address);
  const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${input.runId}`);
  const connectedPromise = waitForMessage(socket);

  await waitForOpen(socket);
  const connectedMessage = JSON.parse(await connectedPromise) as {
    type: string;
    payload: { agent_id?: string };
  };
  expect(connectedMessage).toMatchObject({
    type: "CONNECTED",
    payload: { agent_id: input.runId },
  });

  return {
    app,
    socket,
    runContext,
    sdkCalls: input.sdkCalls,
    sessionManager,
  };
};

const closeHarness = async (harness: {
  app: FastifyInstance;
  socket: WebSocket;
  sessionManager: ClaudeSessionManager;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
}): Promise<void> => {
  if (
    harness.socket.readyState === WebSocket.OPEN ||
    harness.socket.readyState === WebSocket.CONNECTING
  ) {
    harness.socket.close();
  }
  await harness.sessionManager.closeRunSession(harness.runContext.runId);
  await harness.app.close();
};

describe("Claude Agent SDK websocket streaming session (fake CLI)", () => {
  it("interrupts only the turn and answers the follow-up from the same Claude process and conversation (AC-005)", async () => {
    const runId = "claude-ws-interrupt-same-process";
    const marker = "E2E_CONTEXT_MARKER_AFTER_INTERRUPT_7419";
    let activeUuid: string | null = null;
    const { sdkClient, sdkCalls, clis } = createFakeCliSdkClient({
      onInput: (message, cli) => {
        cli.init();
        if (cli.userTexts.length === 1) {
          activeUuid = message.uuid;
          cli.toolUse();
          return;
        }
        cli.assistant(cli.userTexts[0]?.includes(marker)
          ? `remembered provider context marker: ${marker}`
          : "new conversation: no remembered provider context marker");
        cli.result([message.uuid]);
      },
      onInterrupt: (cli) => {
        queueMicrotask(() => cli.emit({
          type: "result", subtype: "error_during_execution", is_error: true,
          user_message_uuids: [activeUuid], terminal_reason: "aborted_tools",
        }));
        return { still_queued: [], cancelled: [] };
      },
    });
    const harness = await createClaudeWebSocketHarnessWithSdkClient({ runId, sdkClient, sdkCalls });

    try {
      const reservedSessionId = harness.sessionManager.requireRunSession(runId).sessionId;
      sendE2eSendMessageCommand(harness.socket, { content: `Remember this exact marker before I interrupt you: ${marker}` });
      await waitForCondition(() => clis[0]?.userTexts.length === 1, "first input reaches the fake CLI");
      expect(sdkCalls[0]?.options?.sessionId).toBe(reservedSessionId);
      expect(typeof sdkCalls[0]?.prompt).not.toBe("string");
      expect(sdkCalls[0]?.options?.systemPrompt).toBe(harness.runContext.runtimeContext.carpenterSystemPrompt);

      const interrupted = waitForJsonMessage(harness.socket, (message) => message.type === "TURN_INTERRUPTED", "TURN_INTERRUPTED");
      harness.socket.send(JSON.stringify({
        type: "INTERRUPT_GENERATION",
        payload: { command_id: "client_interrupt_claude_same_process" },
      }));
      await interrupted;
      expect(clis[0]?.interrupt).toHaveBeenCalledWith({ cancelQueued: true });

      const remembered = waitForAccumulatedSegmentContent(
        harness.socket,
        `remembered provider context marker: ${marker}`,
        "follow-up reply from the same process",
      );
      sendE2eSendMessageCommand(harness.socket, { content: "What exact marker did I ask you to remember?" });
      await remembered;

      expect(sdkCalls).toHaveLength(1);
      expect(clis[0]?.close).not.toHaveBeenCalled();
      expect(clis[0]?.userTexts).toEqual([
        `Remember this exact marker before I interrupt you: ${marker}`,
        "What exact marker did I ask you to remember?",
      ]);
    } finally {
      await closeHarness(harness);
    }
    expect(clis[0]?.close).toHaveBeenCalled();
  });

  it("delivers a message sent to a busy agent into the running turn (AC-003)", async () => {
    const runId = "claude-ws-busy-append";
    const written: string[] = [];
    const { sdkClient, sdkCalls, clis } = createFakeCliSdkClient({
      onInput: (message, cli) => {
        written.push(message.uuid);
        if (written.length === 1) {
          cli.init();
          cli.toolUse();
          return;
        }
        cli.emit({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu-long", content: "A_DONE" }] } });
        cli.assistant("A_DONE and BANANA");
        cli.result([...written]);
      },
    });
    const harness = await createClaudeWebSocketHarnessWithSdkClient({ runId, sdkClient, sdkCalls });

    try {
      sendE2eSendMessageCommand(harness.socket, { content: "run a 20 second command" });
      await waitForCondition(() => clis[0]?.userTexts.length === 1, "first input");
      const reply = waitForAccumulatedSegmentContent(harness.socket, "A_DONE and BANANA", "merged reply");
      sendE2eSendMessageCommand(harness.socket, { content: "also say BANANA" });
      await reply;
      await waitForJsonMessage(harness.socket, (message) => message.type === "TURN_COMPLETED", "single TURN_COMPLETED");

      expect(clis[0]?.userTexts).toEqual(["run a 20 second command", "also say BANANA"]);
      expect(sdkCalls).toHaveLength(1);
    } finally {
      await closeHarness(harness);
    }
  });

  it("announces a background completion and streams the turn Claude starts on its own (AC-002)", async () => {
    const runId = "claude-ws-background-notice";
    const { sdkClient, sdkCalls } = createFakeCliSdkClient({
      onInput: (message, cli) => {
        cli.init();
        cli.emit(
          { type: "system", subtype: "background_tasks_changed", tasks: [{ task_id: "bg-1", task_type: "local_bash", description: "Build app" }] },
          { type: "system", subtype: "task_started", task_id: "bg-1", description: "Build app", is_backgrounded: true },
        );
        cli.assistant("Build started in the background.");
        cli.result([message.uuid]);
        setTimeout(() => {
          cli.emit(
            { type: "system", subtype: "background_tasks_changed", tasks: [] },
            { type: "system", subtype: "task_notification", task_id: "bg-1", status: "completed", output_file: "/tmp/bg-1.out", summary: "done" },
          );
          cli.init();
          cli.assistant("Build finished: dist/app");
          cli.result([], { origin: { kind: "task-notification" } });
        }, 50);
      },
    });
    const harness = await createClaudeWebSocketHarnessWithSdkClient({ runId, sdkClient, sdkCalls });

    try {
      const notice = waitForJsonMessage(
        harness.socket,
        (message) => message.type === "SYSTEM_TASK_NOTIFICATION",
        "background task notice",
      );
      const report = waitForAccumulatedSegmentContent(harness.socket, "Build finished: dist/app", "provider-initiated report");
      sendE2eSendMessageCommand(harness.socket, { content: "build the app in the background" });

      expect((await notice).payload).toMatchObject({
        sender_id: "system.claude_background_task",
        content: "Background task completed: Build app (completed)",
      });
      await report;
      await waitForCondition(
        () => harness.runContext.runtimeContext.activeTurnId === null,
        "provider-initiated turn settles",
      );
    } finally {
      await closeHarness(harness);
    }
  });
});

describeLiveClaudeRuntime("Claude Agent SDK websocket interrupt/resume live E2E", () => {
  it(
    "uses the real Claude SDK to preserve context after INTERRUPT_GENERATION interrupts an incomplete turn",
    async () => {
      const workspaceRoot = await createWorkspace("claude-live-interrupt-ws");
      const marker = `LIVE_INTERRUPT_CONTEXT_${randomUUID()}`;
      const targetFilePath = path.join(workspaceRoot, "interrupt-approval-target.txt");
      const runId = `claude-live-ws-${randomUUID()}`;
      const harness = await createClaudeWebSocketHarnessWithSdkClient({
        runId,
        sdkClient: new ClaudeSdkClient(),
        sdkCalls: [],
        modelIdentifier: "haiku",
        workspaceRoot,
      });

      try {
        const approvalRequestPromise = waitForJsonMessage(
          harness.socket,
          (message) => message.type === "TOOL_APPROVAL_REQUESTED",
          "live Claude tool approval request before interrupt",
          LIVE_CLAUDE_STEP_TIMEOUT_MS,
        );
        sendE2eSendMessageCommand(harness.socket, {
              content: [
                `Remember this exact marker for the next user message: ${marker}`,
                "Before answering, call the Write tool exactly once.",
                "Do not use Bash.",
                `Create this file path: ${targetFilePath}`,
                `Write exactly this one line into the file: ${marker}`,
                "Do not ask follow-up questions.",
                "Do not provide the final answer until after the tool call is approved.",
              ].join("\n"),
            });

        await approvalRequestPromise;
        const providerSessionId = harness.sessionManager.requireRunSession(runId).sessionId;
        expect(providerSessionId).toBeTruthy();
        expect(providerSessionId).not.toBe(runId);
        expect(harness.runContext.runtimeContext.hasCompletedTurn).toBe(false);

        harness.socket.send(JSON.stringify({
          type: "INTERRUPT_GENERATION",
          payload: { command_id: "client_interrupt_claude_live" },
        }));
        await waitForCondition(
          () => harness.runContext.runtimeContext.activeTurnId === null,
          "live Claude interrupt settlement",
          LIVE_CLAUDE_STEP_TIMEOUT_MS,
        );
        expect(fsSync.existsSync(targetFilePath)).toBe(false);

        const rememberedMarkerPromise = waitForAccumulatedSegmentContent(
          harness.socket,
          marker,
          "live Claude resumed follow-up response containing remembered marker",
          LIVE_CLAUDE_STEP_TIMEOUT_MS,
        );
        sendE2eSendMessageCommand(harness.socket, {
              content: [
                "What exact marker did I ask you to remember before I interrupted you?",
                "Reply with only that marker and no other words.",
              ].join("\n"),
            });

        const resumedResponseText = await rememberedMarkerPromise;
        expect(resumedResponseText).toContain(marker);
        expect(harness.sessionManager.requireRunSession(runId).sessionId).toBe(providerSessionId);
      } finally {
        await closeHarness(harness);
        await fs.rm(workspaceRoot, { recursive: true, force: true });
      }
    },
    LIVE_CLAUDE_TEST_TIMEOUT_MS,
  );
});
