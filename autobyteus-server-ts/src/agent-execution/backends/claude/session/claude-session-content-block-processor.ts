import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { asObject, asString } from "../claude-runtime-shared.js";
import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import type { ClaudeTextSegmentProjector } from "./claude-text-segment-projector.js";

export const processOrderedClaudeContentBlocks = (input: {
  chunk: unknown;
  textProjector: ClaudeTextSegmentProjector;
  runContext: ClaudeRunContext;
  toolingCoordinator: ClaudeSessionToolUseCoordinator;
}): boolean => {
  const payload = asObject(input.chunk);
  if (!payload) {
    return false;
  }

  const messagePayload = asObject(payload.message);
  const contentBlocks = Array.isArray(messagePayload?.content)
    ? (messagePayload.content as unknown[])
    : [];
  if (contentBlocks.length === 0) {
    return false;
  }

  const messageType = asString(payload.type);
  for (let index = 0; index < contentBlocks.length; index += 1) {
    const block = contentBlocks[index];
    if (messageType === "assistant") {
      input.textProjector.processAssistantContentBlock({
        chunk: payload,
        message: messagePayload ?? {},
        block,
        contentBlockIndex: index,
      });
    }
    input.toolingCoordinator.processToolLifecycleContentBlock(input.runContext, {
      messageType,
      block,
    });
  }
  return true;
};
