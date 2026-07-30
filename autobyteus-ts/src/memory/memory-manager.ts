import { LLMUserMessage } from '../llm/user-message.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../llm/utils/messages.js';
import { CompleteResponse } from '../llm/utils/response-types.js';
import { ToolResultEvent } from '../agent/events/agent-events.js';
import { ToolInvocation } from '../agent/tool-invocation.js';

import { RawTraceItem, type RawTraceItemOptions } from './models/raw-trace-item.js';
import { toolCallIdentityKey } from './models/tool-call-identity.js';
import { MemoryType } from './models/memory-types.js';
import { CompactionPolicy } from './policies/compaction-policy.js';
import { MemoryStore } from './store/base-store.js';
import type { CompactionLineageStore } from './lineage/compaction-lineage-store.js';
import type { CompactionLineageScope } from './lineage/compaction-lineage-scope.js';
import { TurnTracker } from './turn-tracker.js';
import { WorkingContext } from './working-context.js';
import { WorkingContextSnapshotStore } from './store/working-context-snapshot-store.js';
import { buildToolInteractions } from './tool-interaction-builder.js';
import { AGENT_INTERRUPTED_TOOL_RESULT_CONTENT, type WorkingContextToolProtocolRepairResult } from './working-context-tool-protocol-repairer.js';
import { ensureMemoryManagerWorkingContextToolProtocolSafe, type MemoryManagerToolProtocolSafetyInput } from './memory-manager-tool-protocol-safety.js';
import {
  buildSingleMessageProvenance,
  getWorkingContextMessageProvenance,
  setWorkingContextMessageProvenance,
} from './working-context-provenance.js';
import type {
  AcceptedWorkingContextCompaction,
  WorkingContextCompactionProposal,
} from './compaction/working-context-compaction-proposal.js';
import type { CompactedMemoryProjectionBundle } from './projection/compacted-memory-projection-bundle.js';
import {
  MemoryManagerCompactionCoordinator,
  type CompactionOperationId,
  type MemoryManagerCompactionBaseline,
  type PendingCompactionRequest,
} from './memory-manager-compaction-coordinator.js';
export type {
  CompactionOperationId,
  MemoryManagerCompactionBaseline,
  PendingCompactionRequest,
} from './memory-manager-compaction-coordinator.js';
import {
  buildNativeToolCallTrace,
  buildNativeToolResultTrace,
  normalizeNativeToolCallBatch,
  normalizeNativeToolResultBatch,
  type NativeToolCallRegistration,
} from './raw-trace-ingestion.js';
import { ToolTraceLifecycleState } from './tool-trace-lifecycle-state.js';

export type ToolIntentIngestionOptions = { appendToWorkingContext?: boolean; assistantContent?: string | null; assistantReasoning?: string | null };
export type ToolResultIngestionOptions = { source?: string; appendToWorkingContext?: boolean };
import {
  MemoryManagerWorkingContextController,
  type WorkingContextAppendOptions,
} from './memory-manager-working-context-controller.js';
export type { WorkingContextAppendOptions } from './memory-manager-working-context-controller.js';
export type MemoryProjectionScope = { kind: 'agent_turn'; id: string };

export type AppendRawTraceInput = RawTraceItem | (Omit<RawTraceItemOptions, 'id' | 'ts' | 'seq'> & Partial<Pick<RawTraceItemOptions, 'id' | 'ts' | 'seq'>>);

export type ProjectWorkingContextForNextLlmInput = { mode?: 'llm_safe'; fenceIncompleteToolProtocolScope?: MemoryProjectionScope; includeCommittedFacts?: boolean };

export type EnsureWorkingContextToolProtocolSafeForNextLlmInput = MemoryManagerToolProtocolSafetyInput;

export type OperationBoundaryNoteInput = { scope: MemoryProjectionScope; reason?: string | null };

const OPERATION_BOUNDARY_TRACE_TYPE = 'operation_boundary';

export class MemoryManager {
  store: MemoryStore;
  turnTracker: TurnTracker;
  compactionPolicy: CompactionPolicy;
  memoryTypes = MemoryType;
  private readonly workingContextController: MemoryManagerWorkingContextController;
  workingContextSnapshotStore: WorkingContextSnapshotStore | null;
  private readonly compactionCoordinator: MemoryManagerCompactionCoordinator;
  private seqByTurn = new Map<string, number>();
  private readonly toolLifecycleState: ToolTraceLifecycleState;

