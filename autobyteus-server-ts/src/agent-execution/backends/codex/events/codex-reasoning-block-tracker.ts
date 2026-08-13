import { randomUUID } from "node:crypto";
import { debugCodexThreadEvent } from "./codex-thread-event-debug.js";

export type CodexReasoningBlockInput = {
  turnId: string | null;
  providerItemId: string | null;
  snapshot: string;
};

export type CodexReasoningLifecycleAction =
  | {
      kind: "start";
      segmentId: string;
      turnId: string | null;
    }
  | {
      kind: "content";
      segmentId: string;
      turnId: string | null;
      delta: string;
    }
  | {
      kind: "end";
      segmentId: string;
      turnId: string | null;
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

  public append(input: CodexReasoningBlockInput): CodexReasoningLifecycleAction[] {
    const activeBlock = input.turnId
      ? this.activeBlockByTurnId.get(input.turnId)
      : undefined;
    const repeatedKnownProviderItem =
      Boolean(activeBlock) &&
      input.providerItemId !== null &&
      activeBlock?.currentProviderItemId === input.providerItemId;
    if (repeatedKnownProviderItem) return [];

    const block = activeBlock ?? this.createBlock(input.providerItemId);
    const needsSeparator = block.hasContent;
    const delta = `${needsSeparator ? "\n\n" : ""}${input.snapshot}`;

    block.currentProviderItemId = input.providerItemId;
    block.hasContent = true;
    if (input.turnId && !activeBlock) {
      this.rememberActiveBlock(input.turnId, block);
    }

    const content: CodexReasoningLifecycleAction = {
      kind: "content",
      segmentId: block.segmentId,
      turnId: input.turnId,
      delta,
    };
    const start: CodexReasoningLifecycleAction = {
      kind: "start",
      segmentId: block.segmentId,
      turnId: input.turnId,
    };
    const actions: CodexReasoningLifecycleAction[] = input.turnId
      ? [...(!activeBlock ? [start] : []), content]
      : [start, content, { kind: "end", segmentId: block.segmentId, turnId: null }];
    debugCodexThreadEvent("Resolved reasoning block lifecycle actions", {
      segmentId: block.segmentId,
      turnId: input.turnId,
      providerItemId: input.providerItemId,
      deltaLength: delta.length,
      reusedActiveBlock: Boolean(activeBlock),
      insertedSeparator: needsSeparator,
      cacheSize: this.activeBlockByTurnId.size,
      actionKinds: actions.map((action) => action.kind),
    });
    return actions;
  }

  public closeForTurn(turnId: string): CodexReasoningLifecycleAction[] {
    const block = this.activeBlockByTurnId.get(turnId);
    if (!block) return [];
    this.activeBlockByTurnId.delete(turnId);
    const actions: CodexReasoningLifecycleAction[] = block.hasContent
      ? [{ kind: "end", segmentId: block.segmentId, turnId }]
      : [];
    debugCodexThreadEvent("Closed reasoning block for turn", {
      turnId,
      cacheSize: this.activeBlockByTurnId.size,
      actionCount: actions.length,
    });
    return actions;
  }

  public closeAll(): CodexReasoningLifecycleAction[] {
    const actions = [...this.activeBlockByTurnId.entries()]
      .filter(([, block]) => block.hasContent)
      .map(([turnId, block]): CodexReasoningLifecycleAction => ({
        kind: "end",
        segmentId: block.segmentId,
        turnId,
      }));
    this.activeBlockByTurnId.clear();
    debugCodexThreadEvent("Closed all reasoning blocks", {
      cacheSize: 0,
      actionCount: actions.length,
    });
    return actions;
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
