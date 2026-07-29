import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
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
import { createCodexDynamicToolTextResult } from "../../../../../../src/agent-execution/backends/codex/codex-dynamic-tool.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";

const createRunContext = (input: {
  runId: string;
  workingDirectory: string;
  autoExecuteTools: boolean;
  reasoningEffort?: string | null;
  serviceTier?: string | null;
  dynamicToolHandlers?: Record<string, any>;
  memberTeamContext?: MemberTeamContext | null;
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
      memberTeamContext: input.memberTeamContext ?? null,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: "gpt-5.4-mini",
        workingDirectory: input.workingDirectory,
        reasoningEffort:
          input.reasoningEffort === undefined ? "medium" : input.reasoningEffort,
        serviceTier: input.serviceTier ?? null,
        approvalPolicy: input.autoExecuteTools
          ? CodexApprovalPolicy.NEVER
          : CodexApprovalPolicy.ON_REQUEST,
        sandbox: "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: [],
      },
      dynamicToolHandlers: input.dynamicToolHandlers ?? null,
    }),
  });

const createThread = (
  autoExecuteTools: boolean,
  input: {
    reasoningEffort?: string | null;
    serviceTier?: string | null;
    dynamicToolHandlers?: Record<string, any>;
    memberTeamContext?: MemberTeamContext | null;
  } = {},
) => {
  const client = {
    request: vi.fn(async () => ({
      turn: {
        id: "turn-1",
      },
    })),
    respondSuccess: vi.fn(),
    respondError: vi.fn(),
  };

  const thread = new CodexThread({
    runContext: createRunContext({
      runId: `run-${autoExecuteTools ? "auto" : "manual"}`,
      workingDirectory: "/tmp/codex-thread-unit",
      autoExecuteTools,
      reasoningEffort: input.reasoningEffort,
      serviceTier: input.serviceTier ?? null,
      dynamicToolHandlers: input.dynamicToolHandlers,
      memberTeamContext: input.memberTeamContext ?? null,
    }),
    client: client as never,
    startup: createCodexThreadStartupGate(),
  });

  return { thread, client };
};

const createMemberTeamContext = () =>
  new MemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    teamName: "Codex team",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "ping",
    memberRouteKey: "ping",
    memberRunId: "ping-run-1",
  });

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

  it("auto-accepts MCP tool approvals for team members when autoExecuteTools is enabled", () => {
    const { thread, client } = createThread(true, {
      memberTeamContext: createMemberTeamContext(),
    });
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });
    thread.trackPendingMcpToolCall({
      invocationId: "call_speak_team_auto",
      turnId: "turn-1",
      serverName: "tts",
      toolName: "speak",
      arguments: {
        text: "codex unit speak probe",
        play: true,
      },
    });

    thread.handleAppServerRequest(
      102,
      "mcpServer/elicitation/request",
      createSpeakApprovalParams(),
    );

    expect(client.respondSuccess).toHaveBeenCalledWith(102, { action: "accept" });
    expect(client.respondError).not.toHaveBeenCalled();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: expect.objectContaining({
          invocation_id: "call_speak_team_auto",
          tool_name: "speak",
        }),
      }),
    );
    expect(thread.findApprovalRecord("call_speak_team_auto")).toBeNull();
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

