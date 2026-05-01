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

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

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
  private providerBoundarySequence = 0;
  private readonly emittedBoundaryKeys: string[] = [];
  private readonly emittedBoundaryWindowKeys: string[] = [];

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
    resolveDynamicToolArguments: (payload) =>
      this.itemEventPayloadParser.resolveDynamicToolArguments(payload),
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
    createCompactionBoundaryEvent: (sourceSurface, payload) =>
      this.createCodexCompactionBoundaryEvent(sourceSurface, payload),
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
    if (codexEventName === CodexThreadEventName.THREAD_COMPACTED) {
      const converted = this.createCodexCompactionBoundaryEvent(
        "codex.thread_compacted",
        payload,
      );
      return converted ? [converted] : [];
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
      eventType === AgentRunEventType.ARTIFACT_PERSISTED
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

  private createCodexCompactionBoundaryEvent(
    sourceSurface: "codex.thread_compacted" | "codex.raw_response_compaction_item",
    payload: JsonObject,
  ): AgentRunEvent | null {
    const boundary = this.buildCodexCompactionBoundaryPayload(sourceSurface, payload);
    if (!boundary) {
      return null;
    }
    const boundaryKey = asString(boundary.boundary_key);
    const boundaryWindowKey = this.buildBoundaryWindowKey(boundary);
    if (
      !boundaryKey ||
      this.hasEmittedBoundaryKey(boundaryKey) ||
      this.hasEmittedBoundaryWindowKey(boundaryWindowKey)
    ) {
      return null;
    }
    this.rememberBoundaryKey(boundaryKey);
    this.rememberBoundaryWindowKey(boundaryWindowKey);
    return this.createEvent(
      sourceSurface === "codex.thread_compacted"
        ? CodexThreadEventName.THREAD_COMPACTED
        : CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED,
      AgentRunEventType.COMPACTION_STATUS,
      boundary,
    );
  }

  private buildCodexCompactionBoundaryPayload(
    sourceSurface: "codex.thread_compacted" | "codex.raw_response_compaction_item",
    payload: JsonObject,
  ): Record<string, unknown> | null {
    this.providerBoundarySequence += 1;
    const item = asObject(payload.item);
    const stableId =
      asString(payload.compaction_id) ??
      asString(payload.compactionId) ??
      asString(payload.event_id) ??
      asString(payload.eventId) ??
      asString(payload.id) ??
      asString(item?.id) ??
      asString(item?.compaction_id) ??
      asString(item?.response_id);
    const threadId =
      asString(payload.thread_id) ??
      asString(payload.threadId) ??
      asString(item?.thread_id) ??
      asString(item?.threadId);
    const responseId =
      asString(payload.response_id) ??
      asString(payload.responseId) ??
      asString(item?.response_id) ??
      asString(item?.responseId);
    const turnId =
      asString(payload.turn_id) ??
      asString(payload.turnId) ??
      asString(item?.turn_id) ??
      asString(item?.turnId);
    const boundaryKeyParts = stableId
      ? ["codex", threadId ?? "thread", stableId]
      : ["codex", threadId ?? "thread", sourceSurface, turnId ?? "turn", String(this.providerBoundarySequence)];
    return {
      kind: "provider_compaction_boundary",
      runtime_kind: "CODEX",
      provider: "codex",
      source_surface: sourceSurface,
      boundary_key: boundaryKeyParts.join(":"),
      provider_thread_id: threadId,
      provider_event_id: stableId,
      provider_response_id: responseId,
      provider_timestamp: asNumber(payload.ts) ?? asNumber(payload.timestamp) ?? null,
      turn_id: turnId,
      trigger: asString(payload.trigger) ?? asString(item?.trigger) ?? "auto",
      status: "compacted",
      pre_tokens: asNumber(payload.pre_tokens) ?? asNumber(item?.pre_tokens) ?? null,
      rotation_eligible: true,
      semantic_compaction: false,
      raw: serializePayload(payload),
    };
  }

  private hasEmittedBoundaryKey(key: string): boolean {
    return this.emittedBoundaryKeys.includes(key);
  }

  private rememberBoundaryKey(key: string): void {
    this.emittedBoundaryKeys.push(key);
    if (this.emittedBoundaryKeys.length > 100) this.emittedBoundaryKeys.shift();
  }

  private buildBoundaryWindowKey(boundary: Record<string, unknown>): string {
    return [
      "codex",
      asString(boundary.provider_thread_id) ?? "thread",
      asString(boundary.turn_id) ?? asString(boundary.provider_response_id) ?? "turn",
    ].join(":");
  }

  private hasEmittedBoundaryWindowKey(key: string): boolean {
    return this.emittedBoundaryWindowKeys.includes(key);
  }

  private rememberBoundaryWindowKey(key: string): void {
    this.emittedBoundaryWindowKeys.push(key);
    if (this.emittedBoundaryWindowKeys.length > 100) this.emittedBoundaryWindowKeys.shift();
  }
}
