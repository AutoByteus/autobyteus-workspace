import { LLMUserMessage } from '../llm/user-message.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../llm/utils/messages.js';
import { CompleteResponse } from '../llm/utils/response-types.js';
import { ToolResultEvent } from '../agent/events/agent-events.js';
import { ToolInvocation } from '../agent/tool-invocation.js';

import { RawTraceItem, type RawTraceItemOptions } from './models/raw-trace-item.js';
import { MemoryType } from './models/memory-types.js';
import { CompactionPolicy } from './policies/compaction-policy.js';
import { Compactor } from './compaction/compactor.js';
import { Retriever } from './retrieval/retriever.js';
import { MemoryStore } from './store/base-store.js';
import { TurnTracker } from './turn-tracker.js';
import { WorkingContextSnapshot } from './working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from './working-context-snapshot-serializer.js';
import { WorkingContextSnapshotStore } from './store/working-context-snapshot-store.js';
import { buildToolInteractions } from './tool-interaction-builder.js';
import { projectLlmSafeWorkingContext } from './working-context-llm-safe-projector.js';
import { getMessageProvenance, setMessageProvenance, type MessageProvenance } from './message-provenance.js';
import { buildToolIntentTraces, buildToolResultTraces } from './raw-trace-ingestion.js';

export type ToolIntentIngestionOptions = {
  appendToWorkingContext?: boolean;
  assistantContent?: string | null;
  assistantReasoning?: string | null;
};

export type ToolResultIngestionOptions = {
  source?: string;
  appendToWorkingContext?: boolean;
};

export type WorkingContextAppendOptions = MessageProvenance & {
  persist?: boolean;
};

export type MemoryProjectionScope = {
  kind: 'agent_turn';
  id: string;
};

export type AppendRawTraceInput = RawTraceItem | (
  Omit<RawTraceItemOptions, 'id' | 'ts' | 'seq'> &
  Partial<Pick<RawTraceItemOptions, 'id' | 'ts' | 'seq'>>
);

export type ProjectWorkingContextForNextLlmInput = {
  mode?: 'llm_safe';
  fenceIncompleteToolProtocolScope?: MemoryProjectionScope;
  includeCommittedFacts?: boolean;
};

export type OperationBoundaryNoteInput = {
  scope: MemoryProjectionScope;
  reason?: string | null;
};

export type CompactionOperationId = string;

export type PendingCompactionRequest = {
  operationId: CompactionOperationId;
  requestedTurnId: string | null;
};

const OPERATION_BOUNDARY_TRACE_TYPE = 'operation_boundary';

export class MemoryManager {
  store: MemoryStore;
  turnTracker: TurnTracker;
  compactionPolicy: CompactionPolicy;
  compactor: Compactor | null;
  retriever: Retriever;
  memoryTypes = MemoryType;
  workingContextSnapshot: WorkingContextSnapshot;
  workingContextSnapshotStore: WorkingContextSnapshotStore | null;
  compactionRequired = false;
  private pendingCompactionRequest: PendingCompactionRequest | null = null;
  private compactionOperationCounter = 0;
  private seqByTurn = new Map<string, number>();

  constructor(options: {
    store: MemoryStore;
    turnTracker?: TurnTracker;
    compactionPolicy?: CompactionPolicy;
    compactor?: Compactor | null;
    retriever?: Retriever;
    workingContextSnapshot?: WorkingContextSnapshot;
    workingContextSnapshotStore?: WorkingContextSnapshotStore | null;
  }) {
    this.store = options.store;
    this.turnTracker = options.turnTracker ?? new TurnTracker();
    this.compactionPolicy = options.compactionPolicy ?? new CompactionPolicy();
    this.compactor = options.compactor ?? null;
    this.retriever = options.retriever ?? new Retriever(this.store);
    this.workingContextSnapshot = options.workingContextSnapshot ?? new WorkingContextSnapshot();
    this.workingContextSnapshotStore = options.workingContextSnapshotStore ?? null;
  }

  startTurn(): string {
    return this.turnTracker.nextTurnId();
  }

  requestCompaction(requestedTurnId?: string | null): CompactionOperationId {
    this.compactionRequired = true;
    if (!this.pendingCompactionRequest) {
      this.pendingCompactionRequest = {
        operationId: this.createCompactionOperationId(),
        requestedTurnId: requestedTurnId ?? null,
      };
    } else if (!this.pendingCompactionRequest.requestedTurnId && requestedTurnId) {
      this.pendingCompactionRequest.requestedTurnId = requestedTurnId;
    }
    return this.pendingCompactionRequest.operationId;
  }

  getPendingCompactionRequest(): PendingCompactionRequest | null {
    return this.pendingCompactionRequest;
  }

  requirePendingCompactionRequest(): PendingCompactionRequest {
    if (!this.pendingCompactionRequest) {
      this.requestCompaction();
    }
    return this.pendingCompactionRequest!;
  }

