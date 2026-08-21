import { LLMUserMessage } from '../llm/user-message.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../llm/utils/messages.js';
import { CompleteResponse } from '../llm/utils/response-types.js';
import { ToolResultEvent } from '../agent/events/agent-events.js';
import { ToolInvocation } from '../agent/tool-invocation.js';

import { RawTraceItem, type RawTraceItemOptions } from './models/raw-trace-item.js';
import { toolCallIdentityKey } from './models/tool-call-identity.js';
import { MemoryType } from './models/memory-types.js';
import { MemoryStore } from './store/base-store.js';
import type { SystemInstructionCaptureResult } from './models/system-instruction-trace.js';
import type { CompactionLineageStore } from './lineage/compaction-lineage-store.js';
import type { CompactionLineageScope } from './lineage/compaction-lineage-scope.js';
import { TurnTracker } from './turn-tracker.js';
import { WorkingContext } from './working-context.js';
import { WorkingContextSnapshotStore } from './store/working-context-snapshot-store.js';
import { buildToolInteractions } from './tool-interaction-builder.js';
import { AGENT_INTERRUPTED_TOOL_RESULT_CONTENT, type WorkingContextToolProtocolRepairResult } from './working-context-tool-protocol-repairer.js';
import { ensureMemoryManagerWorkingContextToolProtocolSafe, type MemoryManagerToolProtocolSafetyInput } from './memory-manager-tool-protocol-safety.js';
import type {
  AcceptedWorkingContextCompaction,
  WorkingContextCompactionProposal,
} from './compaction/working-context-compaction-proposal.js';
import type { CompactedMemoryProjectionBundle } from './projection/compacted-memory-projection-bundle.js';
import {
  MemoryManagerCompactionCoordinator,
  type BeginPendingCompactionAttemptResult,
  type CompactionObservationDecision,
  type CompactionOperationId,
  type CompactionRequestKind,
  type MemoryManagerCompactionBaseline,
  type PendingCompactionGate,
  type PendingCompactionRequest,
} from './memory-manager-compaction-coordinator.js';
export type {
  BeginPendingCompactionAttemptResult,
  CompactionObservationDecision,
  CompactionOperationId,
  CompactionRequestKind,
  MemoryManagerCompactionBaseline,
  PendingCompactionAttemptState,
  PendingCompactionGate,
  PendingCompactionRequest,
} from './memory-manager-compaction-coordinator.js';
import type { CompactionPlanningBudget } from './compaction/compaction-planning-budget.js';
import { DEFAULT_MEMORY_COMPACTION_CONFIGURATION, type MemoryCompactionConfiguration } from './compaction/memory-compaction-configuration.js';
import type { TurnStartOrigin } from '../agent/event-inbox/agent-event-inbox-entry.js';
import {
  buildNativeAssistantResponseTraces,
  buildNativeToolCallTrace,
  buildNativeToolResultTrace,
  normalizeNativeToolCallBatch,
  normalizeNativeToolResultBatch,
  type NativeToolCallRegistration,
} from './raw-trace-ingestion.js';
import { ToolTraceLifecycleState } from './tool-trace-lifecycle-state.js';
import { findRecentRawTraceIds } from './recent-raw-trace-selector.js';
import { requireAgentTurnScopeId, type MemoryProjectionScope } from './memory-projection-scope.js';
import { getOperationBoundaryNoteContent, OPERATION_BOUNDARY_TRACE_TYPE } from './operation-boundary-trace.js';
import {
  LlmRequestRecoveryBoundary,
  type LlmRequestRecoveryInput,
  type LlmRequestRecoveryProvenance,
  type LlmRequestRecoverySnapshot,
} from './llm-request-recovery.js';
export type {
  LlmRequestRecoveryInput,
  LlmRequestRecoveryProvenance,
  LlmRequestRecoverySnapshot,
} from './llm-request-recovery.js';

export type ToolIntentIngestionOptions = { appendToWorkingContext?: boolean; assistantContent?: string | null; assistantReasoning?: string | null };
export type ToolResultIngestionOptions = {
  source?: string;
  appendToWorkingContext?: boolean;
  correlationIdByInvocationId?: ReadonlyMap<string, string>;
};
import {
  MemoryManagerWorkingContextController,
  type WorkingContextAppendOptions,
} from './memory-manager-working-context-controller.js';
export type { WorkingContextAppendOptions } from './memory-manager-working-context-controller.js';
export type { MemoryProjectionScope } from './memory-projection-scope.js';

