import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../src/agent-execution/domain/agent-run-context.js";
import type { AgentRunEvent } from "../../src/agent-execution/domain/agent-run-event.js";
import { CodexAgentRunContext } from "../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import {
  asObject,
  type JsonObject,
} from "../../src/agent-execution/backends/codex/codex-app-server-json.js";
import { CodexThreadEventConverter } from "../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { projectCodexAgentLifecycleSnapshot } from "../../src/agent-execution/backends/codex/events/codex-status-projector.js";
import { CodexThread } from "../../src/agent-execution/backends/codex/thread/codex-thread.js";
import { CodexApprovalPolicy } from "../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { createCodexThreadStartupGate } from "../../src/agent-execution/backends/codex/thread/codex-thread-startup-gate.js";
import { CodexAppServerClient } from "../../src/runtime-management/codex/client/codex-app-server-client.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";

type ThreadEventInput = Readonly<{
  method: string;
  params: JsonObject;
}>;

const governedEventNames = new Set<string>([
  CodexThreadEventName.ITEM_STARTED,
  CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
  CodexThreadEventName.ITEM_COMPLETED,
  CodexThreadEventName.ITEM_REASONING_COMPLETED,
]);

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const resolveExplicitTurnId = (params: JsonObject): string | null => {
  const item = asObject(params.item);
  const turn = asObject(params.turn);
  return (
    asNonEmptyString(params.turn_id) ??
    asNonEmptyString(params.turnId) ??
    asNonEmptyString(item?.turn_id) ??
    asNonEmptyString(item?.turnId) ??
    asNonEmptyString(turn?.id)
  );
};

const createRunContext = (runId: string) =>
  new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "codex-thread-event-harness-agent",
      llmModelIdentifier: "gpt-5.4-mini",
      autoExecuteTools: false,
      workspaceId: "/tmp/codex-thread-event-harness",
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
      memberTeamContext: null,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: "gpt-5.4-mini",
        workingDirectory: "/tmp/codex-thread-event-harness",
        reasoningEffort: "medium",
        serviceTier: null,
        approvalPolicy: CodexApprovalPolicy.ON_REQUEST,
        sandbox: "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: [],
      },
    }),
  });

/**
 * Drives converter coverage through the production-owned CodexThread boundary.
 * It admits native or operation-owned facts through the real thread and gives
 * the converter only the values emitted to that thread's listener.
 */