  clearCompactionRequest(): void {
    this.compactionRequired = false;
    this.pendingCompactionRequest = null;
  }

  private createCompactionOperationId(): CompactionOperationId {
    this.compactionOperationCounter += 1;
    return `compaction_operation_${Date.now().toString(36)}_${this.compactionOperationCounter}`;
  }

  private nextSeq(turnId: string): number {
    const current = (this.seqByTurn.get(turnId) ?? 0) + 1;
    this.seqByTurn.set(turnId, current);
    return current;
  }

  ingestUserMessage(llmUserMessage: LLMUserMessage, turnId: string, sourceEvent: string): void {
    const trace = new RawTraceItem({
      id: `rt_${Date.now()}`,
      ts: Date.now() / 1000,
      turnId,
      seq: this.nextSeq(turnId),
      traceType: 'user',
      content: llmUserMessage.content,
      sourceEvent,
      media: {
        images: llmUserMessage.image_urls ?? [],
        audio: llmUserMessage.audio_urls ?? [],
        video: llmUserMessage.video_urls ?? []
      }
    });
    this.store.add([trace]);
  }

  ingestToolContinuationBoundary(turnId: string, sourceEvent: string, content = 'Tool continuation'): void {
    const trace = new RawTraceItem({
      id: `rt_${Date.now()}_tool_continuation`,
      ts: Date.now() / 1000,
      turnId,
      seq: this.nextSeq(turnId),
      traceType: 'tool_continuation',
      content,
      sourceEvent
    });
    this.store.add([trace]);
  }

  ensureWorkingContextSystemMessage(content: string, options: WorkingContextAppendOptions = {}): boolean {
    if (!content.trim() || this.getWorkingContextMessages().length) {
      return false;
    }
    this.appendWorkingContextMessage(
      new Message(MessageRole.SYSTEM, { content }),
      { sourceKind: 'system_prompt', ...options }
    );
    return true;
  }

  appendWorkingContextUserMessage(
    input: Message | LLMUserMessage | string,
    options: WorkingContextAppendOptions = {}
  ): void {
    const message = input instanceof Message
      ? input
      : input instanceof LLMUserMessage
        ? new Message(MessageRole.USER, {
            content: input.content,
            image_urls: input.image_urls,
            audio_urls: input.audio_urls,
            video_urls: input.video_urls,
          })
        : new Message(MessageRole.USER, { content: String(input) });
    const rawTraceIds = options.rawTraceIds ?? this.findRecentRawTraceIds(options.turnId, 'user', message.content);
    this.appendWorkingContextMessage(message, { sourceKind: 'user_input', ...options, rawTraceIds });
  }

  appendWorkingContextAssistantMessage(
    response: CompleteResponse,
    turnId: string,
    options: WorkingContextAppendOptions = {}
  ): void {
    if (!response.content && !response.reasoning) {
      return;
    }
    this.appendWorkingContextMessage(
      new Message(MessageRole.ASSISTANT, {
        content: response.content ?? null,
        reasoning_content: response.reasoning ?? null,
      }),
      { sourceKind: 'assistant_response', turnId, ...options }
    );
  }

  ingestToolIntent(
    toolInvocation: ToolInvocation,
    turnId?: string,
    options?: ToolIntentIngestionOptions
  ): void {
    this.ingestToolIntents([toolInvocation], turnId, options);
  }

  ingestToolIntents(
    toolInvocations: ToolInvocation[],
    turnId?: string,
    options?: ToolIntentIngestionOptions
  ): void {
    if (!toolInvocations.length) {
      return;
    }

    const { traces, toolCalls, effectiveTurnId } = buildToolIntentTraces(
      toolInvocations,
      turnId,
      (id) => this.nextSeq(id),
    );

    this.store.add(traces);
    if (options?.appendToWorkingContext !== false) {
      this.appendWorkingContextMessage(
        new Message(MessageRole.ASSISTANT, {
          content: options?.assistantContent ?? null,
          reasoning_content: options?.assistantReasoning ?? null,
          tool_payload: new ToolCallPayload(toolCalls),
        }),
        {
          sourceKind: 'assistant_tool_response',
          turnId: effectiveTurnId,
          rawTraceIds: traces.map((trace) => trace.id),
          toolCallIds: toolCalls.map((call) => call.id),
        }
      );
    }
  }

