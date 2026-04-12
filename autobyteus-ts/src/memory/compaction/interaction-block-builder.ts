import type { RawTraceItem } from '../models/raw-trace-item.js';
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
  hasMalformedToolTrace: boolean;
};

const createMutableBlock = (blockId: string, openingTrace: RawTraceItem, blockKind: InteractionBlockKind): MutableBlock => {
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
    hasMalformedToolTrace: false,
  };

  addTraceToBlock(block, openingTrace);
  return block;
};

const addTraceToBlock = (block: MutableBlock, trace: RawTraceItem): void => {
  block.traces.push(trace);
  block.traceIds.push(trace.id);
  block.turnId = block.turnId ?? trace.turnId ?? null;
  block.closingTraceId = trace.id;

  if (trace.traceType === 'assistant') {
    block.hasAssistantTrace = true;
    return;
  }

  if (trace.traceType === 'tool_call') {
    if (trace.toolCallId) {
      block.toolCallIds.add(trace.toolCallId);
    }
    return;
  }

  if (trace.traceType === 'tool_result') {
    if (!trace.toolCallId || !block.toolCallIds.has(trace.toolCallId)) {
      block.hasMalformedToolTrace = true;
      return;
    }
    block.matchedToolCallIds.add(trace.toolCallId);
  }
};

const finalizeBlock = (block: MutableBlock): InteractionBlock => {
  const isStructurallyComplete =
    block.blockKind !== 'recovery' &&
    block.traces.length > 1 &&
    !block.hasMalformedToolTrace &&
    Array.from(block.toolCallIds).every((toolCallId) => block.matchedToolCallIds.has(toolCallId));

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
  };
};

export class InteractionBlockBuilder {
  build(rawTraces: RawTraceItem[]): InteractionBlock[] {
    const blocks: InteractionBlock[] = [];
    let currentBlock: MutableBlock | null = null;
    let blockIndex = 0;

    const flush = (): void => {
      if (!currentBlock) {
        return;
      }
      blocks.push(finalizeBlock(currentBlock));
      currentBlock = null;
    };

    for (const trace of rawTraces) {
      const isBoundary = isInteractionBoundaryTrace(trace.traceType);
      if (isBoundary) {
        flush();
        blockIndex += 1;
        currentBlock = createMutableBlock(`block_${blockIndex.toString().padStart(4, '0')}`, trace, trace.traceType as InteractionBlockKind);
        continue;
      }

      if (!currentBlock) {
        blockIndex += 1;
        currentBlock = createMutableBlock(`block_${blockIndex.toString().padStart(4, '0')}`, trace, 'recovery');
        continue;
      }

      addTraceToBlock(currentBlock, trace);
    }

    flush();
    return blocks;
  }
}
