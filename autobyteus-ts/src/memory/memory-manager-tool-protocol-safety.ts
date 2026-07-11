import { Message } from '../llm/utils/messages.js';
import { RawTraceItem, type RawTraceItemOptions } from './models/raw-trace-item.js';
import { ToolInteractionStatus } from './models/tool-interaction.js';
import { createToolCallIdentity, toolCallIdentityKey } from './models/tool-call-identity.js';
import { buildToolInteractions } from './tool-interaction-builder.js';
import {
  repairWorkingContextToolProtocol,
  SYNTHETIC_INTERRUPTED_TOOL_RESULT_CONTENT,
  type CompletedToolResultFact,
  type InterruptedToolResultRepair,
  type ToolCallFact,
  type WorkingContextToolProtocolRepairResult,
} from './working-context-tool-protocol-repairer.js';

export type MemoryManagerToolProtocolSafetyScope = {
  kind: 'agent_turn';
  id: string;
};

export type MemoryManagerToolProtocolSafetyInput = {
  scope?: MemoryManagerToolProtocolSafetyScope;
  includeCommittedFacts?: boolean;
  syntheticInterruptedToolResultContent?: string;
  recoverySourceEvent?: string;
};

type AppendRawTraceLikeInput = Omit<RawTraceItemOptions, 'id' | 'ts' | 'seq'> &
  Partial<Pick<RawTraceItemOptions, 'id' | 'ts' | 'seq'>>;

type WorkingContextSnapshotLike = {
  buildMessages(): Message[];
  lastCompactionTs: number | null;
};

type MemoryManagerToolProtocolSafetyBoundary = {
  workingContextSnapshot: WorkingContextSnapshotLike;
  listRawTracesOrdered(limit?: number): RawTraceItem[];
  listRawTraceCorpusOrdered(limit?: number): RawTraceItem[];
  resetWorkingContextSnapshot(snapshotMessages: Iterable<Message>, lastCompactionTs?: number | null): void;
  appendRawTrace(input: AppendRawTraceLikeInput): RawTraceItem;
};

const RECOVERY_TRACE_TYPE = 'operation_boundary';
const DEFAULT_RECOVERY_SOURCE_EVENT = 'WorkingContextToolProtocolRecovery';
const RECOVERY_CORRELATION_PREFIX = 'working_context_tool_protocol_recovery';

export function ensureMemoryManagerWorkingContextToolProtocolSafe(
  memoryManager: MemoryManagerToolProtocolSafetyBoundary,
  input: MemoryManagerToolProtocolSafetyInput = {},
): WorkingContextToolProtocolRepairResult {
  const rawTraces = memoryManager.listRawTraceCorpusOrdered();
  const interactions = buildToolInteractions(rawTraces);
  const result = repairWorkingContextToolProtocol(
    memoryManager.workingContextSnapshot.buildMessages(),
    {
      completedToolResultsByIdentity: input.includeCommittedFacts === false
        ? new Map()
        : buildCompletedToolResultFactsByIdentity(interactions),
      toolCallFactsByIdentity: buildToolCallFactsByIdentity(interactions),
      syntheticInterruptedToolResultContent:
        input.syntheticInterruptedToolResultContent ?? SYNTHETIC_INTERRUPTED_TOOL_RESULT_CONTENT,
      fallbackTurnId: input.scope?.id ?? null,
    },
  );

  if (!result.didRepair) return result;

  memoryManager.resetWorkingContextSnapshot(
    result.messages,
    memoryManager.workingContextSnapshot.lastCompactionTs,
  );
  appendSyntheticRecoveryMarkers(memoryManager, rawTraces, result.repairs, input);
  return result;
}

function buildCompletedToolResultFactsByIdentity(
  interactions: ReturnType<typeof buildToolInteractions>,
): Map<string, CompletedToolResultFact> {
  const facts = new Map<string, CompletedToolResultFact>();
  for (const interaction of interactions) {
    if (interaction.status === ToolInteractionStatus.PENDING || !interaction.turnId) continue;
    facts.set(toolCallIdentityKey({ turnId: interaction.turnId, toolCallId: interaction.toolCallId }), {
      toolCallId: interaction.toolCallId,
      toolName: interaction.toolName ?? 'unknown_tool',
      toolResult: interaction.result,
      toolError: interaction.error,
      turnId: interaction.turnId,
      rawTraceId: interaction.terminalRawTraceId ?? undefined,
    });
  }
  return facts;
}

function buildToolCallFactsByIdentity(
  interactions: ReturnType<typeof buildToolInteractions>,
): Map<string, ToolCallFact> {
  const facts = new Map<string, ToolCallFact>();
  for (const interaction of interactions) {
    if (!interaction.turnId) continue;
    facts.set(toolCallIdentityKey({ turnId: interaction.turnId, toolCallId: interaction.toolCallId }), {
      toolCallId: interaction.toolCallId,
      toolName: interaction.toolName ?? 'unknown_tool',
      turnId: interaction.turnId,
      rawTraceId: interaction.anchorRawTraceId ?? undefined,
    });
  }
  return facts;
}

function appendSyntheticRecoveryMarkers(
  memoryManager: MemoryManagerToolProtocolSafetyBoundary,
  rawTraces: RawTraceItem[],
  repairs: InterruptedToolResultRepair[],
  input: MemoryManagerToolProtocolSafetyInput,
): void {
  const existingCorrelations = new Set(
    rawTraces
      .map((trace) => trace.correlationId)
      .filter((id): id is string => Boolean(id)),
  );
  const sourceEvent = input.recoverySourceEvent ?? DEFAULT_RECOVERY_SOURCE_EVENT;
  for (const repair of repairs) {
    if (repair.source !== 'synthetic_interrupted') continue;
    const identity = createToolCallIdentity(repair.turnId ?? input.scope?.id, repair.toolCallId);
    if (!identity) continue;
    const correlationId = `${RECOVERY_CORRELATION_PREFIX}:${toolCallIdentityKey(identity)}`;
    if (existingCorrelations.has(correlationId)) continue;
    existingCorrelations.add(correlationId);
    memoryManager.appendRawTrace({
      turnId: repair.turnId ?? input.scope?.id ?? 'unknown_turn',
      traceType: RECOVERY_TRACE_TYPE,
      content: buildSyntheticRecoveryMarkerContent(repair),
      sourceEvent,
      correlationId,
      toolName: repair.toolName,
      toolCallId: repair.toolCallId,
    });
  }
}

function buildSyntheticRecoveryMarkerContent(repair: InterruptedToolResultRepair): string {
  return [
    `System note: recovered incomplete native tool-call protocol for tool call '${repair.toolCallId}' (${repair.toolName}).`,
    'A synthetic interrupted/unknown tool result was inserted because no recorded tool result was available in memory.',
    'Completion status is unknown and no tool output should be assumed from that abandoned call.',
  ].join(' ');
}
