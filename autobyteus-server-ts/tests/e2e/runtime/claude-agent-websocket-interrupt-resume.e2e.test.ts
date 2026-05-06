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
import { ClaudeAgentRunBackend } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { ClaudeAgentRunContext } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSessionManager } from "../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
import { buildConfiguredAgentToolExposure } from "../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { ClaudeTeamRunBackend } from "../../../src/agent-team-execution/backends/claude/claude-team-run-backend.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "../../../src/agent-team-execution/backends/claude/claude-team-run-context.js";
import type { TeamManager } from "../../../src/agent-team-execution/backends/team-manager.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import type { TeamRunEventListener } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import {
  ClaudeSdkClient,
  type ClaudeSdkQueryLike,
} from "../../../src/runtime-management/claude/client/claude-sdk-client.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

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

class ControlledClaudeQuery implements ClaudeSdkQueryLike {
  readonly interrupt = vi.fn(async () => {
    this.release();
  });

  readonly close = vi.fn(() => {
    this.release();
  });

  private readonly released: Promise<void>;
  private releaseWaiter!: () => void;

  constructor(
    private readonly chunks: unknown[],
    private readonly stayPendingAfterChunks: boolean,
  ) {
    this.released = new Promise<void>((resolve) => {
      this.releaseWaiter = resolve;
    });
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<unknown, void, unknown> {
    for (const chunk of this.chunks) {
      yield chunk;
    }
    if (this.stayPendingAfterChunks) {
      await this.released;
    }
  }

  private release(): void {
    this.releaseWaiter();
  }
}

const createProviderSessionThenPendingQuery = (providerSessionId: string): ControlledClaudeQuery =>
  new ControlledClaudeQuery(
    [
      {
        type: "assistant",
        session_id: providerSessionId,
        message: {
          id: "msg-provider-session",
          role: "assistant",
          content: [],
        },
      },
    ],
    true,
  );

const createPendingQueryWithoutProviderSession = (): ControlledClaudeQuery =>
  new ControlledClaudeQuery([], true);

const createCompletedQuery = (providerSessionId: string): ControlledClaudeQuery =>
  new ControlledClaudeQuery(
    [
      {
        type: "result",
        session_id: providerSessionId,
        result: "done",
      },
    ],
    false,
  );

const createAssistantTextQuery = (
  providerSessionId: string,
  text: string,
): ControlledClaudeQuery =>
  new ControlledClaudeQuery(
    [
      {
        type: "assistant",
        session_id: providerSessionId,
        message: {
          id: `msg-${providerSessionId}-response`,
          role: "assistant",
          content: [
            {
              type: "text",
              text,
            },
          ],
        },
      },
      {
        type: "result",
        session_id: providerSessionId,
        result: text,
      },
    ],
    false,
  );

const createFakeSdkClient = (
  queries: ControlledClaudeQuery[],
): { sdkClient: ClaudeSdkClient; sdkCalls: SdkQueryCall[] } => {
  const sdkCalls: SdkQueryCall[] = [];
  const queryQueue = [...queries];
  const sdkClient = new ClaudeSdkClient();
  sdkClient.setCachedModuleForTesting({
    query: vi.fn((call: SdkQueryCall) => {
      sdkCalls.push(call);
      const query = queryQueue.shift();
      if (!query) {
        throw new Error("No fake Claude SDK query queued for test.");
      }
      return query;
    }),
  });
  return { sdkClient, sdkCalls };
};

const createMemoryCheckingFakeSdkClient = (input: {
  providerSessionId: string;
  marker: string;
}): {
  sdkClient: ClaudeSdkClient;
  sdkCalls: SdkQueryCall[];
  firstQuery: ControlledClaudeQuery;
} => {
  const sdkCalls: SdkQueryCall[] = [];
  const providerMemory = new Map<string, string>();
  const firstQuery = createProviderSessionThenPendingQuery(input.providerSessionId);
  const sdkClient = new ClaudeSdkClient();
  sdkClient.setCachedModuleForTesting({
    query: vi.fn((call: SdkQueryCall) => {
      sdkCalls.push(call);
      const prompt = typeof call.prompt === "string" ? call.prompt : "";
      if (sdkCalls.length === 1) {
        if (prompt.includes(input.marker)) {
          providerMemory.set(input.providerSessionId, input.marker);
        }
        return firstQuery;
      }

      const resume = typeof call.options?.resume === "string" ? call.options.resume : null;
      const rememberedMarker = resume ? providerMemory.get(resume) : null;
      const responseText =
        rememberedMarker === input.marker
          ? `remembered provider context marker: ${rememberedMarker}`
          : "new conversation: no remembered provider context marker";
      return createAssistantTextQuery(
        resume ?? "fresh-provider-session-without-memory",
        responseText,
      );
    }),
  });
  return { sdkClient, sdkCalls, firstQuery };
};

const createClaudeRunContext = (input: {
  runId: string;
  modelIdentifier?: string;
  workspaceRoot?: string;
}): AgentRunContext<ClaudeAgentRunContext> =>
  new AgentRunContext({
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
        workingDirectory: input.workspaceRoot ?? process.cwd(),
        permissionMode: "default",
      }),
      configuredToolExposure: buildConfiguredAgentToolExposure([]),
      skillAccessMode: SkillAccessMode.NONE,
    }),
  });

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
  const sessionManager = new ClaudeSessionManager({} as never, input.sdkClient);
  const session = await sessionManager.createRunSession(runContext);
  const backend = new ClaudeAgentRunBackend(runContext, session);
  return {
    agentRun: new AgentRun({
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
    recordRunActivity: async () => {},
  };
  const handler = new AgentStreamHandler(
    new AgentSessionManager(),
    agentRunService as never,
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

const createClaudeWebSocketHarness = async (input: {
  runId: string;
  queries: ControlledClaudeQuery[];
}): Promise<{
  app: FastifyInstance;
  socket: WebSocket;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
  sdkCalls: SdkQueryCall[];
  sessionManager: ClaudeSessionManager;
}> => {
  const { sdkClient, sdkCalls } = createFakeSdkClient(input.queries);
  return createClaudeWebSocketHarnessWithSdkClient({
    runId: input.runId,
    sdkClient,
    sdkCalls,
  });
};

const createClaudeTeamWebSocketHarness = async (input: {
  teamRunId: string;
  memberRunId: string;
  memberName: string;
  queries: ControlledClaudeQuery[];
}): Promise<{
  app: FastifyInstance;
  socket: WebSocket;
  runContext: AgentRunContext<ClaudeAgentRunContext>;
  sdkCalls: SdkQueryCall[];
  sessionManager: ClaudeSessionManager;
}> => {
  const { sdkClient, sdkCalls } = createFakeSdkClient(input.queries);
  const { agentRun, runContext, sessionManager } = await createClaudeAgentRun({
    runId: input.memberRunId,
    sdkClient,
  });
  const memberConfig = new AgentRunConfig({
    agentDefinitionId: "agent-claude-team-ws",
    llmModelIdentifier: "claude-test-model",
    autoExecuteTools: false,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  });
  const memberContext = new ClaudeTeamMemberContext({
    memberName: input.memberName,
    memberRouteKey: input.memberName,
    memberRunId: input.memberRunId,
    agentRunConfig: memberConfig,
    sessionId: null,
    configuredToolExposure: buildConfiguredAgentToolExposure([]),
  });
  const teamContext = new TeamRunContext({
    runId: input.teamRunId,
    teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
    coordinatorMemberName: input.memberName,
    config: new TeamRunConfig({
      teamDefinitionId: "team-claude-ws",
      teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
      coordinatorMemberName: input.memberName,
      memberConfigs: [
        {
          memberName: input.memberName,
          memberRouteKey: input.memberName,
          memberRunId: input.memberRunId,
          agentDefinitionId: "agent-claude-team-ws",
          llmModelIdentifier: "claude-test-model",
          autoExecuteTools: false,
          skillAccessMode: SkillAccessMode.NONE,
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        },
      ],
    }),
    runtimeContext: new ClaudeTeamRunContext({
      coordinatorMemberRouteKey: input.memberName,
      memberContexts: [memberContext],
    }),
  });
  const fakeTeamManager: TeamManager = {
    hasActiveMembers: () => true,
    postMessage: async (message, targetMemberName) => {
      expect(targetMemberName).toBe(input.memberName);
      const result = await agentRun.postUserMessage(message);
      memberContext.sessionId = agentRun.getPlatformAgentRunId() ?? memberContext.sessionId;
      return {
        ...result,
        memberRunId: input.memberRunId,
        memberName: input.memberName,
      };
    },
    deliverInterAgentMessage: async () => ({ accepted: true }),
    approveToolInvocation: async () => ({ accepted: true }),
    interrupt: async () => agentRun.interrupt(),
    terminate: async () => agentRun.terminate(),
    subscribeToEvents: (_listener: TeamRunEventListener) => () => {},
  };
  const teamRun = new TeamRun({
    context: teamContext,
    backend: new ClaudeTeamRunBackend(teamContext, {
      claudeTeamManager: fakeTeamManager,
      coordinatorMemberName: input.memberName,
    }),
  });
  const teamRunService = {
    getTeamRun: (teamRunId: string) => (teamRunId === input.teamRunId ? teamRun : null),
    resolveTeamRun: async (teamRunId: string) =>
      teamRunId === input.teamRunId ? teamRun : null,
    recordRunActivity: async () => {},
    refreshRunMetadata: async () => {},
  };
  const teamHandler = new AgentTeamStreamHandler(
    new AgentSessionManager(),
    teamRunService as never,
  );
  const dummyAgentHandler = {
    connect: async () => null,
    handleMessage: async () => {},
    disconnect: async () => {},
  } as unknown as Parameters<typeof registerAgentWebsocket>[1];

  const app = fastify();
  await app.register(websocket);
  await registerAgentWebsocket(app, dummyAgentHandler, teamHandler);
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  const url = new URL(address);
  const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${input.teamRunId}`);
  const connectedPromise = waitForMessage(socket);

  await waitForOpen(socket);
  const connectedMessage = JSON.parse(await connectedPromise) as {
    type: string;
    payload: { team_id?: string };
  };
  expect(connectedMessage).toMatchObject({
    type: "CONNECTED",
    payload: { team_id: input.teamRunId },
  });

  return {
    app,
    socket,
    runContext,
    sdkCalls,
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

describe("Claude Agent SDK websocket interrupt/resume integration", () => {
  it("preserves provider conversation memory after interrupt instead of starting a new Claude conversation", async () => {
    const runId = "claude-ws-context-memory";
    const providerSessionId = "claude-provider-session-with-memory";
    const marker = "E2E_CONTEXT_MARKER_AFTER_INTERRUPT_7419";
    const { sdkClient, sdkCalls, firstQuery } = createMemoryCheckingFakeSdkClient({
      providerSessionId,
      marker,
    });
    const harness = await createClaudeWebSocketHarnessWithSdkClient({
      runId,
      sdkClient,
      sdkCalls,
    });

    try {
      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            content: `Remember this exact marker before I interrupt you: ${marker}`,
          },
        }),
      );

      await waitForCondition(
        () =>
          harness.sdkCalls.length === 1 &&
          harness.runContext.runtimeContext.sessionId === providerSessionId,
        "initial fake Claude query memory capture and provider session adoption",
      );
      expect(harness.runContext.runtimeContext.hasCompletedTurn).toBe(false);

      harness.socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
      await waitForCondition(
        () =>
          firstQuery.close.mock.calls.length === 1 &&
          harness.runContext.runtimeContext.activeTurnId === null,
        "memory test STOP_GENERATION interrupt settlement",
      );

      const rememberedMessagePromise = waitForJsonMessage(
        harness.socket,
        (message) =>
          message.type === "SEGMENT_CONTENT" &&
          typeof message.payload?.delta === "string" &&
          message.payload.delta.includes(`remembered provider context marker: ${marker}`),
        "provider-memory follow-up SEGMENT_CONTENT",
      );
      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: { content: "What exact marker did I ask you to remember?" },
        }),
      );

      const rememberedMessage = await rememberedMessagePromise;
      const rememberedDelta = rememberedMessage.payload?.delta;
      expect(rememberedDelta).toBe(`remembered provider context marker: ${marker}`);
      expect(rememberedDelta).not.toBe("new conversation: no remembered provider context marker");
      expect(harness.sdkCalls[1]?.options?.resume).toBe(providerSessionId);
      expect(harness.sdkCalls[1]?.options?.resume).not.toBe(runId);
    } finally {
      await closeHarness(harness);
    }
  });

  it("resumes the same WebSocket follow-up with the adopted provider session id after STOP_GENERATION", async () => {
    const runId = "claude-ws-interrupt-provider";
    const providerSessionId = "claude-provider-session-from-first-query";
    const firstQuery = createProviderSessionThenPendingQuery(providerSessionId);
    const secondQuery = createCompletedQuery(providerSessionId);
    const harness = await createClaudeWebSocketHarness({
      runId,
      queries: [firstQuery, secondQuery],
    });

    try {
      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: { content: "start long Claude work" },
        }),
      );

      await waitForCondition(
        () =>
          harness.sdkCalls.length === 1 &&
          harness.runContext.runtimeContext.sessionId === providerSessionId,
        "initial fake Claude query and provider session adoption",
      );
      expect(harness.sdkCalls[0]?.options?.resume).toBeUndefined();
      expect(harness.runContext.runtimeContext.hasCompletedTurn).toBe(false);

      harness.socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
      await waitForCondition(
        () =>
          firstQuery.close.mock.calls.length === 1 &&
          harness.runContext.runtimeContext.activeTurnId === null,
        "STOP_GENERATION interrupt settlement",
      );

      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: { content: "continue with prior context" },
        }),
      );

      await waitForCondition(
        () => harness.sdkCalls.length === 2,
        "follow-up fake Claude query start",
      );
      const followUpResume = harness.sdkCalls[1]?.options?.resume;
      expect(followUpResume).toBe(providerSessionId);
      expect(followUpResume).not.toBeNull();
      expect(followUpResume).not.toBe(runId);
      await waitForCondition(
        () => harness.runContext.runtimeContext.hasCompletedTurn,
        "follow-up completion",
      );
    } finally {
      await closeHarness(harness);
    }
  });

  it("resumes a targeted Claude team member follow-up sent on the same team WebSocket after STOP_GENERATION", async () => {
    const teamRunId = "claude-team-ws-interrupt";
    const memberRunId = "claude-team-member-alpha";
    const memberName = "alpha";
    const providerSessionId = "claude-team-provider-session-from-first-query";
    const firstQuery = createProviderSessionThenPendingQuery(providerSessionId);
    const secondQuery = createCompletedQuery(providerSessionId);
    const harness = await createClaudeTeamWebSocketHarness({
      teamRunId,
      memberRunId,
      memberName,
      queries: [firstQuery, secondQuery],
    });

    try {
      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            content: "start team member work",
            target_member_name: memberName,
          },
        }),
      );

      await waitForCondition(
        () =>
          harness.sdkCalls.length === 1 &&
          harness.runContext.runtimeContext.sessionId === providerSessionId,
        "team member initial fake Claude query and provider session adoption",
      );
      expect(harness.sdkCalls[0]?.options?.resume).toBeUndefined();

      harness.socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
      await waitForCondition(
        () =>
          firstQuery.close.mock.calls.length === 1 &&
          harness.runContext.runtimeContext.activeTurnId === null,
        "team STOP_GENERATION interrupt settlement",
      );

      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            content: "continue team member work",
            target_member_name: memberName,
          },
        }),
      );

      await waitForCondition(
        () => harness.sdkCalls.length === 2,
        "team member follow-up fake Claude query start",
      );
      const followUpResume = harness.sdkCalls[1]?.options?.resume;
      expect(followUpResume).toBe(providerSessionId);
      expect(followUpResume).not.toBeNull();
      expect(followUpResume).not.toBe(memberRunId);
    } finally {
      await closeHarness(harness);
    }
  });

  it("does not send the local run id as SDK resume when STOP_GENERATION happens before a provider session id exists", async () => {
    const runId = "claude-ws-interrupt-placeholder";
    const firstQuery = createPendingQueryWithoutProviderSession();
    const secondProviderSessionId = "claude-provider-session-after-placeholder";
    const secondQuery = createCompletedQuery(secondProviderSessionId);
    const harness = await createClaudeWebSocketHarness({
      runId,
      queries: [firstQuery, secondQuery],
    });

    try {
      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: { content: "start before Claude emits a provider session id" },
        }),
      );

      await waitForCondition(
        () => harness.sdkCalls.length === 1,
        "initial placeholder fake Claude query start",
      );
      expect(harness.sdkCalls[0]?.options?.resume).toBeUndefined();
      expect(harness.runContext.runtimeContext.sessionId).toBe(runId);
      expect(harness.runContext.runtimeContext.hasCompletedTurn).toBe(false);

      harness.socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
      await waitForCondition(
        () =>
          firstQuery.close.mock.calls.length === 1 &&
          harness.runContext.runtimeContext.activeTurnId === null,
        "placeholder STOP_GENERATION interrupt settlement",
      );

      harness.socket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: { content: "follow up without provider session id" },
        }),
      );

      await waitForCondition(
        () => harness.sdkCalls.length === 2,
        "placeholder follow-up fake Claude query start",
      );
      expect(harness.sdkCalls[1]?.options?.resume).toBeUndefined();
      expect(harness.sdkCalls[1]?.options?.resume).not.toBe(runId);
      await waitForCondition(
        () => harness.runContext.runtimeContext.hasCompletedTurn,
        "placeholder follow-up completion",
      );
      expect(harness.runContext.runtimeContext.sessionId).toBe(secondProviderSessionId);
    } finally {
      await closeHarness(harness);
    }
  });
});

describeLiveClaudeRuntime("Claude Agent SDK websocket interrupt/resume live E2E", () => {
  it(
    "uses the real Claude SDK to preserve context after STOP_GENERATION interrupts an incomplete turn",
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
        harness.socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: [
                `Remember this exact marker for the next user message: ${marker}`,
                "Before answering, call the Write tool exactly once.",
                "Do not use Bash.",
                `Create this file path: ${targetFilePath}`,
                `Write exactly this one line into the file: ${marker}`,
                "Do not ask follow-up questions.",
                "Do not provide the final answer until after the tool call is approved.",
              ].join("\n"),
            },
          }),
        );

        await approvalRequestPromise;
        await waitForCondition(
          () =>
            typeof harness.runContext.runtimeContext.sessionId === "string" &&
            harness.runContext.runtimeContext.sessionId !== runId,
          "live Claude provider session id adoption before interrupt",
          LIVE_CLAUDE_STEP_TIMEOUT_MS,
        );
        const providerSessionId = harness.runContext.runtimeContext.sessionId;
        expect(providerSessionId).toBeTruthy();
        expect(providerSessionId).not.toBe(runId);
        expect(harness.runContext.runtimeContext.hasCompletedTurn).toBe(false);

        harness.socket.send(JSON.stringify({ type: "STOP_GENERATION" }));
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
        harness.socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: [
                "What exact marker did I ask you to remember before I interrupted you?",
                "Reply with only that marker and no other words.",
              ].join("\n"),
            },
          }),
        );

        const resumedResponseText = await rememberedMarkerPromise;
        expect(resumedResponseText).toContain(marker);
        expect(harness.runContext.runtimeContext.sessionId).toBe(providerSessionId);
      } finally {
        await closeHarness(harness);
        await fs.rm(workspaceRoot, { recursive: true, force: true });
      }
    },
    LIVE_CLAUDE_TEST_TIMEOUT_MS,
  );
});