export const createCodexThreadEventHarness = (
  runId = "run-1",
  workspaceRoot = "/tmp/codex-thread-event-harness",
) => {
  const client = new CodexAppServerClient({
    command: "false",
    args: [],
    cwd: "/tmp/codex-thread-event-harness",
    env: {},
  });
  const thread = new CodexThread({
    runContext: createRunContext(runId),
    client,
    startup: createCodexThreadStartupGate(),
  });
  const converter = new CodexThreadEventConverter(
    runId,
    workspaceRoot,
    () => projectCodexAgentLifecycleSnapshot({
      ...thread.getStatusSnapshotSource(),
      isActive: true,
    }),
  );
  const convertedEvents: AgentRunEvent[] = [];
  const convertedBatches: Array<Readonly<{
    source: "native_admitted" | "local_derived";
    method: string;
    events: readonly AgentRunEvent[];
  }>> = [];
  let listenerMessageCount = 0;
  let requestId = 1;

  thread.subscribeAppServerMessages((message) => {
    listenerMessageCount += 1;
    const events = converter.convert(message);
    convertedEvents.push(...events);
    convertedBatches.push({
      source: message.source,
      method: message.method,
      events,
    });
  });

  const emitNative = (input: ThreadEventInput): AgentRunEvent[] => {
    const batchStart = convertedBatches.length;
    const explicitTurnId = governedEventNames.has(input.method)
      ? resolveExplicitTurnId(input.params)
      : null;
    if (explicitTurnId && thread.activeTurnId !== explicitTurnId) {
      thread.markTurnStarted(explicitTurnId);
    }
    thread.handleAppServerNotification(input.method, input.params);
    return convertedBatches
      .slice(batchStart)
      .filter((batch) => batch.method === input.method)
      .flatMap((batch) => batch.events);
  };

  const emitLocalMcpCompletion = (params: JsonObject): AgentRunEvent[] => {
    const item = asObject(params.item);
    const invocationId = asNonEmptyString(params.invocation_id) ?? asNonEmptyString(item?.id);
    if (!item || !invocationId) {
      throw new Error("Local MCP completion fixture requires an item and invocation identity.");
    }
    const turnId = resolveExplicitTurnId(params) ?? "turn-1";
    if (thread.activeTurnId !== turnId) {
      thread.markTurnStarted(turnId);
    }
    thread.trackPendingMcpToolCall({
      invocationId,
      turnId,
      serverName: asNonEmptyString(item.server),
      toolName: asNonEmptyString(params.tool_name) ?? asNonEmptyString(item.tool),
      arguments: asObject(params.arguments) ?? {},
    });
    const batchStart = convertedBatches.length;
    emitNative({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params,
    });
    return convertedBatches
      .slice(batchStart)
      .filter((batch) =>
        batch.source === "local_derived" &&
        batch.method === CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      )
      .flatMap((batch) => batch.events);
  };

  const emitLocalApprovalRequest = (params: JsonObject): AgentRunEvent[] => {
    const batchStart = convertedBatches.length;
    const invocationId = asNonEmptyString(params.invocation_id);
    const toolName = asNonEmptyString(params.tool_name);
    const argumentsPayload = asObject(params.arguments) ?? {};
    if (!invocationId || !toolName) {
      throw new Error("Local approval fixture requires invocation_id and tool_name.");
    }

    if (toolName === "request_permissions") {
      thread.handleAppServerRequest(
        requestId++,
        CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL,
        {
          threadId: "thread-1",
          turnId: "turn-1",
          itemId: invocationId,
          cwd: argumentsPayload.cwd ?? "/tmp/codex-thread-event-harness",
          permissions: argumentsPayload.permissions ?? {},
          reason: argumentsPayload.reason ?? null,
          startedAtMs: 1,
        },
      );
      return convertedBatches
        .slice(batchStart)
        .filter((batch) => batch.method === CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED)
        .flatMap((batch) => batch.events);
    }

    const turnId = resolveExplicitTurnId(params) ?? "turn-1";
    thread.trackPendingMcpToolCall({
      invocationId,
      turnId,
      serverName: "test-server",
      toolName,
      arguments: argumentsPayload,
    });
    thread.handleAppServerRequest(requestId++, "mcpServer/elicitation/request", {
      threadId: "thread-1",
      turnId,
      serverName: "test-server",
      mode: "form",
      _meta: {
        codex_approval_kind: "mcp_tool_call",
        tool_params: argumentsPayload,
      },
      message: `Allow the test MCP server to run tool "${toolName}"?`,
      requestedSchema: {
        type: "object",
        properties: {},
      },
    });
    return convertedBatches
      .slice(batchStart)
      .filter((batch) => batch.method === CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED)
      .flatMap((batch) => batch.events);
  };

  return {
    thread,
    get listenerMessageCount() {
      return listenerMessageCount;
    },
    get convertedEventCount() {
      return convertedEvents.length;
    },
    emitRuntimeError(code: string, message: string): AgentRunEvent[] {
      const batchStart = convertedBatches.length;
      thread.emitRuntimeError(code, message);
      return convertedBatches
        .slice(batchStart)
        .filter((batch) => batch.method === CodexThreadEventName.ERROR)
        .flatMap((batch) => batch.events);
    },
    emitThroughThread(input: ThreadEventInput): AgentRunEvent[] {
      if (input.method === CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED) {
        return emitLocalMcpCompletion(input.params);
      }
      if (input.method === CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED) {
        return emitLocalApprovalRequest(input.params);
      }
      return emitNative(input);
    },
  };
};