describe("CodexThread Codex approval surfaces", () => {
  it("auto-accepts terminal approvals when autoExecuteTools is enabled", () => {
    const { thread, client } = createThread(true);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });

    thread.handleAppServerRequest(301, CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL, {
      itemId: "item-terminal-auto",
      approvalId: "approval-auto",
      command: "pwd",
    });

    expect(client.respondSuccess).toHaveBeenCalledWith(301, { decision: "accept" });
    expect(thread.findApprovalRecord("item-terminal-auto")).toBeNull();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: expect.objectContaining({
          invocation_id: "item-terminal-auto",
          tool_name: "run_bash",
        }),
      }),
    );
  });

  it("auto-accepts Codex local runtime tools for team members while preserving dynamic-tool auto execution", async () => {
    const handler = vi.fn(async () => createCodexDynamicToolTextResult("team dynamic ok"));
    const { thread, client } = createThread(true, {
      dynamicToolHandlers: {
        custom_team_dynamic: handler,
      },
      memberTeamContext: createMemberTeamContext(),
    });
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });

    thread.handleAppServerRequest(304, CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL, {
      itemId: "item-terminal-team-auto",
      approvalId: "approval-team-auto",
      command: "echo team-auto",
    });

    expect(client.respondSuccess).toHaveBeenCalledWith(304, { decision: "accept" });
    expect(thread.findApprovalRecord("item-terminal-team-auto")).toBeNull();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: expect.objectContaining({
          invocation_id: "item-terminal-team-auto",
          tool_name: "run_bash",
        }),
      }),
    );

    thread.handleAppServerRequest(405, CodexThreadEventName.ITEM_TOOL_CALL, {
      threadId: "thread-1",
      turnId: "turn-1",
      callId: "call-team-dynamic-1",
      tool: "custom_team_dynamic",
      arguments: {
        value: "team-auto",
      },
    });

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
      expect(client.respondSuccess).toHaveBeenCalledWith(405, {
        success: true,
        contentItems: [{ type: "inputText", text: "team dynamic ok" }],
      });
    });
    expect(thread.findApprovalRecord("call-team-dynamic-1")).toBeNull();
  });

  it("gates file-change approvals in manual mode and returns decline on denial", async () => {
    const { thread, client } = createThread(false);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });

    thread.handleAppServerRequest(302, CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL, {
      itemId: "item-file-change-1",
      approvalId: "approval-file-change-1",
      path: "/tmp/codex-thread-unit/changed.txt",
      diff: "--- a/changed.txt\n+++ b/changed.txt\n@@\n+hello\n",
    });

    expect(client.respondSuccess).not.toHaveBeenCalled();
    expect(thread.findApprovalRecord("item-file-change-1")).toEqual(
      expect.objectContaining({
        requestId: 302,
        method: CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL,
        invocationId: "item-file-change-1",
        approvalId: "approval-file-change-1",
        responseMode: "decision",
        toolName: "edit_file",
      }),
    );
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL,
        params: expect.objectContaining({
          invocation_id: "item-file-change-1",
          itemId: "item-file-change-1",
          approvalId: "approval-file-change-1",
        }),
      }),
    );

    await thread.approveTool("item-file-change-1", false);

    expect(client.respondSuccess).toHaveBeenCalledWith(302, { decision: "decline" });
    expect(thread.findApprovalRecord("item-file-change-1")).toBeNull();
  });

  it("gates dynamic tools in manual mode until approval", async () => {
    const handler = vi.fn(async () => createCodexDynamicToolTextResult("dynamic ok"));
    const { thread, client } = createThread(false, {
      dynamicToolHandlers: {
        custom_manual_dynamic: handler,
      },
    });
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });

    thread.handleAppServerRequest(401, CodexThreadEventName.ITEM_TOOL_CALL, {
      threadId: "thread-1",
      turnId: "turn-1",
      callId: "call-dynamic-1",
      tool: "custom_manual_dynamic",
      arguments: {
        value: "review",
      },
    });

    expect(handler).not.toHaveBeenCalled();
    expect(client.respondSuccess).not.toHaveBeenCalled();
    expect(thread.findApprovalRecord("call-dynamic-1")).toEqual(
      expect.objectContaining({
        responseMode: "dynamic_tool_call",
        invocationId: "call-dynamic-1",
        toolName: "custom_manual_dynamic",
        arguments: {
          value: "review",
        },
      }),
    );
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
        params: expect.objectContaining({
          invocation_id: "call-dynamic-1",
          tool_name: "custom_manual_dynamic",
          arguments: {
            value: "review",
          },
        }),
      }),
    );

    await thread.approveTool("call-dynamic-1", true);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-manual",
        threadId: "thread-1",
        turnId: "turn-1",
        callId: "call-dynamic-1",
        toolName: "custom_manual_dynamic",
      }),
    );
    expect(client.respondSuccess).toHaveBeenCalledWith(401, {
      success: true,
      contentItems: [{ type: "inputText", text: "dynamic ok" }],
    });
    expect(thread.findApprovalRecord("call-dynamic-1")).toBeNull();
  });

  it("claims manual dynamic approvals before awaited handler execution", async () => {
    let releaseHandler: (() => void) | null = null;
    const firstHandlerGate = new Promise<void>((resolve) => {
      releaseHandler = resolve;
    });
    let handlerCallCount = 0;
    const handler = vi.fn(async () => {
      handlerCallCount += 1;
      if (handlerCallCount === 1) {
        await firstHandlerGate;
        return createCodexDynamicToolTextResult("dynamic ok once");
      }
      return createCodexDynamicToolTextResult("duplicate dynamic invocation");
    });
    const { thread, client } = createThread(false, {
      dynamicToolHandlers: {
        custom_repeat_dynamic: handler,
      },
    });

    thread.handleAppServerRequest(404, CodexThreadEventName.ITEM_TOOL_CALL, {
      threadId: "thread-1",
      turnId: "turn-1",
      callId: "call-repeat-1",
      tool: "custom_repeat_dynamic",
      arguments: {
        value: "repeat",
      },
    });

    const firstApproval = thread.approveTool("call-repeat-1", true);

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
    });
    expect(thread.findApprovalRecord("call-repeat-1")).toBeNull();

    await expect(thread.approveTool("call-repeat-1", true)).rejects.toThrow(
      "No pending approval found for invocation 'call-repeat-1'.",
    );
    expect(handler).toHaveBeenCalledTimes(1);

    releaseHandler?.();
    await firstApproval;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(client.respondSuccess).toHaveBeenCalledTimes(1);
    expect(client.respondSuccess).toHaveBeenCalledWith(404, {
      success: true,
      contentItems: [{ type: "inputText", text: "dynamic ok once" }],
    });
  });

  it("denies dynamic tools in manual mode without invoking the handler", async () => {
    const handler = vi.fn(async () => createCodexDynamicToolTextResult("should not run"));
    const { thread, client } = createThread(false, {
      dynamicToolHandlers: {
        custom_denied_dynamic: handler,
      },
    });

    thread.handleAppServerRequest(402, CodexThreadEventName.ITEM_TOOL_CALL, {
      threadId: "thread-1",
      turnId: "turn-1",
      callId: "call-denied-1",
      tool: "custom_denied_dynamic",
      arguments: {
        value: "deny",
      },
    });

    await thread.approveTool("call-denied-1", false);

    expect(handler).not.toHaveBeenCalled();
    expect(client.respondSuccess).toHaveBeenCalledWith(402, {
      success: false,
      contentItems: [{ type: "inputText", text: "Tool execution denied by user." }],
    });
    expect(thread.findApprovalRecord("call-denied-1")).toBeNull();
  });

  it("executes dynamic tools immediately when autoExecuteTools is enabled", async () => {
    const handler = vi.fn(async () => createCodexDynamicToolTextResult("auto dynamic ok"));
    const { thread, client } = createThread(true, {
      dynamicToolHandlers: {
        custom_auto_dynamic: handler,
      },
    });

    thread.handleAppServerRequest(403, CodexThreadEventName.ITEM_TOOL_CALL, {
      threadId: "thread-1",
      turnId: "turn-1",
      callId: "call-auto-dynamic-1",
      tool: "custom_auto_dynamic",
      arguments: {
        value: "auto",
      },
    });

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
      expect(client.respondSuccess).toHaveBeenCalledWith(403, {
        success: true,
        contentItems: [{ type: "inputText", text: "auto dynamic ok" }],
      });
    });
    expect(thread.findApprovalRecord("call-auto-dynamic-1")).toBeNull();
  });

  it("grants permission requests automatically in auto mode", () => {
    const { thread, client } = createThread(true);

    thread.handleAppServerRequest(501, CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL, {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "perm-auto-1",
      cwd: "/tmp/codex-thread-unit",
      permissions: {
        fileSystem: {
          entries: [],
        },
        network: {
          enabled: true,
        },
      },
      reason: "Need network",
      startedAtMs: 1,
    });

    expect(client.respondSuccess).toHaveBeenCalledWith(501, {
      permissions: {
        fileSystem: {
          entries: [],
        },
        network: {
          enabled: true,
        },
      },
      scope: "session",
    });
    expect(thread.findApprovalRecord("perm-auto-1")).toBeNull();
  });

  it("grants permission requests automatically for team members in auto mode", () => {
    const { thread, client } = createThread(true, {
      memberTeamContext: createMemberTeamContext(),
    });
    const requestedWorktreePath =
      "/Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-external-git-ops-regression";
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });

    thread.handleAppServerRequest(504, CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL, {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "perm-team-auto-1",
      cwd: "/tmp/codex-thread-unit",
      permissions: {
        fileSystem: {
          write: [requestedWorktreePath],
        },
        network: null,
      },
      reason: "Need external worktree Git metadata access",
      startedAtMs: 1,
    });

    expect(client.respondSuccess).toHaveBeenCalledWith(504, {
      permissions: {
        fileSystem: {
          write: [requestedWorktreePath],
        },
        network: null,
      },
      scope: "session",
    });
    expect(thread.findApprovalRecord("perm-team-auto-1")).toBeNull();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: expect.objectContaining({
          invocation_id: "perm-team-auto-1",
          tool_name: "request_permissions",
        }),
      }),
    );
  });

  it("queues permission requests in manual mode and grants only after approval", async () => {
    const { thread, client } = createThread(false);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });

    thread.handleAppServerRequest(502, CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL, {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "perm-manual-1",
      cwd: "/tmp/codex-thread-unit",
      permissions: {
        fileSystem: {
          read: ["/tmp"],
        },
        network: null,
      },
      reason: "Need /tmp",
      startedAtMs: 1,
    });

    expect(client.respondSuccess).not.toHaveBeenCalled();
    expect(thread.findApprovalRecord("perm-manual-1")).toEqual(
      expect.objectContaining({
        responseMode: "permission_request",
        invocationId: "perm-manual-1",
        toolName: "request_permissions",
      }),
    );
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED,
        params: expect.objectContaining({
          invocation_id: "perm-manual-1",
          tool_name: "request_permissions",
          arguments: {
            permissions: {
              fileSystem: {
                read: ["/tmp"],
              },
              network: null,
            },
            cwd: "/tmp/codex-thread-unit",
            reason: "Need /tmp",
          },
        }),
      }),
    );

    await thread.approveTool("perm-manual-1", true);

    expect(client.respondSuccess).toHaveBeenCalledWith(502, {
      permissions: {
        fileSystem: {
          read: ["/tmp"],
        },
        network: null,
      },
      scope: "turn",
    });
    expect(thread.findApprovalRecord("perm-manual-1")).toBeNull();
  });

  it("denies permission requests in manual mode with a no-grant response", async () => {
    const { thread, client } = createThread(false);

    thread.handleAppServerRequest(503, CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL, {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "perm-denied-1",
      cwd: "/tmp/codex-thread-unit",
      permissions: {
        network: {
          enabled: true,
        },
      },
      startedAtMs: 1,
    });

    await thread.approveTool("perm-denied-1", false);

    expect(client.respondSuccess).toHaveBeenCalledWith(503, {
      permissions: {
        fileSystem: null,
        network: null,
      },
      scope: "turn",
    });
    expect(thread.findApprovalRecord("perm-denied-1")).toBeNull();
  });
});

