import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { ClaudeSdkQueryLike } from "../../../src/runtime-management/claude/client/claude-sdk-client.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { ClaudeAgentRunBackend } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { ClaudeAgentRunContext } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { ClaudeSession } from "../../../src/agent-execution/backends/claude/session/claude-session.js";
import { buildClaudeSessionConfig } from "../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSessionMessageCache } from "../../../src/agent-execution/backends/claude/session/claude-session-message-cache.js";
import { ClaudeSessionToolUseCoordinator } from "../../../src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.js";
import { ClaudeProviderSessionLifecycle } from "../../../src/agent-execution/backends/claude/session/claude-provider-session-lifecycle.js";
import type { ResolvedInterAgentMessageDeliveryRequest } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { InterAgentMessageRouter } from "../../../src/agent-team-execution/services/inter-agent-message-router.js";

const buildRequest = (): ResolvedInterAgentMessageDeliveryRequest => {
  const senderIdentity = {
    rootTeamRunId: "team-root",
    memberAddress: assertAgentTeamAddress("/Classroom/StudentTwo"),
    agentRunId: "student-two-task-run",
  };
  const receiverIdentity = {
    rootTeamRunId: "team-root",
    memberAddress: assertAgentTeamAddress("/Classroom/StudentOne"),
    agentRunId: "student-one-task-run",
  };
  return {
    rootTeamRunId: "team-root",
    sender: { participant: {
      kind: "agent",
      identity: senderIdentity,
      displayName: "Student Two",
    } },
    recipientAddress: receiverIdentity.memberAddress,
    recipient: { participant: {
      kind: "agent",
      identity: receiverIdentity,
      displayName: "Student One",
    } },
    senderIdentity,
    receiverIdentity,
    content: "The delegated analysis is complete.",
    messageType: "agent_message",
    referenceFiles: [],
  };
};

const createControlledQuery = (): { query: ClaudeSdkQueryLike; release: () => void } => {
  let release!: () => void;
  const settled = new Promise<void>((resolve) => { release = resolve; });
  return {
    query: {
      async *[Symbol.asyncIterator]() { await settled; },
      interrupt: vi.fn(async () => undefined),
      close: vi.fn(() => undefined),
    },
    release,
  };
};

const PROVIDER_SESSION_ID = "12345678-1234-4234-8234-123456789abc";

const createCompletedQuery = (): ClaudeSdkQueryLike => ({
  async *[Symbol.asyncIterator]() {
    yield { type: "result", session_id: PROVIDER_SESSION_ID, result: "done" };
  },
  interrupt: vi.fn(async () => undefined),
  close: vi.fn(() => undefined),
});

describe("InterAgentMessageRouter Claude input admission", () => {
  it("accepts one active task-peer reply and starts it once after the current Claude turn terminates", async () => {
    const activeQuery = createControlledQuery();
    const queryQueue: ClaudeSdkQueryLike[] = [activeQuery.query, createCompletedQuery()];
    const startQueryTurn = vi.fn(async () => queryQueue.shift()!);
    const messageCache = new ClaudeSessionMessageCache();
    const runContext = new AgentRunContext({
      runId: "student-one-task-run",
      config: new AgentRunConfig({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        agentDefinitionId: "student-one",
        llmModelIdentifier: "claude-sonnet",
        autoExecuteTools: false,
        workspaceId: null,
        llmConfig: null,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      runtimeContext: new ClaudeAgentRunContext({
        sessionConfig: buildClaudeSessionConfig({
          model: "claude-sonnet",
          workingDirectory: "/tmp",
          permissionMode: "default",
          autoExecuteTools: false,
        }),
        carpenterSystemPrompt: "## Agent Identity\n\n- Name: Student One",
        runtimeToolExposure: buildRuntimeAgentToolExposure([]),
        sessionId: "claude-session-1",
        hasCompletedTurn: false,
        activeTurnId: null,
      }),
    });
    const session = new ClaudeSession({
      runContext: runContext as never,
      providerSessionLifecycle: ClaudeProviderSessionLifecycle.reserveNew(
        () => PROVIDER_SESSION_ID,
      ),
      dependencies: {
        sessionMessageCache: messageCache,
        sdkClient: {
          startQueryTurn,
          closeQuery: vi.fn((query: ClaudeSdkQueryLike | null) => query?.close()),
        } as never,
        activeQueriesByRunId: new Map(),
        toolingCoordinator: new ClaudeSessionToolUseCoordinator(
          new Map(),
          new Map(),
          () => undefined,
        ),
        agentToolMcpRunSessions: {
          activateForRun: vi.fn(() => ({ kind: "not_exposed" })),
        } as never,
        isRunSessionActive: () => true,
        terminateRunSession: vi.fn(async () => undefined),
      },
    });

    await session.startTurn(new AgentInputUserMessage("active work"));
    await vi.waitFor(() => expect(startQueryTurn).toHaveBeenCalledTimes(1));

    const backend = new ClaudeAgentRunBackend(runContext as never, session);
    const run = new AgentRun({ providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch }, context: runContext, backend });
    const request = buildRequest();
    const result = await new InterAgentMessageRouter().deliver({ recipientRun: run, request });

    expect(result).toEqual({ accepted: true, turnId: null });
    expect(startQueryTurn).toHaveBeenCalledTimes(1);

    activeQuery.release();

    await vi.waitFor(() => expect(startQueryTurn).toHaveBeenCalledTimes(2));
    const cachedUserMessages = messageCache
      .getCachedMessages(PROVIDER_SESSION_ID)
      .filter((message) => message.role === "user");
    expect(cachedUserMessages).toHaveLength(2);
    expect(cachedUserMessages[1]?.content).toContain("The delegated analysis is complete.");
    expect(cachedUserMessages[1]?.content).toContain("sender id: student-two-task-run");
    expect(startQueryTurn.mock.calls[1]?.[0]).toMatchObject({
      prompt: expect.stringContaining("The delegated analysis is complete."),
    });
    expect(activeQuery.query.interrupt).not.toHaveBeenCalled();
  });
});
