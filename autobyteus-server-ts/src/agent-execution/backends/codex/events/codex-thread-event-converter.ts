import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import type { JsonObject } from "../codex-app-server-json.js";
import type { CodexAppServerMessage } from "../thread/codex-app-server-message.js";
import type { CodexThread } from "../thread/codex-thread.js";
import { CodexItemEventPayloadParser } from "./codex-item-event-payload-parser.js";
import {
  convertCodexItemEvent,
  isCodexItemEventName,
  type CodexItemEventConverterContext,
} from "./codex-item-event-converter.js";
import {
  convertCodexRawResponseEvent,
  isCodexRawResponseEventName,
  type CodexRawResponseEventConverterContext,
} from "./codex-raw-response-event-converter.js";
import {
  convertCodexThreadLifecycleEvent,
  isCodexThreadLifecycleEventName,
  type CodexThreadLifecycleEventConverterContext,
} from "./codex-thread-lifecycle-event-converter.js";
import {
  convertCodexTurnEvent,
  isCodexTurnEventName,
  type CodexTurnEventConverterContext,
} from "./codex-turn-event-converter.js";
import { logRawCodexThreadEventDetails } from "./codex-thread-event-debug.js";
import { CodexThreadEventName } from "./codex-thread-event-name.js";

type RuntimeRunReference = {
  runtimeKind: RuntimeKind;
  sessionId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown> | null;
};

export const buildCodexAgentRunRuntimeReference = (
  runId: string,
  thread: CodexThread | null,
): RuntimeRunReference | null => {
  if (!thread) {
    return null;
  }
  return {
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    sessionId: runId,
    threadId: thread.threadId,
    metadata: {
      cwd: thread.workingDirectory,
      model: thread.model,
      reasoning_effort: thread.reasoningEffort,
      approval_policy: thread.config.approvalPolicy,
      sandbox: thread.config.sandbox,
    },
  };
};

export const deriveCodexAgentRunStatusHint = (
  codexEventName: string,
): "ACTIVE" | "IDLE" | "ERROR" | null => {
  if (codexEventName === CodexThreadEventName.TURN_STARTED) {
    return "ACTIVE";
  }
  if (codexEventName === CodexThreadEventName.TURN_COMPLETED) {
    return "IDLE";
  }
  if (codexEventName === CodexThreadEventName.ERROR) {
    return "ERROR";
  }
  return null;
};

export class CodexThreadEventConverter {
  private readonly itemEventPayloadParser = new CodexItemEventPayloadParser();
  private rawCodexEventSequence = 0;