describe("CodexThread approval identity", () => {
  it("stores Codex terminal approvals by exact item id while keeping approvalId as metadata", async () => {
    const { thread, client } = createThread(false);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => {
      messages.push(message);
    });

    thread.handleAppServerRequest(303, CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL, {
      itemId: "item-terminal-1",
      approvalId: "approval-1",
      command: "pwd",
    });

    expect(client.respondError).not.toHaveBeenCalled();
    expect(thread.findApprovalRecord("item-terminal-1")).toEqual(
      expect.objectContaining({
        requestId: 303,
        method: CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
        invocationId: "item-terminal-1",
        approvalId: "approval-1",
        responseMode: "decision",
        toolName: "run_bash",
      }),
    );
    expect(thread.findApprovalRecord("item-terminal-1:approval-1")).toBeNull();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
        params: expect.objectContaining({
          invocation_id: "item-terminal-1",
          itemId: "item-terminal-1",
          approvalId: "approval-1",
        }),
      }),
    );

    await expect(thread.approveTool("item-terminal-1:approval-1", true)).rejects.toThrow(
      "No pending approval found for invocation 'item-terminal-1:approval-1'.",
    );
    expect(client.respondSuccess).not.toHaveBeenCalled();

    await thread.approveTool("item-terminal-1", true);

    expect(client.respondSuccess).toHaveBeenCalledWith(303, { decision: "accept" });
    expect(thread.findApprovalRecord("item-terminal-1")).toBeNull();
    expect(messages).toContainEqual(
      expect.objectContaining({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: expect.objectContaining({
          invocation_id: "item-terminal-1",
          itemId: "item-terminal-1",
          approvalId: "approval-1",
          requestId: 303,
          tool_name: "run_bash",
        }),
      }),
    );
  });
});

