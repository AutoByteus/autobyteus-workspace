import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { CodexAgentRunContext } from "../../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexThread } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread.js";
import {
  CodexApprovalPolicy,
} from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { createCodexThreadStartupGate } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-startup-gate.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";

const createRunContext = (input: {
  runId: string;
  workingDirectory: string;
  autoExecuteTools: boolean;
}) =>
  new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def",
      llmModelIdentifier: "gpt-5.4-mini",
      autoExecuteTools: input.autoExecuteTools,
      workspaceId: input.workingDirectory,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: "gpt-5.4-mini",
        workingDirectory: input.workingDirectory,
        reasoningEffort: "medium",
        approvalPolicy: input.autoExecuteTools
          ? CodexApprovalPolicy.NEVER
          : CodexApprovalPolicy.ON_REQUEST,
        sandbox: "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: [],
      },
    }),
  });

const createThread = (autoExecuteTools: boolean) => {
  const client = {
    respondSuccess: vi.fn(),
    respondError: vi.fn(),
  };

  const thread = new CodexThread({
    runContext: createRunContext({
      runId: `run-${autoExecuteTools ? "auto" : "manual"}`,
      workingDirectory: "/tmp/codex-thread-unit",
      autoExecuteTools,
    }),
    client: client as never,
    startup: createCodexThreadStartupGate(),
  });

  return { thread, client };
};

const createSpeakApprovalParams = () => ({
  threadId: "thread-1",
  turnId: "turn-1",
  serverName: "tts",
  mode: "form",
  _meta: {
    codex_approval_kind: "mcp_tool_call",
    tool_params: {
      text: "codex unit speak probe",
      play: true,
    },
  },
  message: 'Allow the tts MCP server to run tool "speak"?',
  requestedSchema: {
    type: "object",
    properties: {},
  },
});

describe("CodexThread MCP tool approval bridge", () => {
  it("auto-accepts MCP tool approvals when autoExecuteTools is enabled", () => {
    const { thread, client } = createThread(true);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });
    thread.trackPendingMcpToolCall({
      invocationId: "call_speak_auto",
      turnId: "turn-1",
      serverName: "tts",
      toolName: "speak",
      arguments: {
        text: "codex unit speak probe",
        play: true,
      },
    });

    thread.handleAppServerRequest(101, "mcpServer/elicitation/request", createSpeakApprovalParams());

    expect(client.respondSuccess).toHaveBeenCalledWith(101, { action: "accept" });
    expect(client.respondError).not.toHaveBeenCalled();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: expect.objectContaining({
          invocation_id: "call_speak_auto",
          tool_name: "speak",
        }),
      }),
    );
    expect(thread.findApprovalRecord("call_speak_auto")).toBeNull();
  });

  it("emits approval events for MCP tool calls and answers with the MCP elicitation action", async () => {
    const { thread, client } = createThread(false);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });
    thread.trackPendingMcpToolCall({
      invocationId: "call_speak_manual",
      turnId: "turn-1",
      serverName: "tts",
      toolName: "speak",
      arguments: {
        text: "codex unit speak probe",
        play: true,
      },
    });

    thread.handleAppServerRequest(202, "mcpServer/elicitation/request", createSpeakApprovalParams());

    expect(client.respondSuccess).not.toHaveBeenCalled();
    expect(client.respondError).not.toHaveBeenCalled();
    expect(thread.findApprovalRecord("call_speak_manual")).toBeTruthy();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
        params: expect.objectContaining({
          invocation_id: "call_speak_manual",
          tool_name: "speak",
          arguments: {
            text: "codex unit speak probe",
            play: true,
          },
        }),
      }),
    );

    await thread.approveTool("call_speak_manual", true);

    expect(client.respondSuccess).toHaveBeenCalledWith(202, { action: "accept" });
    expect(thread.findApprovalRecord("call_speak_manual")).toBeNull();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: expect.objectContaining({
          invocation_id: "call_speak_manual",
          tool_name: "speak",
        }),
      }),
    );
  });

  it("emits a local MCP completion event when a pending MCP tool call completes", () => {
    const { thread } = createThread(true);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });
    thread.trackPendingMcpToolCall({
      invocationId: "call_speak_done",
      turnId: "turn-1",
      serverName: "tts",
      toolName: "speak",
      arguments: {
        text: "codex unit speak probe",
        play: true,
      },
    });

    thread.handleAppServerNotification("item/completed", {
      item: {
        type: "mcpToolCall",
        id: "call_speak_done",
        tool: "speak",
        status: "completed",
        result: {
          structuredContent: {
            ok: true,
          },
        },
      },
    } as never);

    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
        params: expect.objectContaining({
          invocation_id: "call_speak_done",
          turn_id: "turn-1",
          tool_name: "speak",
          arguments: {
            text: "codex unit speak probe",
            play: true,
          },
          item: expect.objectContaining({
            type: "mcpToolCall",
            id: "call_speak_done",
            status: "completed",
          }),
        }),
      }),
    );
    expect(thread.findPendingMcpToolCall({
      turnId: "turn-1",
      serverName: "tts",
      toolName: "speak",
    })).toBeNull();
  });
});

describe("CodexThread token usage readiness", () => {
  it("marks running-turn token usage ready when the thread becomes idle", () => {
    const { thread } = createThread(true);

    thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
      turn: {
        id: "turn-usage-1",
      },
    } as never);

    thread.handleAppServerNotification(CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED, {
      threadId: "thread-1",
      turnId: "turn-usage-1",
      tokenUsage: {
        last: {
          totalTokens: 15,
          inputTokens: 10,
          outputTokens: 5,
        },
      },
    } as never);

    expect(thread.getReadyTurnTokenUsages()).toEqual([]);

    thread.handleAppServerNotification(CodexThreadEventName.THREAD_STATUS_CHANGED, {
      threadId: "thread-1",
      status: {
        type: "idle",
      },
    } as never);

    expect(thread.getReadyTurnTokenUsages()).toEqual([
      {
        turnId: "turn-usage-1",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          prompt_cost: null,
          completion_cost: null,
          total_cost: null,
        },
      },
    ]);
  });

  it("marks late token usage ready after turn completion", () => {
    const { thread } = createThread(true);

    thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
      turn: {
        id: "turn-usage-late-1",
      },
    } as never);
    thread.handleAppServerNotification(CodexThreadEventName.TURN_COMPLETED, {
      threadId: "thread-1",
      turn: {
        id: "turn-usage-late-1",
      },
    } as never);

    thread.handleAppServerNotification(CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED, {
      threadId: "thread-1",
      turnId: "turn-usage-late-1",
      tokenUsage: {
        last: {
          totalTokens: 18,
          inputTokens: 11,
          outputTokens: 7,
        },
      },
    } as never);

    expect(thread.getReadyTurnTokenUsages()).toEqual([
      {
        turnId: "turn-usage-late-1",
        usage: {
          prompt_tokens: 11,
          completion_tokens: 7,
          total_tokens: 18,
          prompt_cost: null,
          completion_cost: null,
          total_cost: null,
        },
      },
    ]);
  });
});
