import type { RawTraceItem } from '../models/raw-trace-item.js';
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

  plan(rawTraces: RawTraceItem[], activeTurnId?: string | null): CompactionPlan {
    const builtBlocks = this.blockBuilder.build(rawTraces);
    if (!builtBlocks.length) {
      return new CompactionPlan({
        blocks: [],
        eligibleBlocks: [],
        frontierBlocks: [],
        eligibleTraceIds: [],
        frontierTraceIds: [],
        frontierStartBlockIndex: 0,
        activeTurnId: activeTurnId ?? null,
      });
    }

    const frontierStartBlockIndex = this.resolveFrontierStartBlockIndex(builtBlocks, activeTurnId ?? null);
    const eligibleBlocks = builtBlocks.slice(0, frontierStartBlockIndex).map((block) => this.attachDigests(block));
    const frontierBlocks = builtBlocks.slice(frontierStartBlockIndex).map((block) => ({ ...block, toolResultDigests: [] }));
    const blocks = [...eligibleBlocks, ...frontierBlocks];

    return new CompactionPlan({
      blocks,
      eligibleBlocks,
      frontierBlocks,
      eligibleTraceIds: eligibleBlocks.flatMap((block) => block.traceIds),
      frontierTraceIds: frontierBlocks.flatMap((block) => block.traceIds),
      frontierStartBlockIndex,
      activeTurnId: activeTurnId ?? null,
    });
  }

  private attachDigests(block: InteractionBlock): InteractionBlock {
    return {
      ...block,
      toolResultDigests: block.traces
        .filter((trace) => trace.traceType === 'tool_result')
        .map((trace) => this.digestBuilder.build(trace, this.maxItemChars)),
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