  ingestAssistantToolResponse(
    response: CompleteResponse,
    toolInvocations: ToolInvocation[],
    turnId: string,
    sourceEvent = 'LlmPhase'
  ): void {
    if (!toolInvocations.length) {
      this.ingestAssistantResponse(response, turnId, sourceEvent);
      return;
    }
    this.ingestAssistantResponse(response, turnId, sourceEvent, { appendToWorkingContext: false });
    const assistantTraceIds = this.findRecentRawTraceIds(turnId, 'assistant', response.content ?? '') ?? [];
    this.ingestToolIntents(toolInvocations, turnId, {
      assistantContent: response.content ?? null,
      assistantReasoning: response.reasoning ?? null,
    });
    const messages = this.workingContextSnapshot.buildMessages();
    const latest = messages[messages.length - 1];
    if (latest?.tool_payload instanceof ToolCallPayload && assistantTraceIds.length) {
      setMessageProvenance(latest, {
        ...(getMessageProvenance(latest) ?? {}),
        rawTraceIds: [
          ...assistantTraceIds,
          ...this.findRecentToolCallRawTraceIds(turnId, toolInvocations.map((invocation) => invocation.id)),
        ],
      });
      this.persistWorkingContextSnapshot();
    }
  }

  ingestToolResult(event: ToolResultEvent, turnId?: string): void {
    this.ingestToolResults([event], turnId);
  }

  ingestToolResults(
    events: ToolResultEvent[],
    turnId?: string,
    options?: ToolResultIngestionOptions
  ): void {
    if (!events.length) {
      return;
    }

    const sourceEvent = options?.source ?? 'ToolResultEvent';
    const existingToolResultIds = new Set(
      this.listRawTracesOrdered()
        .filter((item) => item.traceType === 'tool_result' && item.toolCallId)
        .map((item) => `${item.turnId}:${item.toolCallId}`)
    );
    const { traces, ingestedEvents } = buildToolResultTraces(
      events,
      turnId,
      sourceEvent,
      existingToolResultIds,
      (id) => this.nextSeq(id),
    );

    if (traces.length) {
      this.store.add(traces);
    }
    if (options?.appendToWorkingContext === false || !ingestedEvents.length) {
      return;
    }
    for (const { event, trace } of ingestedEvents) {
      this.appendWorkingContextMessage(
        new Message(MessageRole.TOOL, {
          content: null,
          tool_payload: new ToolResultPayload(
            event.toolInvocationId ?? '',
            event.toolName,
            event.result,
            event.error ?? null
          ),
        }),
        {
          sourceKind: 'tool_result',
          turnId: event.turnId ?? turnId ?? null,
          rawTraceIds: [trace.id],
          toolCallIds: event.toolInvocationId ? [event.toolInvocationId] : undefined,
        }
      );
    }
  }

  ingestAssistantResponse(
    response: CompleteResponse,
    turnId: string,
    sourceEvent: string,
    options?: { appendToWorkingContext?: boolean }
  ): void {
    const appendToWorkingContext = options?.appendToWorkingContext ?? true;
    const trace = new RawTraceItem({
      id: `rt_${Date.now()}`,
      ts: Date.now() / 1000,
      turnId,
      seq: this.nextSeq(turnId),
      traceType: 'assistant',
      content: response.content ?? '',
      sourceEvent
    });
    this.store.add([trace]);
    if (appendToWorkingContext && (response.content || response.reasoning)) {
      this.appendWorkingContextAssistantMessage(response, turnId, {
        sourceKind: 'assistant_response',
        rawTraceIds: [trace.id],
        persist: false,
      });
    }
    this.persistWorkingContextSnapshot();
  }

  appendRawTrace(input: AppendRawTraceInput): RawTraceItem {
    const trace = input instanceof RawTraceItem
      ? input
      : new RawTraceItem({
          ...input,
          id: input.id ?? `rt_${Date.now()}_${input.turnId}_${input.traceType}`,
          ts: input.ts ?? Date.now() / 1000,
          seq: input.seq ?? this.nextSeq(input.turnId)
        });
    const currentSeq = this.seqByTurn.get(trace.turnId) ?? 0;
    if (trace.seq > currentSeq) {
      this.seqByTurn.set(trace.turnId, trace.seq);
    }
    this.store.add([trace]);
    return trace;
  }

  buildOperationBoundaryNote(input: OperationBoundaryNoteInput): string {
    const scopeId = this.requireAgentTurnScopeId(input.scope, 'MemoryManager.buildOperationBoundaryNote');
    const reasonText = input.reason ? ` Reason: ${input.reason}.` : '';
    return (
      `System note: turn '${scopeId}' was interrupted before normal completion.${reasonText} ` +
      'Preserve accepted user input and completed facts as history, but do not continue any incomplete tool-call protocol from that turn.'
    );
  }

