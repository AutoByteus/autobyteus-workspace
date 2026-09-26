import type { ClaudeSdkStreamingSession } from "../../../../runtime-management/claude/client/claude-sdk-streaming-session.js";
import type { ClaudeSdkSelectedBinding } from "../../../domain/claude-sdk-usage.js";

/** Binds the selected catalog value to the open session's SDK-resolved raw result key. */
export const bindClaudeSelectedModel = {
  initial(selectedModelValue: string): ClaudeSdkSelectedBinding {
    return { selectedModelValue, selectedResolvedRawModelId: null, resolution: "missing" };
  },
  async resolve(
    session: Pick<ClaudeSdkStreamingSession, "resolveSelectedModel">,
    selectedModelValue: string,
  ): Promise<ClaudeSdkSelectedBinding> {
    const result = await session.resolveSelectedModel(selectedModelValue);
    return { selectedModelValue, selectedResolvedRawModelId: result.resolvedRawModelId, resolution: result.resolution };
  },
};