  constructor(options: { store: MemoryStore; turnTracker?: TurnTracker; compactionPolicy?: CompactionPolicy;
    workingContext?: WorkingContext;
    workingContextSnapshotStore?: WorkingContextSnapshotStore | null;
    lineageStore?: CompactionLineageStore | null;
    lineageScope?: CompactionLineageScope | null;
    agentId?: string | null }) {
    this.store = options.store;
    this.turnTracker = options.turnTracker ?? new TurnTracker();
    this.compactionPolicy = options.compactionPolicy ?? new CompactionPolicy();
    this.workingContextSnapshotStore = options.workingContextSnapshotStore ?? null;
    this.workingContextController = new MemoryManagerWorkingContextController({
      workingContext: options.workingContext,
      snapshotStore: this.workingContextSnapshotStore,
      fallbackAgentId: options.agentId ?? (this.store as MemoryStore & { agentId?: string }).agentId ?? null,
    });
    this.compactionCoordinator = new MemoryManagerCompactionCoordinator({
      store: this.store,
      lineageStore: options.lineageStore ?? null,
      lineageScope: options.lineageScope ?? null,
      snapshotStore: this.workingContextSnapshotStore,
      agentId: options.agentId ?? this.workingContextSnapshotStore?.agentId ?? null,
      getContext: () => this.workingContextController.getContext(),
      installContext: (context) => this.workingContextController.install(context),
    });
    this.toolLifecycleState = new ToolTraceLifecycleState(this.store.listRawTraceCorpusOrdered());
  }

  startTurn(): string {
    return this.turnTracker.nextTurnId();
  }

  requestCompaction(requestedTurnId?: string | null): CompactionOperationId {
    return this.compactionCoordinator.request(requestedTurnId);
  }

  getPendingCompactionRequest(): PendingCompactionRequest | null {
    return this.compactionCoordinator.getPending();
  }

  requirePendingCompactionRequest(): PendingCompactionRequest {
    return this.compactionCoordinator.requirePending();
  }

  clearCompactionRequest(): void {
    this.compactionCoordinator.clear();
  }

  get compactionRequired(): boolean {
    return this.compactionCoordinator.compactionRequired;
  }

