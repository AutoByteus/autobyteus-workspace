import type { InteractionBlock } from './interaction-block.js';

export class CompactionPlan {
  readonly blocks: InteractionBlock[];
  readonly eligibleBlocks: InteractionBlock[];
  readonly frontierBlocks: InteractionBlock[];
  readonly eligibleTraceIds: string[];
  readonly frontierTraceIds: string[];
  readonly frontierStartBlockIndex: number;
  readonly activeTurnId: string | null;

  constructor(options: {
    blocks: InteractionBlock[];
    eligibleBlocks: InteractionBlock[];
    frontierBlocks: InteractionBlock[];
    eligibleTraceIds: string[];
    frontierTraceIds: string[];
    frontierStartBlockIndex: number;
    activeTurnId?: string | null;
  }) {
    this.blocks = options.blocks;
    this.eligibleBlocks = options.eligibleBlocks;
    this.frontierBlocks = options.frontierBlocks;
    this.eligibleTraceIds = options.eligibleTraceIds;
    this.frontierTraceIds = options.frontierTraceIds;
    this.frontierStartBlockIndex = options.frontierStartBlockIndex;
    this.activeTurnId = options.activeTurnId ?? null;
  }

  get selectedBlockCount(): number {
    return this.eligibleBlocks.length;
  }

  get compactedBlockCount(): number {
    return this.eligibleBlocks.length;
  }
}