  async projectWorkingContextForNextLlm(input: ProjectWorkingContextForNextLlmInput = {}): Promise<void> {
    const mode = input.mode ?? 'llm_safe';
    if (mode !== 'llm_safe') {
      throw new Error(`MemoryManager.projectWorkingContextForNextLlm does not support mode '${mode}'.`);
    }

    const fenceTurnId = input.fenceIncompleteToolProtocolScope
      ? this.requireAgentTurnScopeId(
          input.fenceIncompleteToolProtocolScope,
          'MemoryManager.projectWorkingContextForNextLlm'
        )
      : null;
    const boundaryContent = fenceTurnId ? this.getOperationBoundaryNoteContent(fenceTurnId) : null;
    const completedToolResults =
      fenceTurnId && input.includeCommittedFacts !== false
        ? this.getCompletedToolResultsForTurn(fenceTurnId)
        : [];

    const currentMessages = this.workingContextSnapshot.buildMessages();
    const projectedMessages = projectLlmSafeWorkingContext(
      currentMessages,
      boundaryContent,
      completedToolResults
    );
    this.resetWorkingContextSnapshot(projectedMessages, this.workingContextSnapshot.lastCompactionTs);
  }

  listRawTracesOrdered(limit?: number): RawTraceItem[] {
    return this.store.listRawTracesOrdered(limit);
  }

  pruneRawTracesById(traceIds: Iterable<string>, archive = true): void {
    this.store.pruneRawTracesById(traceIds, archive);
  }

  getWorkingContextMessages() {
    return this.workingContextSnapshot.buildMessages();
  }

  resetWorkingContextSnapshot(snapshotMessages: Iterable<any>, lastCompactionTs?: number | null): void {
    if (arguments.length >= 2) {
      this.workingContextSnapshot.reset(snapshotMessages, lastCompactionTs);
    } else {
      this.workingContextSnapshot.reset(snapshotMessages);
    }
    this.persistWorkingContextSnapshot();
  }

  persistWorkingContextSnapshot(): void {
    if (!this.workingContextSnapshotStore) {
      return;
    }
    const agentId = this.workingContextSnapshotStore.agentId ?? (this.store as any).agentId;
    if (!agentId) {
      return;
    }
    const payload = WorkingContextSnapshotSerializer.serialize(this.workingContextSnapshot, {
      schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
      agent_id: agentId,
      epoch_id: this.workingContextSnapshot.epochId,
      last_compaction_ts: this.workingContextSnapshot.lastCompactionTs
    });
    this.workingContextSnapshotStore.write(agentId, payload);
  }

  private appendWorkingContextMessage(message: Message, options: WorkingContextAppendOptions = {}): void {
    setMessageProvenance(message, options);
    this.workingContextSnapshot.appendMessage(message);
    if (options.persist !== false) {
      this.persistWorkingContextSnapshot();
    }
  }

  private findRecentRawTraceIds(
    turnId: string | null | undefined,
    traceType: string,
    content?: string | null
  ): string[] | undefined {
    if (!turnId) {
      return undefined;
    }
    const match = [...this.listRawTracesOrdered()]
      .reverse()
      .find((trace) =>
        trace.turnId === turnId &&
        trace.traceType === traceType &&
        (!content || trace.content === content)
      );
    return match ? [match.id] : undefined;
  }

  private findRecentToolCallRawTraceIds(turnId: string, toolCallIds: string[]): string[] {
    const pending = new Set(toolCallIds);
    const traceIds: string[] = [];
    for (const trace of [...this.listRawTracesOrdered()].reverse()) {
      if (trace.turnId !== turnId || trace.traceType !== 'tool_call' || !trace.toolCallId) {
        continue;
      }
      if (pending.delete(trace.toolCallId)) {
        traceIds.unshift(trace.id);
      }
      if (!pending.size) {
        break;
      }
    }
    return traceIds;
  }

  getToolInteractions(turnId?: string | null) {
    let rawItems = this.listRawTracesOrdered();
    if (turnId) {
      rawItems = rawItems.filter((item) => item.turnId === turnId);
    }
    return buildToolInteractions(rawItems);
  }

  private requireAgentTurnScopeId(scope: MemoryProjectionScope | undefined, operation: string): string {
    if (!scope || scope.kind !== 'agent_turn' || typeof scope.id !== 'string' || !scope.id.trim()) {
      throw new Error(`${operation} requires an agent_turn scope with a non-empty id.`);
    }
    return scope.id.trim();
  }

  private getOperationBoundaryNoteContent(turnId: string): string | null {
    const marker = this.listRawTracesOrdered()
      .filter((item) => item.turnId === turnId && item.traceType === OPERATION_BOUNDARY_TRACE_TYPE)
      .at(-1);
    return marker?.content ?? null;
  }

  private getCompletedToolResultsForTurn(turnId: string): ToolResultEvent[] {
    return this.listRawTracesOrdered()
      .filter((item) => item.turnId === turnId && item.traceType === 'tool_result')
      .map((item) => new ToolResultEvent(
        item.toolName ?? 'unknown_tool',
        item.toolResult,
        item.toolCallId ?? undefined,
        item.toolError ?? undefined,
        item.toolArgs ?? undefined,
        turnId
      ));
  }

}
