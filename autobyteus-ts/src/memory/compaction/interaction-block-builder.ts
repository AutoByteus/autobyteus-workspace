import type { RawTraceItem } from '../models/raw-trace-item.js';
import { createToolCallIdentity, toolCallIdentityKey } from '../models/tool-call-identity.js';
import { buildToolInteractions } from '../tool-interaction-builder.js';
import type { ToolCallContext } from '../tool-trace-lifecycle-index.js';
import type { InteractionBlock, InteractionBlockKind } from './interaction-block.js';
import { isInteractionBoundaryTrace } from './interaction-block.js';

type MutableBlock = {
  blockId: string;
  turnId: string | null;
  traceIds: string[];
  traces: RawTraceItem[];
  openingTraceId: string | null;
  closingTraceId: string | null;
  blockKind: InteractionBlockKind;
  hasAssistantTrace: boolean;
  toolCallIds: Set<string>;
  matchedToolCallIds: Set<string>;
  toolCallIdentityKeys: Set<string>;
  matchedToolCallIdentityKeys: Set<string>;
  hasMalformedToolTrace: boolean;
};

const createMutableBlock = (
  blockId: string,
  openingTrace: RawTraceItem,
  blockKind: InteractionBlockKind,
  callContextByIdentity: ReadonlyMap<string, ToolCallContext>,
): MutableBlock => {
  const block: MutableBlock = {
    blockId,
    turnId: openingTrace.turnId ?? null,
    traceIds: [],
    traces: [],
    openingTraceId: openingTrace.id,
    closingTraceId: openingTrace.id,
    blockKind,
    hasAssistantTrace: false,
    toolCallIds: new Set<string>(),
    matchedToolCallIds: new Set<string>(),
    toolCallIdentityKeys: new Set<string>(),
    matchedToolCallIdentityKeys: new Set<string>(),
    hasMalformedToolTrace: false,
  };

  addTraceToBlock(block, openingTrace, callContextByIdentity);
  return block;
};

const addTraceToBlock = (
  block: MutableBlock,
  trace: RawTraceItem,
  callContextByIdentity: ReadonlyMap<string, ToolCallContext>,
): void => {
  block.traces.push(trace);
  block.traceIds.push(trace.id);
  block.turnId = block.turnId ?? trace.turnId ?? null;
  block.closingTraceId = trace.id;

  if (trace.traceType === 'assistant') {
    block.hasAssistantTrace = true;
    return;
  }

  if (trace.traceType === 'tool_call') {
    const identity = createToolCallIdentity(trace.turnId, trace.toolCallId);
    if (!identity) {
      block.hasMalformedToolTrace = true;
      return;
    }
    const key = toolCallIdentityKey(identity);
    block.toolCallIds.add(identity.toolCallId);
    block.toolCallIdentityKeys.add(key);
    return;
  }

  if (trace.traceType === 'tool_result') {
    const identity = createToolCallIdentity(trace.turnId, trace.toolCallId);
    const key = identity ? toolCallIdentityKey(identity) : null;
    if (!identity || !key) {
      block.hasMalformedToolTrace = true;
      return;
    }
    if (!block.toolCallIdentityKeys.has(key)) {
      if (!callContextByIdentity.has(key)) {
        block.hasMalformedToolTrace = true;
        return;
      }
      block.toolCallIds.add(identity.toolCallId);
      block.toolCallIdentityKeys.add(key);
    }
    block.matchedToolCallIds.add(identity.toolCallId);
    block.matchedToolCallIdentityKeys.add(key);
  }
};

const finalizeBlock = (
  block: MutableBlock,
  callContextByIdentity: ReadonlyMap<string, ToolCallContext>,
): InteractionBlock => {
  const isStructurallyComplete =
    block.blockKind !== 'recovery' &&
    block.traces.length > 1 &&
    !block.hasMalformedToolTrace &&
    Array.from(block.toolCallIdentityKeys).every((key) => block.matchedToolCallIdentityKeys.has(key));

  return {
    blockId: block.blockId,
    turnId: block.turnId,
    traceIds: [...block.traceIds],
    traces: [...block.traces],
    openingTraceId: block.openingTraceId,
    closingTraceId: block.closingTraceId,
    blockKind: block.blockKind,
    hasAssistantTrace: block.hasAssistantTrace,
    toolCallIds: [...block.toolCallIds],
    matchedToolCallIds: [...block.matchedToolCallIds],
    hasMalformedToolTrace: block.hasMalformedToolTrace,
    isStructurallyComplete,
    toolResultDigests: [],
    toolInteractions: buildToolInteractions(block.traces, { callContextByIdentity }),
  };
};

export class InteractionBlockBuilder {
  build(
    activeRawTraces: RawTraceItem[],
    callContextByIdentity: ReadonlyMap<string, ToolCallContext> = new Map(),
  ): InteractionBlock[] {
    const blocks: InteractionBlock[] = [];
    let currentBlock: MutableBlock | null = null;
    let blockIndex = 0;

    const flush = (): void => {
      if (!currentBlock) {
        return;
      }
      blocks.push(finalizeBlock(currentBlock, callContextByIdentity));
      currentBlock = null;
    };

    for (const trace of activeRawTraces) {
      const isBoundary = isInteractionBoundaryTrace(trace.traceType);
      if (isBoundary) {
        flush();
        blockIndex += 1;
        currentBlock = createMutableBlock(
          `block_${blockIndex.toString().padStart(4, '0')}`,
          trace,
          trace.traceType as InteractionBlockKind,
          callContextByIdentity,
        );
        continue;
      }

      if (!currentBlock) {
        blockIndex += 1;
        currentBlock = createMutableBlock(
          `block_${blockIndex.toString().padStart(4, '0')}`,
          trace,
          'recovery',
          callContextByIdentity,
        );
        continue;
      }

      addTraceToBlock(currentBlock, trace, callContextByIdentity);
    }

    flush();
    return blocks;
  }
}