describe("CodexThread turn payload", () => {
  it.each(["max", "ultra", "Future-Custom"])(
    "passes open reasoning effort %s to turn/start",
    async (reasoningEffort) => {
      const { thread, client } = createThread(false, { reasoningEffort });
      thread.markStartupReady();

      await thread.sendTurn(new AgentInputUserMessage("hello reasoning codex"));

      expect(client.request).toHaveBeenCalledWith(
        "turn/start",
        expect.objectContaining({
          effort: reasoningEffort,
        }),
      );
    },
  );

  it("passes an unset reasoning effort as null to turn/start", async () => {
    const { thread, client } = createThread(false, { reasoningEffort: null });
    thread.markStartupReady();

    await thread.sendTurn(new AgentInputUserMessage("hello default codex"));

    expect(client.request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        effort: null,
      }),
    );
  });

  it("passes the configured Codex serviceTier to turn/start", async () => {
    const { thread, client } = createThread(false, { serviceTier: "fast" });
    thread.markStartupReady();

    await thread.sendTurn(new AgentInputUserMessage("hello fast codex"));

    expect(client.request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        effort: "medium",
        serviceTier: "fast",
        input: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            text: "hello fast codex",
          }),
        ]),
      }),
    );
  });
});

describe("CodexThread token usage readiness", () => {
  it("queues Codex cumulative snapshot updates immediately without waiting for idle", () => {
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
        total: {
          totalTokens: 150,
          inputTokens: 100,
          outputTokens: 50,
        },
        last: {
          totalTokens: 15,
          inputTokens: 10,
          outputTokens: 5,
        },
      },
    } as never);

    expect(thread.getReadyTokenUsageUpdates()).toEqual([
      expect.objectContaining({
        turnId: "turn-usage-1",
        runtime_kind: "codex_app_server",
        ingestion_kind: "codex_thread_token_usage",
        usage_scope: "cumulative_snapshot",
        snapshot_series_key: "codex_thread:thread-1",
        idempotency_key: "codex_token_usage:run-auto:thread-1:turn-usage-1:cumulative_snapshot:100:x:50:x:150",
        reported_input_tokens: 100,
        reported_output_tokens: 50,
        reported_total_tokens: 150,
        input_token_semantic: "gross_includes_cache",
        cache_state: "not_reported",
        latest_prompt_tokens: 10,
        effective_context_window_tokens: null,
        context_window_usage_percent: null,
        model_provider: "OPENAI",
        model_identifier: "gpt-5.4-mini",
        model_value: "gpt-5.4-mini",
        raw_usage_json: { totalTokens: 150, inputTokens: 100, outputTokens: 50 },
        raw_event_json: expect.objectContaining({
          autobyteus_cumulative_snapshot_provider_delta_tokens: expect.objectContaining({
            reported_input_tokens: 10,
            reported_output_tokens: 5,
            reported_total_tokens: 15,
          }),
        }),
        quality_flags: [],
      }),
    ]);
  });

  it("maps Codex app-server total fields into cumulative snapshots and last fields into provider-delta metadata", () => {
    const { thread } = createThread(true);

    thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
      turn: {
        id: "turn-usage-rich-1",
      },
    } as never);

    thread.handleAppServerNotification(CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED, {
      threadId: "thread-1",
      turnId: "turn-usage-rich-1",
      tokenUsage: {
        modelContextWindow: 128000,
        total: {
          totalTokens: 240,
          inputTokens: 160,
          cachedInputTokens: 60,
          outputTokens: 80,
          reasoningOutputTokens: 30,
        },
        last: {
          totalTokens: 24,
          inputTokens: 16,
          cachedInputTokens: 6,
          outputTokens: 8,
          reasoningOutputTokens: 3,
        },
      },
    } as never);

    expect(thread.getReadyTokenUsageUpdates()).toEqual([
      expect.objectContaining({
        turnId: "turn-usage-rich-1",
        usage_scope: "cumulative_snapshot",
        snapshot_series_key: "codex_thread:thread-1",
        reported_input_tokens: 160,
        reported_output_tokens: 80,
        reported_total_tokens: 240,
        input_token_semantic: "gross_includes_cache",
        cache_read_input_tokens: 60,
        cache_state: "positive",
        reasoning_output_tokens: 30,
        latest_prompt_tokens: 16,
        effective_context_window_tokens: 128000,
        context_window_usage_percent: 0.0125,
        raw_usage_json: {
          totalTokens: 240,
          inputTokens: 160,
          cachedInputTokens: 60,
          outputTokens: 80,
          reasoningOutputTokens: 30,
        },
        raw_event_json: expect.objectContaining({
          tokenUsage: expect.objectContaining({ modelContextWindow: 128000 }),
          autobyteus_cumulative_snapshot_provider_delta_tokens: expect.objectContaining({
            reported_input_tokens: 16,
            cache_read_input_tokens: 6,
            reasoning_output_tokens: 3,
          }),
        }),
        quality_flags: [],
      }),
    ]);
  });

  it("keeps absent Codex cache writes out of source records and null in reconciliation metadata", () => {
    const { thread } = createThread(true);

    thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
      turn: { id: "turn-usage-no-write-1" },
    } as never);
    thread.handleAppServerNotification(CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED, {
      threadId: "thread-no-write-1",
      turnId: "turn-usage-no-write-1",
      tokenUsage: {
        total: {
          totalTokens: 120,
          inputTokens: 100,
          cachedInputTokens: 60,
          outputTokens: 20,
          reasoningOutputTokens: 8,
        },
        last: {
          totalTokens: 12,
          inputTokens: 10,
          cachedInputTokens: 6,
          outputTokens: 2,
          reasoningOutputTokens: 1,
        },
      },
    } as never);

    const [usage] = thread.getReadyTokenUsageUpdates();
    expect(usage).toMatchObject({
      reported_input_tokens: 100,
      cache_read_input_tokens: 60,
      raw_usage_json: {
        totalTokens: 120,
        inputTokens: 100,
        cachedInputTokens: 60,
        outputTokens: 20,
        reasoningOutputTokens: 8,
      },
    });
    expect(usage).not.toHaveProperty("cache_creation_input_tokens");
    expect(usage?.raw_usage_json).not.toHaveProperty("cacheWriteTokens");
    expect(usage?.raw_usage_json).not.toHaveProperty("cache_write_tokens");

    const rawEvent = usage?.raw_event_json as Record<string, any>;
    expect(rawEvent.tokenUsage).toEqual({
      total: {
        totalTokens: 120,
        inputTokens: 100,
        cachedInputTokens: 60,
        outputTokens: 20,
        reasoningOutputTokens: 8,
      },
      last: {
        totalTokens: 12,
        inputTokens: 10,
        cachedInputTokens: 6,
        outputTokens: 2,
        reasoningOutputTokens: 1,
      },
    });
    expect(rawEvent.autobyteus_cumulative_snapshot_provider_delta_tokens).toMatchObject({
      reported_input_tokens: 10,
      cache_read_input_tokens: 6,
      standard_input_tokens: null,
      cache_creation_input_tokens: null,
    });
  });

  it("queues multiple same-turn cumulative advancements instead of overwriting by turn id", () => {
    const { thread } = createThread(true);

    thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
      turn: {
        id: "turn-usage-multi-1",
      },
    } as never);

    for (const [index, totalInput, lastInput] of [
      [1, 1000, 100],
      [2, 1150, 150],
      [3, 1300, 150],
    ] as const) {
      thread.handleAppServerNotification(CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED, {
        threadId: "thread-1",
        turnId: "turn-usage-multi-1",
        tokenUsage: {
          total: {
            totalTokens: totalInput + 50 + index,
            inputTokens: totalInput,
            cachedInputTokens: totalInput - 10,
            outputTokens: 50 + index,
            reasoningOutputTokens: index,
          },
          last: {
            totalTokens: lastInput + 1,
            inputTokens: lastInput,
            cachedInputTokens: lastInput - 5,
            outputTokens: 1,
            reasoningOutputTokens: 1,
          },
        },
      } as never);
    }

    expect(thread.getReadyTokenUsageUpdates()).toHaveLength(3);
    expect(thread.getReadyTokenUsageUpdates().map((usage) => usage.reported_input_tokens)).toEqual([1000, 1150, 1300]);
  });

  it("keeps late token usage as an immediately consumable cumulative snapshot after turn completion", () => {
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
        total: {
          totalTokens: 180,
          inputTokens: 110,
          outputTokens: 70,
        },
        last: {
          totalTokens: 18,
          inputTokens: 11,
          outputTokens: 7,
        },
      },
    } as never);

    expect(thread.getReadyTokenUsageUpdates()).toEqual([
      expect.objectContaining({
        turnId: "turn-usage-late-1",
        usage_scope: "cumulative_snapshot",
        snapshot_series_key: "codex_thread:thread-1",
        reported_input_tokens: 110,
        reported_output_tokens: 70,
        reported_total_tokens: 180,
        input_token_semantic: "gross_includes_cache",
        cache_state: "not_reported",
        latest_prompt_tokens: 11,
        effective_context_window_tokens: null,
        context_window_usage_percent: null,
        raw_usage_json: { totalTokens: 180, inputTokens: 110, outputTokens: 70 },
        quality_flags: [],
      }),
    ]);
  });

  it("flags provider-delta metadata missing when a Codex cumulative total has no last payload", () => {
    const { thread } = createThread(true);

    thread.handleAppServerNotification(CodexThreadEventName.TURN_STARTED, {
      turn: { id: "turn-usage-total-1" },
    } as never);

    thread.handleAppServerNotification(CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED, {
      threadId: "thread-total-1",
      turnId: "turn-usage-total-1",
      eventId: "codex-usage-event-total-1",
      tokenUsage: {
        modelContextWindow: 200000,
        total: {
          totalTokens: 1400,
          inputTokens: 1100,
          cachedInputTokens: 700,
          outputTokens: 300,
          reasoningOutputTokens: 120,
        },
      },
    } as never);

    expect(thread.getReadyTokenUsageUpdates()).toEqual([
      expect.objectContaining({
        turnId: "turn-usage-total-1",
        usage_scope: "cumulative_snapshot",
        snapshot_series_key: "codex_thread:thread-total-1",
        idempotency_key: "codex_token_usage:codex-usage-event-total-1:run-auto:thread-total-1:turn-usage-total-1:cumulative_snapshot:1100:700:300:120:1400",
        reported_input_tokens: 1100,
        reported_output_tokens: 300,
        reported_total_tokens: 1400,
        input_token_semantic: "gross_includes_cache",
        cache_read_input_tokens: 700,
        cache_state: "positive",
        reasoning_output_tokens: 120,
        latest_prompt_tokens: 1100,
        effective_context_window_tokens: 200000,
        context_window_usage_percent: 0.5499999999999999,
        raw_usage_json: {
          totalTokens: 1400,
          inputTokens: 1100,
          cachedInputTokens: 700,
          outputTokens: 300,
          reasoningOutputTokens: 120,
        },
        raw_event_json: expect.objectContaining({
          threadId: "thread-total-1",
          turnId: "turn-usage-total-1",
          tokenUsage: expect.objectContaining({ modelContextWindow: 200000 }),
        }),
        quality_flags: ["cumulative_snapshot_provider_delta_missing"],
      }),
    ]);
  });

  it("does not let an old completion or terminal error clear a newer active turn", () => {
    const { thread } = createThread(true);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => messages.push(message));
    thread.markTurnStarted("turn-b");

    thread.handleAppServerNotification(CodexThreadEventName.TURN_COMPLETED, {
      turn: { id: "turn-a" },
    } as never);
    expect(thread.activeTurnId).toBe("turn-b");
    expect(thread.currentStatus).toBe("RUNNING");

    thread.handleAppServerNotification(CodexThreadEventName.TURN_COMPLETED, {
      turn: {},
    } as never);
    expect(thread.activeTurnId).toBe("turn-b");
    expect(thread.currentStatus).toBe("RUNNING");

    thread.handleAppServerNotification(CodexThreadEventName.ERROR, {
      turnId: "turn-a",
      code: "TURN_FAILED",
      message: "old failure",
    } as never);
    expect(thread.activeTurnId).toBe("turn-b");
    expect(thread.currentStatus).toBe("RUNNING");
    expect(messages.at(-1)?.params).toMatchObject({
      error_scope: "turn",
      error_effect: "terminal",
      turn_id: "turn-a",
    });
  });

  it("classifies an error status change before clearing the matching active turn", () => {
    const { thread } = createThread(true);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => messages.push(message));
    thread.markTurnStarted("turn-b");

    thread.handleAppServerNotification(CodexThreadEventName.THREAD_STATUS_CHANGED, {
      status: { type: "failed" },
      message: "provider status failed",
    } as never);

    expect(thread.activeTurnId).toBeNull();
    expect(thread.currentStatus).toBe("ERROR");
    expect(messages).toEqual([
      expect.objectContaining({
        method: CodexThreadEventName.ERROR,
        params: expect.objectContaining({
          message: "provider status failed",
          error_scope: "turn",
          error_effect: "terminal",
          turn_id: "turn-b",
        }),
      }),
    ]);
  });

  it("classifies client loss as runtime-global before clearing native identity", () => {
    const { thread } = createThread(true);
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    thread.subscribeAppServerMessages((message) => messages.push(message));
    thread.markTurnStarted("turn-b");

    thread.handleClientClosed(new Error("closed"));

    expect(thread.activeTurnId).toBeNull();
    expect(thread.currentStatus).toBe("ERROR");
    expect(messages.at(-1)?.params).toMatchObject({
      error_scope: "runtime",
      error_effect: "terminal",
    });
    expect(messages.at(-1)?.params).not.toHaveProperty("turn_id");
  });
});
