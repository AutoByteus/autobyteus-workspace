import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentStatusPayload } from "../../../domain/agent-status-payload.js";
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
import { CodexOrderedToolBoundaryTracker } from "./codex-ordered-tool-boundary-tracker.js";
import type { CodexReasoningLifecycleAction } from "./codex-reasoning-block-tracker.js";
import { serializeCodexItemEventPayload } from "../agent-tools-mcp/codex-agent-tools-mcp-event-payload.js";

type RuntimeRunReference = {
  runtimeKind: RuntimeKind;
  sessionId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown> | null;
};

type CodexCompactionSourceSurface =
  | "codex.thread_compacted"
  | "codex.raw_response_compaction_item"
  | "codex.context_compaction_started"
  | "codex.context_compaction_completed";

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
  private readonly orderedToolBoundaryTracker = new CodexOrderedToolBoundaryTracker();
  private rawCodexEventSequence = 0;
  private providerBoundarySequence = 0;
  private readonly emittedBoundaryKeys: string[] = [];
  private readonly emittedBoundaryWindowKeys: string[] = [];
  private readonly emittedNoStableIdBoundaryWindowKeys: string[] = [];

  private readonly turnEventConverterContext: CodexTurnEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
    createStatusEvent: (codexEventName, payload) =>
      this.createStatusEvent(codexEventName, payload),
    closeReasoningBlocksForBoundary: (codexEventName, payload) =>
      this.closeReasoningBlocksForBoundary(codexEventName, payload),
    closeAllReasoningBlocks: (codexEventName) => this.closeAllReasoningBlocks(codexEventName),
    clearOrderedToolsForBoundary: (payload) => this.clearOrderedToolsForBoundary(payload),
    clearAllOrderedTools: () => this.orderedToolBoundaryTracker.clearAll(),
  };

  private readonly itemEventConverterContext: CodexItemEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
    createTextSegmentContentEvent: (codexEventName, payload) =>
      this.createTextSegmentContentEvent(codexEventName, payload),
    createCompactionStatusEvent: (sourceSurface, payload, status, rotationEligible) =>
      this.createCodexProviderCompactionStatusEvent(
        sourceSurface,
        payload,
        status,
        rotationEligible,
      ),
    closeReasoningBlocksForBoundary: (codexEventName, payload) =>
      this.closeReasoningBlocksForBoundary(codexEventName, payload),
    resolveCompletedReasoningEvents: (codexEventName, payload) =>
      this.mapReasoningLifecycleActions(
        codexEventName,
        payload,
        this.itemEventPayloadParser.resolveCompletedReasoningSnapshot(payload),
      ),
    classifyToolLifecycleUpdate: (payload) =>
      this.orderedToolBoundaryTracker.classifyToolLifecycleUpdate(
        this.itemEventPayloadParser.resolveTurnId(payload),
        this.itemEventPayloadParser.resolveInvocationId(payload),
      ),
    resolveItemType: (payload) => this.itemEventPayloadParser.resolveItemType(payload),
    isUserMessageItem: (itemType) => this.itemEventPayloadParser.isUserMessageItem(itemType),
    isReasoningItem: (itemType) => this.itemEventPayloadParser.isReasoningItem(itemType),
    resolveWebSearchMetadata: (payload) =>
      this.itemEventPayloadParser.resolveWebSearchMetadata(payload),
    resolveWebSearchArguments: (payload) =>
      this.itemEventPayloadParser.resolveWebSearchArguments(payload),
    resolveWebSearchResult: (payload) =>
      this.itemEventPayloadParser.resolveWebSearchResult(payload),
    resolveWebSearchError: (payload) =>
      this.itemEventPayloadParser.resolveWebSearchError(payload),
    resolveTurnId: (payload) => this.itemEventPayloadParser.resolveTurnId(payload),
    resolveSegmentStartId: (payload, segmentType) =>
      this.itemEventPayloadParser.resolveSegmentStartId(payload, segmentType),
    resolveSegmentType: (payload) => this.itemEventPayloadParser.resolveSegmentType(payload),
    resolveSegmentMetadata: (payload) =>
      this.itemEventPayloadParser.resolveSegmentMetadata(payload),
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
    hasExplicitToolArguments: (payload) =>
      this.itemEventPayloadParser.hasExplicitToolArguments(payload),
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
    createStatusEvent: (codexEventName, payload) =>
      this.createStatusEvent(codexEventName, payload),
    closeAllReasoningBlocks: (codexEventName) => this.closeAllReasoningBlocks(codexEventName),
    clearAllOrderedTools: () => this.orderedToolBoundaryTracker.clearAll(),
  };

  private readonly rawResponseEventConverterContext: CodexRawResponseEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
    createCompactionBoundaryEvent: (sourceSurface, payload) =>
      this.createCodexProviderCompactionStatusEvent(
        sourceSurface,
        payload,
        "compacted",
        true,
      ),
    resolveItemType: (payload) => this.itemEventPayloadParser.resolveItemType(payload),
    resolveInvocationId: (payload) => this.itemEventPayloadParser.resolveInvocationId(payload),
    resolveLogEntry: (payload) => this.itemEventPayloadParser.resolveLogEntry(payload),
    closeReasoningBlocksForBoundary: (codexEventName, payload) =>
      this.closeReasoningBlocksForBoundary(codexEventName, payload),
    classifyToolLifecycleUpdate: (payload) =>
      this.orderedToolBoundaryTracker.classifyToolLifecycleUpdate(
        this.itemEventPayloadParser.resolveTurnId(payload),
        this.itemEventPayloadParser.resolveInvocationId(payload),
      ),
  };

  constructor(
    private readonly runId: string,
    private readonly workspaceRoot: string | null = null,
    private readonly getStatusPayload: () => AgentStatusPayload = () => ({
      status: "offline",
      can_interrupt: false,
    }),
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
      const converted = this.createCodexProviderCompactionStatusEvent(
        "codex.thread_compacted",
        payload,
        "compacted",
        true,
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
      return convertCodexRawResponseEvent(
        this.rawResponseEventConverterContext,
        codexEventName,
        payload,
      );
    }
    if (isCodexThreadLifecycleEventName(codexEventName)) {
      return convertCodexThreadLifecycleEvent(
        this.threadLifecycleEventConverterContext,
        codexEventName,
        payload,
      );
    }
    return [];
  }

  private clearOrderedToolsForBoundary(payload: JsonObject): void {
    const turnId = this.itemEventPayloadParser.resolveTurnId(payload);
    if (turnId) this.orderedToolBoundaryTracker.clearForTurn(turnId);
    else this.orderedToolBoundaryTracker.clearAll();
  }

  private closeReasoningBlocksForBoundary(
    codexEventName: string,
    payload: JsonObject,
  ): AgentRunEvent[] {
    return this.mapReasoningLifecycleActions(
      codexEventName,
      payload,
      this.itemEventPayloadParser.closeReasoningBlocksForBoundary(payload),
    );
  }

  private closeAllReasoningBlocks(codexEventName: string): AgentRunEvent[] {
    const actions = this.itemEventPayloadParser.closeAllReasoningBlocks();
    return this.mapReasoningLifecycleActions(codexEventName, {}, actions);
  }

  private mapReasoningLifecycleActions(
    codexEventName: string,
    sourcePayload: JsonObject,
    actions: CodexReasoningLifecycleAction[],
  ): AgentRunEvent[] {
    return actions.map((action) => action.kind === "content"
      ? this.createEvent(codexEventName, AgentRunEventType.SEGMENT_CONTENT, {
          ...serializeCodexItemEventPayload(sourcePayload),
          id: action.segmentId,
          delta: action.delta,
          segment_type: "reasoning",
        }, null)
      : this.createEvent(codexEventName, AgentRunEventType.SEGMENT_END, {
          id: action.segmentId,
          turn_id: action.turnId,
          segment_type: "reasoning",
        }, null));
  }

  private createTextSegmentContentEvent(
    codexEventName: string,
    payload: JsonObject,
  ): AgentRunEvent | null {
    const delta = this.itemEventPayloadParser.resolveDelta(payload);
    if (!delta) return null;
    return this.createEvent(
      codexEventName,
      AgentRunEventType.SEGMENT_CONTENT,
      {
        ...serializePayload(payload),
        id: this.itemEventPayloadParser.resolveSegmentId(payload),
        delta,
        segment_type: "text",
      },
    );
  }


  private createStatusEvent(
    codexEventName: string,
    payload: Partial<AgentStatusPayload> = {},
  ): AgentRunEvent {
    return this.createEvent(codexEventName, AgentRunEventType.AGENT_STATUS, {
      ...this.getStatusPayload(),
      ...payload,
    });
  }

  private createEvent(
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
    statusHint: AgentRunEvent["statusHint"] = deriveCodexAgentRunStatusHint(codexEventName),
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
      statusHint,
    };
  }

  private createCodexProviderCompactionStatusEvent(
    sourceSurface: CodexCompactionSourceSurface,
    payload: JsonObject,
    status: "compacting" | "compacted",
    rotationEligible: boolean,
  ): AgentRunEvent | null {
    const boundary = this.buildCodexCompactionStatusPayload(
      sourceSurface,
      payload,
      status,
      rotationEligible,
    );
    if (!boundary) {
      return null;
    }
    const boundaryKey = asString(boundary.boundary_key);
    if (!boundaryKey) {
      return null;
    }

    if (rotationEligible && this.hasEmittedCompletedBoundary(boundaryKey, boundary)) {
      return null;
    }
    if (rotationEligible) {
      this.rememberCompletedBoundary(boundaryKey, boundary);
    }

    return this.createEvent(
      this.resolveCompactionCodexEventName(sourceSurface),
      AgentRunEventType.COMPACTION_STATUS,
      boundary,
    );
  }

  private buildCodexCompactionStatusPayload(
    sourceSurface: CodexCompactionSourceSurface,
    payload: JsonObject,
    status: "compacting" | "compacted",
    rotationEligible: boolean,
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
      ? [
          "codex",
          threadId ?? "thread",
          stableId,
          ...(rotationEligible ? [] : [status]),
        ]
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
      status,
      pre_tokens: asNumber(payload.pre_tokens) ?? asNumber(item?.pre_tokens) ?? null,
      rotation_eligible: rotationEligible,
      semantic_compaction: false,
      raw: serializePayload(payload),
    };
  }

  private resolveCompactionCodexEventName(
    sourceSurface: CodexCompactionSourceSurface,
  ): CodexThreadEventName {
    switch (sourceSurface) {
      case "codex.thread_compacted":
        return CodexThreadEventName.THREAD_COMPACTED;
      case "codex.context_compaction_started":
        return CodexThreadEventName.ITEM_STARTED;
      case "codex.context_compaction_completed":
        return CodexThreadEventName.ITEM_COMPLETED;
      case "codex.raw_response_compaction_item":
        return CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED;
    }
  }

  private hasEmittedCompletedBoundary(
    boundaryKey: string,
    boundary: Record<string, unknown>,
  ): boolean {
    if (this.hasEmittedBoundaryKey(boundaryKey)) {
      return true;
    }
    const stableId = asString(boundary.provider_event_id);
    const boundaryWindowKey = this.buildBoundaryWindowKey(boundary);
    if (!stableId && this.hasEmittedBoundaryWindowKey(boundaryWindowKey)) {
      return true;
    }
    if (stableId && this.hasEmittedNoStableIdBoundaryWindowKey(boundaryWindowKey)) {
      return true;
    }
    return false;
  }

  private rememberCompletedBoundary(
    boundaryKey: string,
    boundary: Record<string, unknown>,
  ): void {
    this.rememberBoundaryKey(boundaryKey);
    const boundaryWindowKey = this.buildBoundaryWindowKey(boundary);
    this.rememberBoundaryWindowKey(boundaryWindowKey);
    if (!asString(boundary.provider_event_id)) {
      this.rememberNoStableIdBoundaryWindowKey(boundaryWindowKey);
    }
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

  private hasEmittedNoStableIdBoundaryWindowKey(key: string): boolean {
    return this.emittedNoStableIdBoundaryWindowKeys.includes(key);
  }

  private rememberNoStableIdBoundaryWindowKey(key: string): void {
    this.emittedNoStableIdBoundaryWindowKeys.push(key);
    if (this.emittedNoStableIdBoundaryWindowKeys.length > 100) {
      this.emittedNoStableIdBoundaryWindowKeys.shift();
    }
  }
}