  set compactionRequired(value: boolean) {
    this.compactionCoordinator.compactionRequired = value;
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
      options
    );
    return true;
  }

  appendWorkingContextUserMessage(input: Message | LLMUserMessage | string, options: WorkingContextAppendOptions = {}): void {
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
    this.appendWorkingContextMessage(message, { ...options, rawTraceIds });
  }

  appendWorkingContextAssistantMessage(response: CompleteResponse, turnId: string, options: WorkingContextAppendOptions = {}): void {
    if (!response.content && !response.reasoning) {
      return;
    }
    this.appendWorkingContextMessage(
      new Message(MessageRole.ASSISTANT, {
        content: response.content ?? null,
        reasoning_content: response.reasoning ?? null,
      }),
      { turnId, ...options }
    );
  }

  ingestToolIntent(toolInvocation: ToolInvocation, turnId?: string, options?: ToolIntentIngestionOptions): void {
    this.ingestToolIntents([toolInvocation], turnId, options);
  }

  ingestToolIntents(toolInvocations: ToolInvocation[], turnId?: string, options?: ToolIntentIngestionOptions): void {
    if (!toolInvocations.length) return;
    this.persistNormalizedToolIntents(normalizeNativeToolCallBatch(toolInvocations, turnId), options);
  }

  private persistNormalizedToolIntents(
    registrations: NativeToolCallRegistration[], options?: ToolIntentIngestionOptions,
  ): void {
    const seen = new Set<string>();
    const accepted = registrations.filter((registration) => {
      const key = toolCallIdentityKey(registration.identity);
      if (seen.has(key)) return false;
      seen.add(key);
      const existing = this.toolLifecycleState.get(key);
      return !existing?.call && !existing?.result;
    });
    if (!accepted.length) return;

    const traces = accepted.map((registration) =>
      buildNativeToolCallTrace(registration, (id) => this.nextSeq(id))
    );
    this.store.add(traces);
    traces.forEach((trace) => this.recordPhysicalToolTrace(trace));
    if (options?.appendToWorkingContext !== false) {
      this.appendWorkingContextMessage(
        new Message(MessageRole.ASSISTANT, {
          content: options?.assistantContent ?? null,
          reasoning_content: options?.assistantReasoning ?? null,
          tool_payload: new ToolCallPayload(accepted.map(({ toolCall }) => toolCall)),
        }),
        {
          turnId: accepted[0]!.identity.turnId,
          rawTraceIds: traces.map((trace) => trace.id),
        }
      );
    }
  }

  ingestAssistantToolResponse(response: CompleteResponse, toolInvocations: ToolInvocation[], turnId: string, sourceEvent = 'LlmPhase'): void {
    if (!toolInvocations.length) {
      this.ingestAssistantResponse(response, turnId, sourceEvent);
      return;
    }
    const registrations = normalizeNativeToolCallBatch(toolInvocations, turnId);
    this.ingestAssistantResponse(response, turnId, sourceEvent, { appendToWorkingContext: false });
    const assistantTraceIds = this.findRecentRawTraceIds(turnId, 'assistant', response.content ?? '') ?? [];
    const workingContextMessageCount = this.getWorkingContextMessages().length;
    this.persistNormalizedToolIntents(registrations, {
      assistantContent: response.content ?? null,
      assistantReasoning: response.reasoning ?? null,
    });
    const messages = this.workingContextController.getMessages();
    const latestIndex = messages.length - 1;
    const latest = messages[latestIndex];
    if (messages.length > workingContextMessageCount && latest?.tool_payload instanceof ToolCallPayload && assistantTraceIds.length) {
      const provenance = getWorkingContextMessageProvenance(latest);
      const rawTraceIds = provenance?.kind === 'single' ? provenance.rawTraceIds : [];
      setWorkingContextMessageProvenance(
        latest,
        buildSingleMessageProvenance(
          [...assistantTraceIds, ...rawTraceIds],
          provenance?.kind === 'single' ? provenance.turnId : turnId,
        ),
      );
      this.workingContextController.replaceMessage(latestIndex, latest);
      this.persistWorkingContextSnapshot();
    }
  }

  ingestToolResult(event: ToolResultEvent, turnId?: string): void {
    this.ingestToolResults([event], turnId);
  }

  ingestToolResults(events: ToolResultEvent[], turnId?: string, options?: ToolResultIngestionOptions): void {
    if (!events.length) {
      return;
    }

    const registrations = normalizeNativeToolResultBatch(events, turnId);
    const sourceEvent = options?.source ?? 'ToolResultEvent';
    const accepted: Array<{
      registration: (typeof registrations)[number];
      canonicalToolName: string;
    }> = [];
    const batchIdentityKeys = new Set<string>();
    for (const registration of registrations) {
      const { identity } = registration;
      const identityKey = toolCallIdentityKey(identity);
      const group = this.toolLifecycleState.get(identityKey);
      if (group?.result || batchIdentityKeys.has(identityKey)) continue;
      if (!group?.call) {
        throw new Error(
          `Native tool result '${identity.toolCallId}' in turn '${identity.turnId}' has no persisted tool call; the batch was rejected.`,
        );
      }
      const canonicalToolName = group.call.toolName?.trim();
      if (!canonicalToolName) {
        throw new Error(
          `Native tool call '${identity.toolCallId}' in turn '${identity.turnId}' has no usable tool name; the batch was rejected.`,
        );
      }
      const observedToolName = registration.event.toolName?.trim();
      if (observedToolName && observedToolName !== canonicalToolName) {
        throw new Error(
          `Native tool result '${identity.toolCallId}' in turn '${identity.turnId}' names '${observedToolName}' but the persisted tool call names '${canonicalToolName}'; the batch was rejected.`,
        );
      }
      accepted.push({ registration, canonicalToolName });
      batchIdentityKeys.add(identityKey);
    }
    const prepared = accepted.map(({ registration, canonicalToolName }) => ({
      trace: buildNativeToolResultTrace(registration, canonicalToolName, sourceEvent, (id) => this.nextSeq(id)),
      canonicalToolName,
    }));
    if (prepared.length) this.store.add(prepared.map(({ trace }) => trace));
    prepared.forEach(({ trace }) => this.recordPhysicalToolTrace(trace));
    if (options?.appendToWorkingContext === false) return;
    for (const { trace, canonicalToolName } of prepared) {
      this.appendWorkingContextMessage(
        new Message(MessageRole.TOOL, {
          content: null,
          tool_payload: new ToolResultPayload(
            trace.toolCallId!,
            canonicalToolName,
            trace.toolResult,
            trace.toolError ?? null
          ),
        }),
        {
          turnId: trace.turnId,
          rawTraceIds: [trace.id],
        }
      );
    }
  }

  finalizePendingToolCallsForTurn(turnId: string, reason: string, options: ToolResultIngestionOptions = {}): void {
    const normalizedReason = reason.trim() || 'Tool execution interrupted.';
    const events = [...this.toolLifecycleState.values()]
      .filter((group) => group.identity.turnId === turnId && group.call && !group.result)
      .flatMap((group) => group.call?.toolName?.trim() ? [new ToolResultEvent(
        group.call.toolName,
        null,
        group.identity.toolCallId,
        normalizedReason,
        group.call.toolArgs ?? undefined,
        group.identity.turnId,
      )] : []);
    if (events.length) this.ingestToolResults(events, turnId, {
      source: options.source ?? 'AgentTurnInterruptedEvent',
      appendToWorkingContext: options.appendToWorkingContext,
    });
  }

  ingestAssistantResponse(response: CompleteResponse, turnId: string, sourceEvent: string, options?: { appendToWorkingContext?: boolean }): void {
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
    this.recordPhysicalToolTrace(trace);
    return trace;
  }

  buildOperationBoundaryNote(input: OperationBoundaryNoteInput): string {
    const scopeId = this.requireAgentTurnScopeId(input.scope, 'MemoryManager.buildOperationBoundaryNote');
    const reasonText = input.reason ? ` Reason: ${input.reason}.` : '';
    return (
      `System note: turn '${scopeId}' was interrupted before normal completion.${reasonText} ` +
      'Preserve accepted user input and completed facts as history, but treat the interrupted request as cancelled. ' +
      'Do not retry, resume, or execute any incomplete tool-call protocol or requested actions from that turn unless a later user message explicitly asks to perform them again. ' +
      'Treat the next user message as the active instruction.'
    );
  }

  ensureWorkingContextToolProtocolSafeForNextLlm(
    input: EnsureWorkingContextToolProtocolSafeForNextLlmInput = {}
  ): WorkingContextToolProtocolRepairResult {
    return ensureMemoryManagerWorkingContextToolProtocolSafe(this, input);
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
    this.ensureWorkingContextToolProtocolSafeForNextLlm({
      scope: input.fenceIncompleteToolProtocolScope,
      includeCommittedFacts: input.includeCommittedFacts,
      syntheticInterruptedToolResultContent: fenceTurnId ? AGENT_INTERRUPTED_TOOL_RESULT_CONTENT : undefined,
      recoverySourceEvent: fenceTurnId
        ? 'AgentTurnInterruptedToolProtocolRecovery'
        : 'WorkingContextToolProtocolRecovery',
    });

    if (boundaryContent && !this.getWorkingContextMessages().some((message) => message.content === boundaryContent)) {
      this.appendWorkingContextMessage(
        new Message(MessageRole.SYSTEM, { content: boundaryContent }),
        { turnId: fenceTurnId }
      );
    }
  }

  listRawTracesOrdered(limit?: number): RawTraceItem[] {
    return this.store.listRawTracesOrdered(limit);
  }

  listRawTraceCorpusOrdered(limit?: number): RawTraceItem[] {
    return this.store.listRawTraceCorpusOrdered(limit);
  }

  pruneRawTracesById(traceIds: Iterable<string>, archive = true): void {
    this.store.pruneRawTracesById(traceIds, archive);
  }

  getWorkingContextMessages(): Message[] {
    return this.workingContextController.getMessages();
  }

  getWorkingContext(): WorkingContext {
    return this.workingContextController.getContext();
  }

  replaceWorkingContext(workingContext: WorkingContext): void {
    this.workingContextController.replace(workingContext);
  }

  installWorkingContextWithoutSnapshot(workingContext: WorkingContext): void { this.workingContextController.install(workingContext); }

  requireCurrentCompactionOutput(): CompactedMemoryProjectionBundle { return this.compactionCoordinator.requireCurrentOutput(); }

  loadCurrentCompactionOutput(): CompactedMemoryProjectionBundle | null { return this.compactionCoordinator.loadCurrentOutput(); }

  captureCompactionBaseline(): MemoryManagerCompactionBaseline { return this.compactionCoordinator.captureBaseline(); }

  prepareCompaction(
    baseline: MemoryManagerCompactionBaseline,
    proposal: WorkingContextCompactionProposal,
  ): AcceptedWorkingContextCompaction {
    return this.compactionCoordinator.prepare(baseline, proposal);
  }

  commitAcceptedCompaction(accepted: AcceptedWorkingContextCompaction): void { this.compactionCoordinator.commit(accepted); }

  persistWorkingContextSnapshot(): void { this.workingContextController.persist(); }

  private appendWorkingContextMessage(message: Message, options: WorkingContextAppendOptions = {}): void {
    this.workingContextController.append(message, options);
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

  getToolInteractions(turnId?: string | null) {
    let rawItems = this.listRawTraceCorpusOrdered();
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
      .filter((item) =>
        item.turnId === turnId &&
        item.traceType === OPERATION_BOUNDARY_TRACE_TYPE &&
        item.sourceEvent === 'AgentTurnInterruptedEvent'
      )
      .at(-1);
    return marker?.content ?? null;
  }

  private recordPhysicalToolTrace(trace: RawTraceItem): void {
    this.toolLifecycleState.record(trace);
  }

}
