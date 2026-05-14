import { LLMUserMessage } from '../llm/user-message.js';
import { ToolCallSpec } from '../llm/utils/messages.js';
import { CompleteResponse } from '../llm/utils/response-types.js';
import { ToolResultEvent } from '../agent/events/agent-events.js';
import { ToolInvocation } from '../agent/tool-invocation.js';
import type { TurnOutcome } from '../agent/agent-turn.js';

import { RawTraceItem } from './models/raw-trace-item.js';
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
import { projectInterruptedTurnWorkingContext } from './working-context-interrupted-turn-projector.js';

export type ToolIntentIngestionOptions = {
  assistantContent?: string | null;
  assistantReasoning?: string | null;
};

export type FinalizeInterruptedTurnInput = {
  turnId: string;
  reason?: string | null;
  outcome?: TurnOutcome | null;
  completedToolResults?: ToolResultEvent[];
};

const INTERRUPTED_TURN_TRACE_TYPE = 'turn_interrupted';
const INTERRUPTED_TURN_SOURCE_EVENT = 'AgentTurnInterruptedEvent';

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
    this.workingContextSnapshot.appendToolCalls(toolCalls, {
      content: options?.assistantContent ?? null,
      reasoningContent: options?.assistantReasoning ?? null
    });
  }

  ingestToolResult(event: ToolResultEvent, turnId?: string): void {
    this.ingestToolResults([event], turnId);
  }

  ingestToolResults(
    events: ToolResultEvent[],
    turnId?: string,
    options?: { source?: string }
  ): void {
    if (!events.length) {
      return;
    }

    const traces: RawTraceItem[] = [];
    let effectiveTurnId: string | null = null;
    const sourceEvent = options?.source ?? 'ToolResultEvent';

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
    }

    this.store.add(traces);
    this.workingContextSnapshot.appendToolResults(
      events.map((event) => ({
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

  async finalizeInterruptedTurn(input: FinalizeInterruptedTurnInput): Promise<void> {
    const turnId = input.turnId?.trim();
    if (!turnId) {
      throw new Error('MemoryManager.finalizeInterruptedTurn requires a non-empty turnId.');
    }

    const completedToolResults = this.normalizeInterruptedCompletedToolResults(
      input.completedToolResults ?? [],
      turnId
    );
    this.recordInterruptedCompletedToolResults(completedToolResults, turnId);

    const reason = input.reason ?? (input.outcome?.kind === 'interrupted' ? input.outcome.reason : undefined);
    const markerContent = this.buildInterruptedTurnMarker(turnId, reason);
    const existingMarker = this.listRawTracesOrdered().some(
      (item) => item.turnId === turnId && item.traceType === INTERRUPTED_TURN_TRACE_TYPE
    );
    if (!existingMarker) {
      this.store.add([
        new RawTraceItem({
          id: `rt_${Date.now()}_${turnId}_interrupted`,
          ts: Date.now() / 1000,
          turnId,
          seq: this.nextSeq(turnId),
          traceType: INTERRUPTED_TURN_TRACE_TYPE,
          content: markerContent,
          sourceEvent: INTERRUPTED_TURN_SOURCE_EVENT
        })
      ]);
    }

    const currentMessages = this.workingContextSnapshot.buildMessages();
    const projectedMessages = projectInterruptedTurnWorkingContext(
      currentMessages,
      markerContent,
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

  private buildInterruptedTurnMarker(turnId: string, reason?: string | null): string {
    const reasonText = reason ? ` Reason: ${reason}.` : '';
    return (
      `System note: turn '${turnId}' was interrupted before normal completion.${reasonText} ` +
      'Preserve accepted user input and completed facts as history, but do not continue any incomplete tool-call protocol from that turn.'
    );
  }

  private normalizeInterruptedCompletedToolResults(
    events: ToolResultEvent[],
    turnId: string
  ): ToolResultEvent[] {
    return events
      .filter((event) => !event.isDenied)
      .filter((event) => !event.turnId || event.turnId === turnId)
      .map((event) => new ToolResultEvent(
        event.toolName,
        event.result,
        event.toolInvocationId,
        event.error,
        event.toolArgs,
        turnId,
        event.isDenied
      ));
  }

  private recordInterruptedCompletedToolResults(events: ToolResultEvent[], turnId: string): void {
    if (!events.length) {
      return;
    }

    const existingToolResultIds = new Set(
      this.listRawTracesOrdered()
        .filter((item) => item.turnId === turnId && item.traceType === 'tool_result' && item.toolCallId)
        .map((item) => item.toolCallId as string)
    );
    const traces: RawTraceItem[] = [];

    for (const event of events) {
      if (event.toolInvocationId && existingToolResultIds.has(event.toolInvocationId)) {
        continue;
      }
      if (event.toolInvocationId) {
        existingToolResultIds.add(event.toolInvocationId);
      }
      traces.push(new RawTraceItem({
        id: `rt_${Date.now()}_${event.toolInvocationId ?? traces.length}_interrupted_tool_result`,
        ts: Date.now() / 1000,
        turnId,
        seq: this.nextSeq(turnId),
        traceType: 'tool_result',
        content: '',
        sourceEvent: 'InterruptedTurnCompletedToolResult',
        toolName: event.toolName,
        toolCallId: event.toolInvocationId ?? null,
        toolArgs: event.toolArgs ?? null,
        toolResult: event.result,
        toolError: event.error ?? null
      }));
    }

    if (traces.length) {
      this.store.add(traces);
    }
  }
}