export type AppendRawTraceInput = RawTraceItem | (Omit<RawTraceItemOptions, 'id' | 'ts' | 'seq'> & Partial<Pick<RawTraceItemOptions, 'id' | 'ts' | 'seq'>>);

export type ProjectWorkingContextForNextLlmInput = { mode?: 'llm_safe'; fenceIncompleteToolProtocolScope?: MemoryProjectionScope; includeCommittedFacts?: boolean };

export type EnsureWorkingContextToolProtocolSafeForNextLlmInput = MemoryManagerToolProtocolSafetyInput;

export type OperationBoundaryNoteInput = { scope: MemoryProjectionScope; reason?: string | null };

export class MemoryManager {
  store: MemoryStore;
  turnTracker: TurnTracker;
  memoryTypes = MemoryType;
  private readonly workingContextController: MemoryManagerWorkingContextController;
  workingContextSnapshotStore: WorkingContextSnapshotStore | null;
  private readonly compactionCoordinator: MemoryManagerCompactionCoordinator;
  private readonly llmRequestRecovery: LlmRequestRecoveryBoundary;
  private seqByTurn = new Map<string, number>();
  private readonly toolLifecycleState: ToolTraceLifecycleState;
  private readonly automaticCompactionConfiguration: MemoryCompactionConfiguration;

  constructor(options: { store: MemoryStore; turnTracker?: TurnTracker;
    memoryCompaction?: MemoryCompactionConfiguration;
    workingContext?: WorkingContext;
    workingContextSnapshotStore?: WorkingContextSnapshotStore | null;
    lineageStore?: CompactionLineageStore | null;
    lineageScope?: CompactionLineageScope | null;
    agentId?: string | null }) {
    this.store = options.store;
    this.turnTracker = options.turnTracker ?? new TurnTracker();
    this.automaticCompactionConfiguration = options.memoryCompaction ?? DEFAULT_MEMORY_COMPACTION_CONFIGURATION;
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
    this.toolLifecycleState = new ToolTraceLifecycleState(this.store.listTurnRawTraceCorpusOrdered());
    this.llmRequestRecovery = new LlmRequestRecoveryBoundary({
      getWorkingContext: () => this.workingContextController.getContext(),
      setWorkingContext: (workingContext) => this.workingContextController.install(workingContext),
      getCompactionState: () => this.compactionCoordinator.captureState(),
      setCompactionState: (state) => this.compactionCoordinator.restoreState(state),
      persistWorkingContextSnapshot: () => this.persistWorkingContextSnapshot(),
      appendRawTrace: (input) => this.appendRawTrace(input),
    });
  }

  startTurn(): string {
    return this.turnTracker.nextTurnId();
  }

  evaluateCompactionObservation(input: {
    requestedTurnId: string;
    planningBudget: CompactionPlanningBudget;
  }): CompactionObservationDecision {
    if (this.automaticCompactionConfiguration.kind === 'disabled') {
      return { kind: 'none', operationId: null, requestKind: null, planningBudget: input.planningBudget };
    }
    const pressure = this.automaticCompactionConfiguration.policy.classifyPressure(
      input.planningBudget.observedPromptTokens,
      input.planningBudget.inputBudgetTokens,
      input.planningBudget.triggerThresholdTokens,
    );
    return this.compactionCoordinator.evaluateObservation({ ...input, pressure });
  }

  getAutomaticCompactionConfiguration(): MemoryCompactionConfiguration { return this.automaticCompactionConfiguration; }

  requestCompaction(input: {
    requestedTurnId?: string | null;
    requestKind: CompactionRequestKind;
    planningBudget: CompactionPlanningBudget;
  }): CompactionOperationId {
    return this.compactionCoordinator.request(input);
  }

  hasPendingCompaction(): boolean { return this.compactionCoordinator.hasPending(); }

  getPendingCompactionRequest(): PendingCompactionRequest | null { return this.compactionCoordinator.getPending(); }

  requirePendingCompactionRequest(): PendingCompactionRequest { return this.compactionCoordinator.requirePending(); }

