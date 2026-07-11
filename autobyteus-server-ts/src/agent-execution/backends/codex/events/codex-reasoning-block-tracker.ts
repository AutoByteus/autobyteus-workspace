import { randomUUID } from "node:crypto";
import { debugCodexThreadEvent } from "./codex-thread-event-debug.js";

export type CodexReasoningBlockInput = {
  turnId: string | null;
  providerItemId: string | null;
  fragmentKind: "delta" | "completed_item";
  delta: string;
};

export type CodexReasoningBlockUpdate = {
  segmentId: string;
  delta: string;
};

type ActiveReasoningBlock = {
  segmentId: string;
  currentProviderItemId: string | null;
  hasContent: boolean;
};

export class CodexReasoningBlockTracker {
  private readonly activeBlockByTurnId = new Map<string, ActiveReasoningBlock>();
  private readonly maxReasoningTurnCacheSize = 128;
  private nextBlockSequence = 0;

  constructor(private readonly instanceNonce = randomUUID()) {}

  public append(input: CodexReasoningBlockInput): CodexReasoningBlockUpdate {
    const activeBlock = input.turnId
      ? this.activeBlockByTurnId.get(input.turnId)
      : undefined;
    const block = activeBlock ?? this.createBlock(input.providerItemId);
    const sameKnownProviderItem =
      input.providerItemId !== null &&
      block.currentProviderItemId === input.providerItemId;
    const needsCompletedItemSeparator =
      input.fragmentKind === "completed_item" &&
      block.hasContent &&
      !sameKnownProviderItem;
    const delta = `${needsCompletedItemSeparator ? "\n\n" : ""}${input.delta}`;

    block.currentProviderItemId = input.providerItemId;
    block.hasContent = true;
    if (input.turnId && !activeBlock) {
      this.rememberActiveBlock(input.turnId, block);
    }

    debugCodexThreadEvent("Resolved reasoning block update", {
      segmentId: block.segmentId,
      turnId: input.turnId,
      providerItemId: input.providerItemId,
      fragmentKind: input.fragmentKind,
      deltaLength: delta.length,
      reusedActiveBlock: Boolean(activeBlock),
      insertedSeparator: needsCompletedItemSeparator,
      cacheSize: this.activeBlockByTurnId.size,
    });
    return { segmentId: block.segmentId, delta };
  }

  public clearForTurn(turnId: string): void {
    this.activeBlockByTurnId.delete(turnId);
    debugCodexThreadEvent("Cleared reasoning block for turn", {
      turnId,
      cacheSize: this.activeBlockByTurnId.size,
    });
  }

  public clearAll(): void {
    this.activeBlockByTurnId.clear();
    debugCodexThreadEvent("Cleared all reasoning blocks", { cacheSize: 0 });
  }

  private createBlock(providerItemId: string | null): ActiveReasoningBlock {
    this.nextBlockSequence += 1;
    return {
      segmentId: `reasoning-block:${this.instanceNonce}:${this.nextBlockSequence}`,
      currentProviderItemId: providerItemId,
      hasContent: false,
    };
  }

  private rememberActiveBlock(turnId: string, block: ActiveReasoningBlock): void {
    this.activeBlockByTurnId.set(turnId, block);
    while (this.activeBlockByTurnId.size > this.maxReasoningTurnCacheSize) {
      const oldestTurnId = this.activeBlockByTurnId.keys().next().value;
      if (!oldestTurnId) break;
      this.activeBlockByTurnId.delete(oldestTurnId);
    }
  }
}
