import type { RawTraceItem } from '../models/raw-trace-item.js';
import {
  buildToolCallContextIndex,
  buildToolTraceLifecycleIndex,
  type ToolCallContext,
} from '../tool-trace-lifecycle-index.js';
import { CompactionPlan } from './compaction-plan.js';
import { InteractionBlockBuilder } from './interaction-block-builder.js';
import type { InteractionBlock } from './interaction-block.js';
import { ToolResultDigestBuilder } from './tool-result-digest-builder.js';

export class CompactionWindowPlanner {
  constructor(
    private readonly blockBuilder: InteractionBlockBuilder = new InteractionBlockBuilder(),
    private readonly digestBuilder: ToolResultDigestBuilder = new ToolResultDigestBuilder(),
    private readonly maxItemChars: number | null = null,
  ) {}

  plan(input: {
    activeRawTraces: RawTraceItem[];
    activeTurnId?: string | null;
    callContextByIdentity?: ReadonlyMap<string, ToolCallContext>;
  }): CompactionPlan {
    const activeRawTraceIds = new Set(input.activeRawTraces.map((trace) => trace.id));
    const callContextByIdentity = new Map(input.callContextByIdentity ?? []);
    for (const [key, context] of buildToolCallContextIndex(
      buildToolTraceLifecycleIndex(input.activeRawTraces),
    )) {
      callContextByIdentity.set(key, context);
    }
    const builtBlocks = this.blockBuilder.build(input.activeRawTraces, callContextByIdentity);
    if (!builtBlocks.length) {
      return new CompactionPlan({
        blocks: [],
        eligibleBlocks: [],
        frontierBlocks: [],
        eligibleTraceIds: [],
        frontierTraceIds: [],
        frontierStartBlockIndex: 0,
        activeTurnId: input.activeTurnId ?? null,
      });
    }

    const frontierStartBlockIndex = this.resolveFrontierStartBlockIndex(builtBlocks, input.activeTurnId ?? null);
    const eligibleBlocks = builtBlocks
      .slice(0, frontierStartBlockIndex)
      .map((block) => this.attachDigests(block, callContextByIdentity));
    const frontierBlocks = builtBlocks.slice(frontierStartBlockIndex).map((block) => ({ ...block, toolResultDigests: [] }));
    const blocks = [...eligibleBlocks, ...frontierBlocks];

    return new CompactionPlan({
      blocks,
      eligibleBlocks,
      frontierBlocks,
      eligibleTraceIds: eligibleBlocks.flatMap((block) => block.traceIds).filter((id) => activeRawTraceIds.has(id)),
      frontierTraceIds: frontierBlocks.flatMap((block) => block.traceIds).filter((id) => activeRawTraceIds.has(id)),
      frontierStartBlockIndex,
      activeTurnId: input.activeTurnId ?? null,
    });
  }

  private attachDigests(
    block: InteractionBlock,
    callContextByIdentity: ReadonlyMap<string, ToolCallContext>,
  ): InteractionBlock {
    return {
      ...block,
      toolResultDigests: block.traces
        .filter((trace) => trace.traceType === 'tool_result')
        .map((trace) => this.digestBuilder.build(trace, this.maxItemChars, callContextByIdentity)),
    };
  }

  private resolveFrontierStartBlockIndex(blocks: InteractionBlock[], activeTurnId: string | null): number {
    const trailingIncompleteStart = this.findTrailingIncompleteStart(blocks);
    if (trailingIncompleteStart !== null) {
      return trailingIncompleteStart;
    }

    if (activeTurnId) {
      const activeTurnBlockIndex = this.findLastBlockIndexForTurn(blocks, activeTurnId);
      if (activeTurnBlockIndex !== null) {
        return activeTurnBlockIndex;
      }
    }

    return Math.max(0, blocks.length - 1);
  }

  private findTrailingIncompleteStart(blocks: InteractionBlock[]): number | null {
    let frontierStart: number | null = null;

    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      if (blocks[index]?.isStructurallyComplete) {
        break;
      }
      frontierStart = index;
    }

    return frontierStart;
  }

  private findLastBlockIndexForTurn(blocks: InteractionBlock[], turnId: string): number | null {
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      if (blocks[index]?.turnId === turnId) {
        return index;
      }
    }
    return null;
  }
}
