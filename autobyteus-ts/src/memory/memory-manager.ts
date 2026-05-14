import { LLMUserMessage } from '../llm/user-message.js';
import { ToolCallSpec } from '../llm/utils/messages.js';
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

export type ToolIntentIngestionOptions = {
  appendToWorkingContext?: boolean;
  assistantContent?: string | null;
  assistantReasoning?: string | null;
};

export type ToolResultIngestionOptions = {
  source?: string;
  appendToWorkingContext?: boolean;
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

  requestCompaction(): void {
    this.compactionRequired = true;
  }

  clearCompactionRequest(): void {
    this.compactionRequired = false;
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

    const traces: RawTraceItem[] = [];
    const toolCalls: ToolCallSpec[] = [];
    let effectiveTurnId: string | null = null;

    for (const invocation of toolInvocations) {
      const invocationTurnId = invocation.turnId ?? turnId;
      if (!invocationTurnId) {
        throw new Error('turnId is required to ingest tool intent');
      }
      if (!effectiveTurnId) {
        effectiveTurnId = invocationTurnId;
      } else if (effectiveTurnId !== invocationTurnId) {
        throw new Error('All tool intents in a batch must belong to the same turnId');
      }

      traces.push(
        new RawTraceItem({
          id: `rt_${Date.now()}_${invocation.id}`,
          ts: Date.now() / 1000,
          turnId: invocationTurnId,
          seq: this.nextSeq(invocationTurnId),
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'PendingToolInvocationEvent',
          toolName: invocation.name,
          toolCallId: invocation.id,
          toolArgs: invocation.arguments
        })
      );
      toolCalls.push({
        id: invocation.id,
        name: invocation.name,
        arguments: invocation.arguments,
        nativeToolCallContext: invocation.nativeToolCallContext
      } as ToolCallSpec);
    }

    this.store.add(traces);
    if (options?.appendToWorkingContext !== false) {
      this.workingContextSnapshot.appendToolCalls(toolCalls, {
        content: options?.assistantContent ?? null,
        reasoningContent: options?.assistantReasoning ?? null
      });
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

    const traces: RawTraceItem[] = [];
    const ingestedEvents: ToolResultEvent[] = [];
    let effectiveTurnId: string | null = null;
    const sourceEvent = options?.source ?? 'ToolResultEvent';
    const existingToolResultIds = new Set(
      this.listRawTracesOrdered()
        .filter((item) => item.traceType === 'tool_result' && item.toolCallId)
        .map((item) => `${item.turnId}:${item.toolCallId}`)
    );

    for (const event of events) {
      const eventTurnId = event.turnId ?? turnId;
      if (!eventTurnId) {
        throw new Error('turnId is required to ingest tool result');
      }
      if (!effectiveTurnId) {
        effectiveTurnId = eventTurnId;
      } else if (effectiveTurnId !== eventTurnId) {
        throw new Error('All tool results in a batch must belong to the same turnId');
      }

      const resultIdentity = event.toolInvocationId ? `${eventTurnId}:${event.toolInvocationId}` : null;
      if (resultIdentity && existingToolResultIds.has(resultIdentity)) {
        continue;
      }
      if (resultIdentity) {
        existingToolResultIds.add(resultIdentity);
      }

      traces.push(
        new RawTraceItem({
          id: `rt_${Date.now()}_${event.toolInvocationId ?? traces.length}`,
          ts: Date.now() / 1000,
          turnId: eventTurnId,
          seq: this.nextSeq(eventTurnId),
          traceType: 'tool_result',
          content: '',
          sourceEvent,
          toolName: event.toolName,
          toolCallId: event.toolInvocationId ?? null,
          toolArgs: event.toolArgs ?? null,
          toolResult: event.result,
          toolError: event.error ?? null
        })
      );
      ingestedEvents.push(event);
    }

    if (traces.length) {
      this.store.add(traces);
    }
    if (options?.appendToWorkingContext === false || !ingestedEvents.length) {
      return;
    }
    this.workingContextSnapshot.appendToolResults(
      ingestedEvents.map((event) => ({
        toolCallId: event.toolInvocationId ?? '',
        toolName: event.toolName,
        toolResult: event.result,
        toolError: event.error ?? null
      }))
    );
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
      this.workingContextSnapshot.appendAssistant(response.content ?? null, response.reasoning ?? null);
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
