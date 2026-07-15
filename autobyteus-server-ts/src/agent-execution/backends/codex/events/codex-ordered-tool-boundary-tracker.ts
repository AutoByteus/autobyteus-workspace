export type CodexToolLifecyclePlacement =
  | "existing_card_update"
  | "result_first_creation";

export class CodexOrderedToolBoundaryTracker {
  private readonly invocationIdsByTurnId = new Map<string, Set<string>>();
  private readonly maxTurnCacheSize = 128;

  public markOrderedToolCreated(turnId: string, invocationId: string): void {
    const knownInvocationIds = this.invocationIdsByTurnId.get(turnId);
    if (knownInvocationIds) {
      knownInvocationIds.add(invocationId);
      return;
    }

    this.invocationIdsByTurnId.set(turnId, new Set([invocationId]));
    while (this.invocationIdsByTurnId.size > this.maxTurnCacheSize) {
      const oldestTurnId = this.invocationIdsByTurnId.keys().next().value;
      if (!oldestTurnId) break;
      this.invocationIdsByTurnId.delete(oldestTurnId);
    }
  }

  public classifyToolLifecycleUpdate(
    turnId: string | null,
    invocationId: string | null,
  ): CodexToolLifecyclePlacement {
    if (
      turnId &&
      invocationId &&
      this.invocationIdsByTurnId.get(turnId)?.has(invocationId)
    ) {
      return "existing_card_update";
    }

    if (turnId && invocationId) {
      this.markOrderedToolCreated(turnId, invocationId);
    }
    return "result_first_creation";
  }

  public clearForTurn(turnId: string): void {
    this.invocationIdsByTurnId.delete(turnId);
  }

  public clearAll(): void {
    this.invocationIdsByTurnId.clear();
  }
}
