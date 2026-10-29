/**
 * Credential-free WebSocket regression: eight scripted-provider cases plus one live case.
 * Prerequisites: workspace dependencies and server prebuild. Ungated cases own one Node
 * child per Query; provider frames and initialization are simulated, not SDK inference.
 * Run with a clean private HOME:
 * pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch
 * RUN_CLAUDE_E2E=1 and a ready Claude CLI enable the separate live interrupt case.
 * Optional scoped typecheck (this file and normal imports, inherited build compiler policy):
 * pnpm -C autobyteus-server-ts typecheck:claude-interrupt-resume-e2e
 * Run server prebuild first for shared outputs/Prisma. Any compiler diagnostic fails;
 * a clean scoped result is not a repository-wide test-typecheck or live-provider pass.
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Options, SpawnedProcess } from "@anthropic-ai/claude-agent-sdk";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import WebSocket from "ws";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import type { AgentRunStatusProjection } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { AgentRunCommandCoordinator } from "../../../src/agent-execution/services/agent-run-command-coordinator.js";
import { ClaudeAgentRunBackend } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { ClaudeAgentRunContext } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSessionManager } from "../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
import type { AgentToolMcpRunSessionAuthority } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { composeSharedCarpenterPrompt } from "../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { ClaudeSdkClient, type ClaudeSdkQueryLike } from "../../../src/runtime-management/claude/client/claude-sdk-client.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { recordCase } from "../helpers/runtime-error-case-evidence.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { startAgentToolsMcpTestHost } from "../../helpers/agent-tools-mcp-test-host.js";

type SdkQueryCall = {
  prompt?: unknown;
  options?: Record<string, unknown> & Pick<Options, "cwd" | "env" | "spawnClaudeCodeProcess">;
};

const ownedCliFixture = fileURLToPath(new URL("../../fixtures/claude-owned-sdk-cli.mjs", import.meta.url));

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
 * Scripts provider frames from the real input channel. Public initialization is simulated;
 * the child acquired through the production-controlled spawn hook has a real EOF/IO lifetime.
 */
class FakeClaudeCliQuery implements ClaudeSdkQueryLike {
  readonly userTexts: string[] = [];
  readonly interrupt = vi.fn(async (_options?: unknown) => this.onInterrupt(this));
  readonly close = vi.fn(() => this.end());
  readonly supportedModels = vi.fn(async () => []);
  private readonly initialization = Promise.resolve({ commands: [], models: [] });
  readonly initializationResult = vi.fn(() => this.initialization);
  readonly stdin: SpawnedProcess["stdin"];
  readonly stdout: SpawnedProcess["stdout"];
  readonly inputPump: Promise<PromiseSettledResult<void>>;
  childError: Error | undefined;
  private readonly queue: unknown[] = [];
  private wake: (() => void) | null = null;
  private ended = false;

  constructor(
    prompt: AsyncIterable<FakeCliUserMessage>,
    readonly sessionId: string,
    readonly child: SpawnedProcess,
    private readonly onInput: (message: FakeCliUserMessage, cli: FakeClaudeCliQuery) => void,
    private readonly onInterrupt: (cli: FakeClaudeCliQuery) => unknown,
  ) {
    // Retain public streams now: facade getters are deliberately unavailable after release.
    this.stdin = child.stdin;
    this.stdout = child.stdout;
    child.on("error", (error) => { this.childError = error; });
    this.inputPump = (async () => {
      for await (const message of prompt) {
        this.userTexts.push(message.message.content.map((block) => block.text ?? "").join(""));
        this.onInput(message, this);
      }
    })().then(
      () => ({ status: "fulfilled" as const, value: undefined }),
      (reason: unknown) => ({ status: "rejected" as const, reason }),
    ); // Observe immediately; teardown joins and surfaces a rejected input pump.
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
    if (this.ended) return;
    this.ended = true;
    this.stdin.end();
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
      const options = call.options;
      if (typeof options?.spawnClaudeCodeProcess !== "function") {
        throw new Error("Fake Claude Query requires the production-controlled spawn hook.");
      }
      const child = options.spawnClaudeCodeProcess({
        command: process.execPath,
        args: [ownedCliFixture],
        cwd: options.cwd,
        env: options.env ?? {},
        signal: new AbortController().signal,
      });
      const sessionId = String(options.sessionId ?? options.resume);
      const cli = new FakeClaudeCliQuery(
        call.prompt as AsyncIterable<FakeCliUserMessage>,
        sessionId,
        child,
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
  workspaceRoot: string;
}): AgentRunContext<ClaudeAgentRunContext> => {
  const carpenterSystemPrompt = composeSharedCarpenterPrompt({
    agentDefinition: new AgentDefinition({
      name: "Claude WebSocket E2E Agent",
      description: "Exercises Claude create and resume instruction projection",
      instructions: "Keep persistent instructions separate from user turns.",
    }),
  });
  return new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      agentDefinitionId: "agent-claude-ws",
      llmModelIdentifier: input.modelIdentifier ?? "claude-test-model",
      autoExecuteTools: false,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: input.modelIdentifier ?? "claude-test-model",
        workingDirectory: input.workspaceRoot,
        permissionMode: "default",
      }),
      carpenterSystemPrompt,
      runtimeToolExposure: buildRuntimeAgentToolExposure([]),
    }),
  });
};