  private readonly turnEventConverterContext: CodexTurnEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
    clearReasoningSegmentForTurn: (payload) =>
      this.itemEventPayloadParser.clearReasoningSegmentForTurn(payload),
  };

  private readonly itemEventConverterContext: CodexItemEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
    createSegmentContentEvent: (codexEventName, payload, segmentType) =>
      this.createSegmentContentEvent(codexEventName, payload, segmentType),
    clearReasoningSegmentForTurn: (payload) =>
      this.itemEventPayloadParser.clearReasoningSegmentForTurn(payload),
    resolveItemType: (payload) => this.itemEventPayloadParser.resolveItemType(payload),
    isUserMessageItem: (itemType) => this.itemEventPayloadParser.isUserMessageItem(itemType),
    isReasoningItem: (itemType) => this.itemEventPayloadParser.isReasoningItem(itemType),
    isWebSearchItem: (itemType) => this.itemEventPayloadParser.isWebSearchItem(itemType),
    resolveWebSearchMetadata: (payload) =>
      this.itemEventPayloadParser.resolveWebSearchMetadata(payload),
    resolveSegmentStartId: (payload, segmentType) =>
      this.itemEventPayloadParser.resolveSegmentStartId(payload, segmentType),
    resolveSegmentType: (payload) => this.itemEventPayloadParser.resolveSegmentType(payload),
    resolveSegmentMetadata: (payload) =>
      this.itemEventPayloadParser.resolveSegmentMetadata(payload),
    resolveReasoningSnapshot: (payload) =>
      this.itemEventPayloadParser.resolveReasoningSnapshot(payload),
    resolveReasoningSegmentId: (payload) =>
      this.itemEventPayloadParser.resolveReasoningSegmentId(payload),
    resolveSegmentId: (payload, fallback) =>
      this.itemEventPayloadParser.resolveSegmentId(payload, fallback),
    resolveInvocationId: (payload) => this.itemEventPayloadParser.resolveInvocationId(payload),
    resolveToolName: (payload, fallback) =>
      this.itemEventPayloadParser.resolveToolName(payload, fallback),
    resolveCommandValue: (payload) => this.itemEventPayloadParser.resolveCommandValue(payload),
    resolveToolArguments: (payload, fallbackToolName) =>
      this.itemEventPayloadParser.resolveToolArguments(payload, fallbackToolName),
    resolveLogEntry: (payload) => this.itemEventPayloadParser.resolveLogEntry(payload),
    isExecutionFailure: (payload) => this.itemEventPayloadParser.isExecutionFailure(payload),
    resolveToolError: (payload) => this.itemEventPayloadParser.resolveToolError(payload),
    resolveToolResult: (payload) => this.itemEventPayloadParser.resolveToolResult(payload),
    resolveToolDecisionReason: (payload) =>
      this.itemEventPayloadParser.resolveToolDecisionReason(payload),
    resolveExecutionStatus: (payload) =>
      this.itemEventPayloadParser.resolveExecutionStatus(payload),
  };

  private readonly threadLifecycleEventConverterContext: CodexThreadLifecycleEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
  };

  private readonly rawResponseEventConverterContext: CodexRawResponseEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
    resolveItemType: (payload) => this.itemEventPayloadParser.resolveItemType(payload),
    resolveInvocationId: (payload) => this.itemEventPayloadParser.resolveInvocationId(payload),
    resolveLogEntry: (payload) => this.itemEventPayloadParser.resolveLogEntry(payload),
  };

  constructor(
    private readonly runId: string,
    private readonly workspaceRoot: string | null = null,
  ) {
  }

  public convert(event: CodexAppServerMessage): AgentRunEvent[] {
    const codexEventName = event.method.trim();
    const payload = event.params;
    this.rawCodexEventSequence += 1;
    logRawCodexThreadEventDetails(this.runId, this.rawCodexEventSequence, event);

    if (codexEventName.startsWith("codex/event/")) {
      return [];
    }
    if (isCodexTurnEventName(codexEventName)) {
      return convertCodexTurnEvent(this.turnEventConverterContext, codexEventName, payload);
    }
    if (
      codexEventName === CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED ||
      codexEventName === CodexThreadEventName.LOCAL_TOOL_APPROVED ||
      codexEventName === CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED ||
      isCodexItemEventName(codexEventName)
    ) {
      return convertCodexItemEvent(this.itemEventConverterContext, codexEventName, payload);
    }
    if (isCodexRawResponseEventName(codexEventName)) {
      const converted = convertCodexRawResponseEvent(
        this.rawResponseEventConverterContext,
        codexEventName,
        payload,
      );
      return converted ? [converted] : [];
    }
    if (isCodexThreadLifecycleEventName(codexEventName)) {
      const converted = convertCodexThreadLifecycleEvent(
        this.threadLifecycleEventConverterContext,
        codexEventName,
        payload,
      );
      return converted ? [converted] : [];
    }
    return [];
  }

  private createSegmentContentEvent(
    codexEventName: string,
    payload: JsonObject,
    segmentType?: "text" | "reasoning",
  ): AgentRunEvent | null {
    const delta =
      segmentType === "reasoning"
        ? this.itemEventPayloadParser.resolveReasoningDelta(payload)
        : this.itemEventPayloadParser.resolveDelta(payload);
    if (!delta) {
      return null;
    }
    return this.createEvent(
      codexEventName,
      AgentRunEventType.SEGMENT_CONTENT,
      {
        ...serializePayload(payload),
        id:
          segmentType === "reasoning"
            ? this.itemEventPayloadParser.resolveReasoningSegmentId(payload)
            : this.itemEventPayloadParser.resolveSegmentId(payload),
        delta,
        ...(segmentType ? { segment_type: segmentType } : {}),
      },
    );
  }

  private createEvent(
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ): AgentRunEvent {
    const normalizedPayload =
      eventType === AgentRunEventType.ARTIFACT_PERSISTED ||
      eventType === AgentRunEventType.ARTIFACT_UPDATED
        ? {
            agent_id: this.runId,
            ...(this.workspaceRoot ? { workspace_root: this.workspaceRoot } : {}),
            ...payload,
          }
        : payload;
    return {
      eventType,
      runId: this.runId,
      payload: normalizedPayload,
      statusHint: deriveCodexAgentRunStatusHint(codexEventName),
    };
  }
}