  getPendingCompactionGate(): PendingCompactionGate { return this.compactionCoordinator.getPendingGate(); }

  isCompactionAwaitingUserRetry(): boolean { return this.getPendingCompactionGate().kind === 'awaiting_user_retry'; }

  beginPendingCompactionAttempt(input: {
    operationId: string;
    turnId: string;
    turnOrigin: TurnStartOrigin;
  }): BeginPendingCompactionAttemptResult { return this.compactionCoordinator.beginPendingAttempt(input); }

  retainCompactionFailure(operationId: string, executionTurnId: string, errorKind: string): void {
    this.compactionCoordinator.retainFailure(operationId, executionTurnId, errorKind);
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
    const rawTraceIds = options.rawTraceIds ?? findRecentRawTraceIds(
      this.listTurnRawTracesOrdered(),
      options.turnId,
      'user',
      message.content,
    );
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
    responseRawTraceIds: readonly string[] = [],
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
          rawTraceIds: [...responseRawTraceIds, ...traces.map((trace) => trace.id)],
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
    const responseTraces = this.ingestAssistantResponse(
      response, turnId, sourceEvent, { appendToWorkingContext: false },
    );
    this.persistNormalizedToolIntents(registrations, {
      assistantContent: response.content ?? null,
      assistantReasoning: response.reasoning ?? null,
    }, responseTraces.map((trace) => trace.id));
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
      trace: buildNativeToolResultTrace(
        registration,
        canonicalToolName,
        sourceEvent,
        (id) => this.nextSeq(id),
        options?.correlationIdByInvocationId?.get(registration.identity.toolCallId) ?? null,
      ),
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

  ingestAssistantResponse(
    response: CompleteResponse,
    turnId: string,
    sourceEvent: string,
    options?: { appendToWorkingContext?: boolean },
  ): RawTraceItem[] {
    const appendToWorkingContext = options?.appendToWorkingContext ?? true;
    const traces = buildNativeAssistantResponseTraces(
      response, turnId, sourceEvent, (id) => this.nextSeq(id),
    );
    this.store.add(traces);
    if (appendToWorkingContext && (response.content || response.reasoning)) {
      this.appendWorkingContextAssistantMessage(response, turnId, {
        rawTraceIds: traces.map((trace) => trace.id),
        persist: false,
      });
    }
    this.persistWorkingContextSnapshot();
    return traces;
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
    const scopeId = requireAgentTurnScopeId(input.scope, 'MemoryManager.buildOperationBoundaryNote');
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
      ? requireAgentTurnScopeId(
          input.fenceIncompleteToolProtocolScope,
          'MemoryManager.projectWorkingContextForNextLlm'
        )
      : null;
    const boundaryContent = fenceTurnId
      ? getOperationBoundaryNoteContent(this.listTurnRawTracesOrdered(), fenceTurnId)
      : null;
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

  listTurnRawTracesOrdered(limit?: number): RawTraceItem[] { return this.store.listTurnRawTracesOrdered(limit); }

  listTurnRawTraceCorpusOrdered(limit?: number): RawTraceItem[] { return this.store.listTurnRawTraceCorpusOrdered(limit); }

  recordSystemInstructionSupply(content: string, suppliedAt: number): SystemInstructionCaptureResult {
    return this.store.recordSystemInstructionSupply(content, suppliedAt);
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

  captureLlmRequestRecoverySnapshot(input: LlmRequestRecoveryInput): LlmRequestRecoverySnapshot { return this.llmRequestRecovery.capture(input); }

  restoreLlmRequestRecoverySnapshot(snapshot: LlmRequestRecoverySnapshot, provenance: LlmRequestRecoveryProvenance): void { this.llmRequestRecovery.restore(snapshot, provenance); }

  commitLlmRequestRecoverySnapshot(snapshot: LlmRequestRecoverySnapshot): void { this.llmRequestRecovery.commit(snapshot); }

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

  getToolInteractions(turnId?: string | null) {
    let rawItems = this.listTurnRawTraceCorpusOrdered();
    if (turnId) {
      rawItems = rawItems.filter((item) => item.turnId === turnId);
    }
    return buildToolInteractions(rawItems);
  }

  private recordPhysicalToolTrace(trace: RawTraceItem): void {
    this.toolLifecycleState.record(trace);
  }

}