const createClaudeAgentRun = async (input: {
  runId: string;
  sdkClient: ClaudeSdkClient;
  modelIdentifier?: string;
  workspaceRoot: string;
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
  // Every run has an Agent Tools MCP session, so the live Claude run needs a live endpoint.
  const agentTools = await startAgentToolsMcpTestHost();
  onTestFinished(() => agentTools.close());
  const agentToolMcpRunSessions: AgentToolMcpRunSessionAuthority = agentTools.runSessions;
  const sessionManager = new ClaudeSessionManager(
    agentToolMcpRunSessions,
    {} as never,
    input.sdkClient,
    { cleanupMaterializedWorkspaceSkills: async () => undefined } as never,
  );
  // The test holds the returned session itself, so it needs no ownership callback.
  const session = await sessionManager.createRunSession(runContext, () => undefined);
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

const createWorkspace = async (label: string): Promise<string> => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));
  onTestFinished(() => fs.rm(workspace, { recursive: true, force: true }));
  return workspace;
};

const createClaudeWebSocketHarnessWithSdkClient = async (input: {
  runId: string;
  sdkClient: ClaudeSdkClient;
  sdkCalls: SdkQueryCall[];
  modelIdentifier?: string;
  workspaceRoot?: string;
}): Promise<{
  app: FastifyInstance;
  socket: WebSocket;
  agentRun: AgentRun;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
  sdkCalls: SdkQueryCall[];
  sessionManager: ClaudeSessionManager;
}> => {
  const workspaceRoot = input.workspaceRoot ?? await createWorkspace("claude-fake-ws");
  const { agentRun, runContext, sessionManager } = await createClaudeAgentRun({
    runId: input.runId,
    sdkClient: input.sdkClient,
    modelIdentifier: input.modelIdentifier,
    workspaceRoot,
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
  let socket: WebSocket | undefined;
  try {
    await app.register(websocket);
    await registerAgentWebsocket(app, handler, dummyTeamHandler);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${input.runId}`);
    const [, connected] = await Promise.all([waitForOpen(socket), waitForMessage(socket)]);
    const connectedMessage = JSON.parse(connected) as {
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
      agentRun,
      runContext,
      sdkCalls: input.sdkCalls,
      sessionManager,
    };
  } catch (error) {
    try { await closeHarness({ app, socket, sessionManager, runContext }); }
    catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Claude WebSocket setup/owned cleanup failed.");
    }
    throw error;
  }
};

const expectOwnedChildRunning = (cli: FakeClaudeCliQuery): void => {
  expect(cli.childError).toBeUndefined();
  expect(cli.child.exitCode).toBeNull();
  expect(cli.child.signalCode).toBeNull();
  expect(cli.stdin.writableEnded).toBe(false);
  expect(cli.stdout.closed).toBe(false);
};

const closeHarness = async (harness: {
  app: FastifyInstance;
  socket?: WebSocket;
  sessionManager: ClaudeSessionManager;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
}, clis: FakeClaudeCliQuery[] = [], failures: unknown[] = []): Promise<void> => {
  const errors = [...failures];
  const attempt = async (release: () => unknown) => {
    try { await release(); } catch (error) { errors.push(error); }
  };
  await attempt(async () => {
    const socket = harness.socket;
    if (!socket) return;
    const socketClosed = (): boolean => socket.readyState === WebSocket.CLOSED;
    if (socketClosed()) return;
    if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
    else socket.close();
    try {
      await waitForCondition(socketClosed, "owned websocket closes");
    } finally {
      if (!socketClosed()) socket.terminate();
    }
  });
  await attempt(() => harness.sessionManager.closeRunSession(harness.runContext.runId));
  await attempt(() => expect(harness.sessionManager.hasRunSession(harness.runContext.runId)).toBe(false));
  for (const cli of clis) {
    await attempt(async () => {
      const pump = await cli.inputPump;
      if (pump.status === "rejected") throw pump.reason;
    });
    await attempt(() => {
      expect(cli.initializationResult).toHaveBeenCalledTimes(1);
      expect(cli.close).toHaveBeenCalled();
      expect(cli.childError).toBeUndefined();
      expect(cli.child.exitCode).toBe(0); // Physical exit, not a close call or killed flag.
      expect(cli.child.signalCode).toBeNull();
      expect(cli.stdin.closed).toBe(true);
      expect(cli.stdout.closed).toBe(true);
    });
  }
  await attempt(() => harness.app.close());
  if (errors.length) throw new AggregateError(errors, "Claude WebSocket test/owned cleanup failed.");
};

const withHarness = async (
  harness: Awaited<ReturnType<typeof createClaudeWebSocketHarnessWithSdkClient>>,
  clis: FakeClaudeCliQuery[],
  action: () => Promise<void>,
): Promise<void> => {
  const failures: unknown[] = [];
  try {
    await action();
    if (clis.length) {
      expect(clis).toHaveLength(1);
      expectOwnedChildRunning(clis[0]!);
    }
  } catch (error) { failures.push(error); }
  // Keep assertion failures alongside cleanup errors instead of a finally masking them.
  await closeHarness(harness, clis, failures);
};

describe("Claude Agent SDK websocket streaming session (fake CLI)", () => {
  it.each([
    ["API-CL01", { errors: ["Rate limit reached. token=PRIVATE_CLAUDE_SECRET", "Try again later."] },
      "Rate limit reached. token=<redacted>\nTry again later."],
    ["API-CL02", { errors: ["Workspace temporarily unavailable. <img src=x onerror=alert(1)>"] },
      "Workspace temporarily unavailable. <img src=x onerror=alert(1)>"],
    ["API-CL03", { result: "Existing scalar cause", errors: ["Ignored list cause"] }, "Existing scalar cause"],
    ["API-CL04", { errors: [null, {}, "  "] }, "Claude runtime returned an error result."],
  ])("%s preserves supplied SDK failure text over public WebSocket and the next same-session turn", async (id, failure, expected) =>
    recordCase(String(id), async () => {
      const workspace = await createWorkspace("claude-runtime-error");
      let firstUuid = "";
      const { sdkClient, sdkCalls, clis } = createFakeCliSdkClient({ onInput: (message, cli) => {
        if (cli.userTexts.length === 1) {
          firstUuid = message.uuid;
          cli.init();
          cli.emit({ type: "assistant", message: { id: `msg-${randomUUID()}`, role: "assistant", content: [
            { type: "text", text: "CLAUDE_PARTIAL_WORK" },
            { type: "tool_use", id: "toolu-long", name: "Bash", input: { command: "echo CLAUDE_COMPLETED_WORK" } },
          ] } });
        } else { cli.assistant("CLAUDE_NEXT_TURN_OK"); cli.result([message.uuid]); }
      } });
      const runId = `claude-runtime-error-${id}`;
      const harness = await createClaudeWebSocketHarnessWithSdkClient({ runId, sdkClient, sdkCalls, workspaceRoot: workspace });
      const frames: Array<{ type: string; payload: Record<string, unknown> }> = [];
      harness.socket.on("message", (raw) => frames.push(JSON.parse(String(raw))));
      await withHarness(harness, clis, async () => {
        const sessionId = harness.sessionManager.requireRunSession(runId).sessionId;
        const failed = waitForJsonMessage(harness.socket, (frame) => frame.type === "ERROR" && frame.payload?.error_effect === "terminal", "SDK terminal error");
        const [observed] = await Promise.all([failed, (async () => {
          const started = waitForJsonMessage(harness.socket, (frame) => frame.type === "TOOL_EXECUTION_STARTED", "provider tool start");
          sendE2eSendMessageCommand(harness.socket, { content: "Ordinary work that fails." });
          await started;
          // Emulate the normal external tool→next model call sequence, not one synchronous SDK burst
          // whose future terminal state can outrun the run's serialized source-event pipeline.
          const succeeded = waitForJsonMessage(harness.socket, (frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED", "provider tool completes");
          clis[0]!.emit({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu-long", content: "CLAUDE_COMPLETED_WORK" }] } });
          await succeeded;
          clis[0]!.result([firstUuid], { subtype: "error_during_execution", is_error: true,
            ...failure as Record<string, unknown>, response: "PRIVATE_RESPONSE_MARKER" });
        })()]);
        expect(observed.payload).toMatchObject({ code: "CLAUDE_RUNTIME_TURN_FAILED", error_scope: "turn", error_effect: "terminal" });
        expect(observed.payload?.message).toBe(`CLAUDE_RUNTIME_RESULT_ERROR: ${expected}`);
        expect(frames.some((frame) => frame.type === "TURN_COMPLETED")).toBe(false);
        expect(frames.filter((frame) => frame.type === "ERROR")).toHaveLength(1);
        const completed = frames.filter((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED");
        expect(completed).toHaveLength(1);
        expect(JSON.stringify(frames)).toContain("CLAUDE_PARTIAL_WORK");
        expect(JSON.stringify(frames)).toContain("CLAUDE_COMPLETED_WORK");
        expect(JSON.stringify(frames)).not.toMatch(/PRIVATE_CLAUDE_SECRET|PRIVATE_RESPONSE_MARKER|\[object Object\]/);
        expect(clis[0]?.userTexts).toHaveLength(1); // No automatic send/retry.
        const nextStart = frames.length;
        const next = waitForJsonMessage(harness.socket, (frame) => frame.type === "TURN_COMPLETED", "next user completion");
        sendE2eSendMessageCommand(harness.socket, { content: "Continue the same work." });
        await next;
        expect(frames.slice(nextStart).some((frame) => frame.type === "ERROR")).toBe(false);
        expect(frames.filter((frame) => frame.type === "TOOL_EXECUTION_SUCCEEDED")).toEqual(completed);
        expect(JSON.stringify(frames.slice(nextStart))).toContain("CLAUDE_NEXT_TURN_OK");
        expect(sdkCalls).toHaveLength(1); expect(sdkCalls[0]?.options?.sessionId).toBe(sessionId);
        expect(harness.sessionManager.requireRunSession(runId).sessionId).toBe(sessionId);
        expect(clis[0]?.userTexts).toEqual(["Ordinary work that fails.", "Continue the same work."]);
        const dir = process.env["AGY_ERROR_EVIDENCE_DIR"];
        if (dir) await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({ expected, frames, sessionId, sdkCalls: sdkCalls.length }, null, 2) + "\n");
      });
      expect(clis[0]?.close).toHaveBeenCalled();
    }));

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

    await withHarness(harness, clis, async () => {
      const reservedSessionId = harness.sessionManager.requireRunSession(runId).sessionId;
      sendE2eSendMessageCommand(harness.socket, { content: `Remember this exact marker before I interrupt you: ${marker}` });
      await waitForCondition(() => clis[0]?.userTexts.length === 1, "first input reaches the fake CLI");
      expectOwnedChildRunning(clis[0]!);
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
      expectOwnedChildRunning(clis[0]!);

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
    });
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

    await withHarness(harness, clis, async () => {
      sendE2eSendMessageCommand(harness.socket, { content: "run a 20 second command" });
      await waitForCondition(() => clis[0]?.userTexts.length === 1, "first input");
      const reply = waitForAccumulatedSegmentContent(harness.socket, "A_DONE and BANANA", "merged reply");
      sendE2eSendMessageCommand(harness.socket, { content: "also say BANANA" });
      await reply;
      await waitForJsonMessage(harness.socket, (message) => message.type === "TURN_COMPLETED", "single TURN_COMPLETED");

      expect(clis[0]?.userTexts).toEqual(["run a 20 second command", "also say BANANA"]);
      expect(sdkCalls).toHaveLength(1);
    });
  });

  it("requeues an append that reaches Claude after its turn settled and starts it as the next turn (AC-016)", async () => {
    const runId = "claude-ws-append-after-settle";
    const turnOneUuids: string[] = [];
    const { sdkClient, sdkCalls, clis } = createFakeCliSdkClient({
      onInput: (message, cli) => {
        if (cli.userTexts.length === 1) {
          turnOneUuids.push(message.uuid);
          cli.init();
          cli.toolUse();
          return;
        }
        cli.init();
        cli.assistant("B_ANSWERED");
        cli.result([message.uuid]);
      },
    });
    const harness = await createClaudeWebSocketHarnessWithSdkClient({ runId, sdkClient, sdkCalls });
    const session = harness.sessionManager.requireRunSession(runId);
    const originalSubmit = session.submitInput.bind(session);
    const dispatchKinds: string[] = [];
    // The race: AgentRun still sees turn T active and claims B as an append, but Claude's
    // turn T settles (its result arrives) before B reaches the session.
    session.submitInput = async (message, dispatch) => {
      dispatchKinds.push(dispatch.kind);
      if (dispatch.kind === "append_to_active_turn" && dispatchKinds.length === 2) {
        clis[0]!.emit({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu-long", content: "A_DONE" }] } });
        clis[0]!.assistant("A_ANSWERED");
        clis[0]!.result([...turnOneUuids]);
        await waitForCondition(() => session.activeTurnId === null, "turn T settles before the append arrives");
      }
      return originalSubmit(message, dispatch);
    };

    await withHarness(harness, clis, async () => {
      sendE2eSendMessageCommand(harness.socket, { content: "run a long command" });
      await waitForCondition(() => clis[0]?.userTexts.length === 1 && session.activeTurnId !== null, "turn T running");
      const turnT = session.activeTurnId!;

      const facts: Array<Record<string, unknown>> = [];
      const bAnswered = waitForAccumulatedSegmentContent(harness.socket, "B_ANSWERED", "B answered in its own turn");
      const posted = await harness.agentRun.postUserMessage(
        new AgentInputUserMessage("B: message that arrives as T ends"),
        { lifecycleObserver: (fact) => facts.push({ ...fact }) },
      );
      expect(posted).toMatchObject({ accepted: true, turnId: turnT });
      await bAnswered;
      await waitForCondition(() => facts.some((fact) => fact.kind === "completed"), "B completes");

      expect(dispatchKinds).toEqual(["start_turn", "append_to_active_turn", "start_turn"]);
      const terminal = facts.filter((fact) => ["completed", "interrupted", "failed", "cancelled"].includes(String(fact.kind)));
      expect(terminal).toHaveLength(1);
      expect(terminal[0]).toMatchObject({ kind: "completed" });
      expect(terminal[0]!.turnId).not.toBe(turnT);
      expect(facts.some((fact) => fact.kind === "failed")).toBe(false);
      // B reached the CLI exactly once, after T, from the same process.
      expect(clis[0]?.userTexts).toEqual(["run a long command", "B: message that arrives as T ends"]);
      expect(sdkCalls).toHaveLength(1);
    });
  });

  it("announces a background completion and streams the turn Claude starts on its own (AC-002)", async () => {
    const runId = "claude-ws-background-notice";
    const { sdkClient, sdkCalls, clis } = createFakeCliSdkClient({
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

    await withHarness(harness, clis, async () => {
      const notice = waitForJsonMessage(
        harness.socket,
        (message) => message.type === "SYSTEM_TASK_NOTIFICATION",
        "background task notice",
      );
      const report = waitForAccumulatedSegmentContent(harness.socket, "Build finished: dist/app", "provider-initiated report");
      const noticesAndReport = Promise.all([notice, report]);
      sendE2eSendMessageCommand(harness.socket, { content: "build the app in the background" });

      const [observedNotice] = await noticesAndReport;
      expect(observedNotice.payload).toMatchObject({
        sender_id: "system.claude_background_task",
        content: "Background task completed: Build app (completed)",
      });
      await waitForCondition(
        () => harness.runContext.runtimeContext.activeTurnId === null,
        "provider-initiated turn settles",
      );
    });
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

      await withHarness(harness, [], async () => {
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
      });
    },
    LIVE_CLAUDE_TEST_TIMEOUT_MS,
  );
});
