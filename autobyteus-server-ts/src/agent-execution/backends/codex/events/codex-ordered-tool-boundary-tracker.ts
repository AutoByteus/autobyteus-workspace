export type CodexToolLifecyclePlacement =
  | "existing_card_update"
  | "result_first_creation";

type OrderedToolCorrelation = {
  toolName: string | null;
  conflictingToolName: boolean;
};

const nonEmpty = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export class CodexOrderedToolBoundaryTracker {
  private readonly correlationsByTurnId = new Map<string, Map<string, OrderedToolCorrelation>>();
  private readonly maxTurnCacheSize = 128;

  public markOrderedToolCreated(
    turnId: string,
    invocationId: string,
    toolName: string | null = null,
  ): void {
    const exactTurnId = nonEmpty(turnId);
    const exactInvocationId = nonEmpty(invocationId);
    if (!exactTurnId || !exactInvocationId) {
      return;
    }

    const exactToolName = nonEmpty(toolName);
    const turnCorrelations = this.correlationsByTurnId.get(exactTurnId);
    const existing = turnCorrelations?.get(exactInvocationId);
    if (existing) {
      if (
        exactToolName &&
        existing.toolName &&
        existing.toolName !== exactToolName
      ) {
        existing.toolName = null;
        existing.conflictingToolName = true;
      } else if (exactToolName && !existing.conflictingToolName) {
        existing.toolName = exactToolName;
      }
      return;
    }

    const nextTurnCorrelations = turnCorrelations ?? new Map<string, OrderedToolCorrelation>();
    nextTurnCorrelations.set(exactInvocationId, {
      toolName: exactToolName,
      conflictingToolName: false,
    });
    if (!turnCorrelations) {
      this.correlationsByTurnId.set(exactTurnId, nextTurnCorrelations);
    }
    while (this.correlationsByTurnId.size > this.maxTurnCacheSize) {
      const oldestTurnId = this.correlationsByTurnId.keys().next().value;
      if (!oldestTurnId) break;
      this.correlationsByTurnId.delete(oldestTurnId);
    }
  }

  public classifyToolLifecycleUpdate(
    turnId: string | null,
    invocationId: string | null,
  ): CodexToolLifecyclePlacement {
    const exactTurnId = nonEmpty(turnId);
    const exactInvocationId = nonEmpty(invocationId);
    if (exactTurnId && exactInvocationId && this.correlationsByTurnId
      .get(exactTurnId)
      ?.has(exactInvocationId)) {
      return "existing_card_update";
    }

    if (exactTurnId && exactInvocationId) {
      this.markOrderedToolCreated(exactTurnId, exactInvocationId);
    }
    return "result_first_creation";
  }

  public resolveToolName(
    turnId: string | null,
    invocationId: string | null,
  ): string | null {
    const exactTurnId = nonEmpty(turnId);
    const exactInvocationId = nonEmpty(invocationId);
    if (!exactTurnId || !exactInvocationId) {
      return null;
    }
    const correlation = this.correlationsByTurnId
      .get(exactTurnId)
      ?.get(exactInvocationId);
    return correlation && !correlation.conflictingToolName
      ? correlation.toolName
      : null;
  }

  public clearForTurn(turnId: string): void {
    const exactTurnId = nonEmpty(turnId);
    if (exactTurnId) this.correlationsByTurnId.delete(exactTurnId);
  }

  public clearAll(): void {
    this.correlationsByTurnId.clear();
  }
}
