import type { ClaudeSdkClient, ClaudeSdkQueryLike } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { ClaudeSdkSelectedBinding } from "../../../domain/claude-sdk-usage.js";

/** Binds selected catalog value to the active query's SDK-resolved raw result key. */
export const bindClaudeSelectedModelForTurn = {
  initial(selectedModelValue: string): ClaudeSdkSelectedBinding {
    return { selectedModelValue, selectedResolvedRawModelId: null, resolution: "missing" };
  },
  async resolve(client: ClaudeSdkClient, query: ClaudeSdkQueryLike, selectedModelValue: string): Promise<ClaudeSdkSelectedBinding> {
    if (!client.resolveSelectedModelForQuery) return this.initial(selectedModelValue);
    const result = await client.resolveSelectedModelForQuery(query, selectedModelValue);
    return { selectedModelValue, selectedResolvedRawModelId: result.resolvedRawModelId, resolution: result.resolution };
  },
};
