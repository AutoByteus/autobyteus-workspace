import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import { serializePayload } from "../../../../services/agent-streaming/payload-serialization.js";
import type { JsonObject } from "../codex-app-server-json.js";
import type { CodexThread, CodexThreadEventMessage } from "../thread/codex-thread.js";
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
import { normalizeCodexAgentToolsToolNameForEvent } from "../agent-tools-mcp/codex-agent-tools-mcp-materializer.js";
import {
  deriveCodexAgentRunStatusHint,
  resolveCodexAgentRunEventStatusHint,
} from "./codex-status-projector.js";
import {
  CodexSegmentSourcePayloadRejected,
  normalizeCodexSegmentSourcePayload,
} from "./codex-segment-source-payload-normalizer.js";
import {
  CodexProviderCompactionStatusProjector,
  type CodexCompactionSourceSurface,
} from "./codex-provider-compaction-status-projector.js";

type RuntimeRunReference = {
  runtimeKind: RuntimeKind;
  sessionId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown> | null;
};

const correlatedToolEventTypes = new Set<AgentRunEventType>([
  AgentRunEventType.TOOL_APPROVAL_REQUESTED,
  AgentRunEventType.TOOL_APPROVED,
  AgentRunEventType.TOOL_DENIED,
  AgentRunEventType.TOOL_EXECUTION_STARTED,
  AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
  AgentRunEventType.TOOL_EXECUTION_FAILED,
  AgentRunEventType.TOOL_EXECUTION_INTERRUPTED,
  AgentRunEventType.TOOL_LOG,
]);

const exactText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

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

export class CodexThreadEventConverter {
  private readonly itemEventPayloadParser = new CodexItemEventPayloadParser();
  private readonly orderedToolBoundaryTracker = new CodexOrderedToolBoundaryTracker();
  private readonly compactionStatusProjector = new CodexProviderCompactionStatusProjector();
  private rawCodexEventSequence = 0;

  private readonly turnEventConverterContext: CodexTurnEventConverterContext = {
    createEvent: (codexEventName, eventType, payload) =>
      this.createEvent(codexEventName, eventType, payload),
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
    resolveSegmentId: (payload) =>
      this.itemEventPayloadParser.resolveSegmentId(payload),
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
    resolveToolName: (payload) => this.resolveRawResponseToolName(payload),
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
    private readonly getLifecycleSnapshot: () => AgentRuntimeLifecycleSnapshot = () => ({
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    }),
  ) {
  }

  public convert(event: CodexThreadEventMessage): AgentRunEvent[] {
    const codexEventName = event.method.trim();
    const payload = event.params;
    this.rawCodexEventSequence += 1;
    logRawCodexThreadEventDetails(this.runId, this.rawCodexEventSequence, event);

    try {
      const converted = this.convertAdmittedEvent(codexEventName, payload);
      this.observeToolLifecycleCorrelation(converted);
      return converted;
    } catch (error) {
      if (error instanceof CodexSegmentSourcePayloadRejected) return [];
      throw error;
    }
  }

  private convertAdmittedEvent(codexEventName: string, payload: Readonly<JsonObject>): AgentRunEvent[] {
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

  private resolveRawResponseToolName(payload: JsonObject): string | null {
    const directToolName = normalizeCodexAgentToolsToolNameForEvent(
      this.itemEventPayloadParser.resolveToolName(payload),
    );
    if (directToolName) {
      return directToolName;
    }
    return this.orderedToolBoundaryTracker.resolveToolName(
      this.itemEventPayloadParser.resolveTurnId(payload),
      this.itemEventPayloadParser.resolveInvocationId(payload),
    );
  }

  private observeToolLifecycleCorrelation(events: readonly AgentRunEvent[]): void {
    for (const event of events) {
      if (!correlatedToolEventTypes.has(event.eventType)) continue;
      const turnId = exactText(event.payload.turn_id ?? event.payload.turnId);
      const invocationId = exactText(
        event.payload.invocation_id ?? event.payload.tool_invocation_id,
      );
      const toolName = exactText(event.payload.tool_name);
      if (!turnId || !invocationId || !toolName) continue;
      this.orderedToolBoundaryTracker.markOrderedToolCreated(
        turnId,
        invocationId,
        toolName,
      );
    }
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
    return actions.map((action) => action.kind === "start"
      ? this.createEvent(codexEventName, AgentRunEventType.SEGMENT_START, {
          id: action.segmentId,
          turn_id: action.turnId,
          segment_type: "reasoning",
        }, null)
      : action.kind === "content"
        ? this.createEvent(codexEventName, AgentRunEventType.SEGMENT_CONTENT, {
            ...serializeCodexItemEventPayload(sourcePayload),
            id: action.segmentId,
            turn_id: action.turnId,
            delta: action.delta,
          }, null)
        : this.createEvent(codexEventName, AgentRunEventType.SEGMENT_END, {
            id: action.segmentId,
            turn_id: action.turnId,
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
      },
    );
  }


  private createStatusEvent(
    codexEventName: string,
    payload: Record<string, unknown> = {},
  ): AgentRunEvent {
    const snapshot = this.getLifecycleSnapshot();
    return this.createEvent(codexEventName, AgentRunEventType.AGENT_STATUS, {
      status: snapshot.availability === "offline" ? "offline" : snapshot.phase,
      ...payload,
    });
  }

  private createEvent(
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
    statusHint: AgentRunEvent["statusHint"] = deriveCodexAgentRunStatusHint(codexEventName),
  ): AgentRunEvent {
    const segmentPayload = normalizeCodexSegmentSourcePayload(
      eventType,
      payload,
      (candidate) => this.itemEventPayloadParser.resolveTurnId(candidate),
    );
    const normalizedPayload = segmentPayload ?? (eventType === AgentRunEventType.ARTIFACT_PERSISTED
        ? {
            agent_id: this.runId,
            ...(this.workspaceRoot ? { workspace_root: this.workspaceRoot } : {}),
            ...payload,
          }
        : payload);
    const event: AgentRunEvent = {
      eventType,
      runId: this.runId,
      payload: normalizedPayload,
      statusHint: null,
    };
    event.statusHint = resolveCodexAgentRunEventStatusHint(event, statusHint);
    return event;
  }

  private createCodexProviderCompactionStatusEvent(
    sourceSurface: CodexCompactionSourceSurface,
    payload: JsonObject,
    status: "compacting" | "compacted",
    rotationEligible: boolean,
  ): AgentRunEvent | null {
    const projection = this.compactionStatusProjector.project(
      sourceSurface,
      payload,
      status,
      rotationEligible,
    );
    if (!projection) return null;
    return this.createEvent(
      projection.codexEventName,
      AgentRunEventType.COMPACTION_STATUS,
      projection.payload,
    );
  }
}
