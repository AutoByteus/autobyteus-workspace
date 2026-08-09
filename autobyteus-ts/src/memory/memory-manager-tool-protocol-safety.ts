import { Message } from '../llm/utils/messages.js';
import { WorkingContext } from './working-context.js';
import { RawTraceItem, type RawTraceItemOptions } from './models/raw-trace-item.js';
import { ToolInteractionStatus } from './models/tool-interaction.js';
import { createToolCallIdentity, toolCallIdentityKey } from './models/tool-call-identity.js';
import { buildToolInteractions } from './tool-interaction-builder.js';
import {
  repairWorkingContextToolProtocol,
  SYNTHETIC_INTERRUPTED_TOOL_RESULT_CONTENT,
  type CompletedToolResultFact,
  type ToolCallFact,
  type WorkingContextToolProtocolRepairResult,
} from './working-context-tool-protocol-repairer.js';

export type MemoryManagerToolProtocolSafetyScope = { kind: 'agent_turn'; id: string };
export type MemoryManagerToolProtocolSafetyInput = {
  scope?: MemoryManagerToolProtocolSafetyScope;
  includeCommittedFacts?: boolean;
  syntheticInterruptedToolResultContent?: string;
  recoverySourceEvent?: string;
  rawTraceScope?: 'active' | 'corpus';
};

type AppendRawTraceLikeInput = Omit<RawTraceItemOptions, 'id' | 'ts' | 'seq'> &
  Partial<Pick<RawTraceItemOptions, 'id' | 'ts' | 'seq'>>;
type MemoryManagerToolProtocolSafetyBoundary = {
  getWorkingContextMessages(): Message[];
  replaceWorkingContext(workingContext: WorkingContext): void;
  listRawTracesOrdered(limit?: number): RawTraceItem[];
  listRawTraceCorpusOrdered(limit?: number): RawTraceItem[];
  appendRawTrace(input: AppendRawTraceLikeInput): RawTraceItem;
  persistWorkingContextSnapshot(): void;
};

const DEFAULT_RECOVERY_SOURCE_EVENT = 'WorkingContextToolProtocolRecovery';
const RECOVERY_CORRELATION_PREFIX = 'native-tool-recovery';

export function ensureMemoryManagerWorkingContextToolProtocolSafe(
  memoryManager: MemoryManagerToolProtocolSafetyBoundary,
  input: MemoryManagerToolProtocolSafetyInput = {},
): WorkingContextToolProtocolRepairResult {
  const rawTraces = input.rawTraceScope === 'active'
    ? memoryManager.listRawTracesOrdered()
    : memoryManager.listRawTraceCorpusOrdered();
  const interactions = buildToolInteractions(rawTraces);
  const result = repairWorkingContextToolProtocol(
    memoryManager.getWorkingContextMessages(),
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

  // Commit canonical terminal results first. The working context is a derived
  // projection and may be rebuilt from these facts after a crash.
  const syntheticRepairs = result.repairs.filter((repair) => repair.source === 'synthetic_interrupted');
  if (syntheticRepairs.length) {
    const sourceEvent = input.recoverySourceEvent ?? DEFAULT_RECOVERY_SOURCE_EVENT;
    for (const repair of syntheticRepairs) {
      const identity = createToolCallIdentity(repair.turnId ?? input.scope?.id, repair.toolCallId);
      if (!identity) continue;
      const correlationId = `${RECOVERY_CORRELATION_PREFIX}:${toolCallIdentityKey(identity)}`;
      memoryManager.appendRawTrace({
        id: `rt_recovery_${identity.turnId}_${identity.toolCallId}_${Date.now()}`,
        ts: Date.now() / 1000,
        turnId: identity.turnId,
        traceType: 'tool_result',
        content: '',
        sourceEvent,
        toolName: repair.toolName,
        toolCallId: repair.toolCallId,
        toolArgs: repair.toolArgs ?? null,
        toolResult: null,
        toolError: repair.toolError,
        correlationId,
      });
    }
  }

  const committedRawTraces = input.rawTraceScope === 'active'
    ? memoryManager.listRawTracesOrdered()
    : memoryManager.listRawTraceCorpusOrdered();
  const committedInteractions = buildToolInteractions(committedRawTraces);
  const converged = repairWorkingContextToolProtocol(
    memoryManager.getWorkingContextMessages(),
    {
      completedToolResultsByIdentity: buildCompletedToolResultFactsByIdentity(committedInteractions),
      toolCallFactsByIdentity: buildToolCallFactsByIdentity(committedInteractions),
      syntheticInterruptedToolResultContent:
        input.syntheticInterruptedToolResultContent ?? SYNTHETIC_INTERRUPTED_TOOL_RESULT_CONTENT,
      fallbackTurnId: input.scope?.id ?? null,
    },
  );
  memoryManager.replaceWorkingContext(new WorkingContext(converged.messages));
  memoryManager.persistWorkingContextSnapshot();
  return { ...converged, didRepair: true };
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
