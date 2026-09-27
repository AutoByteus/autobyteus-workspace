import type { ContentBlock } from "@agentclientprotocol/sdk";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { appendContextFileReferenceSection } from "autobyteus-ts/agent/message/context-file-reference-section.js";

/**
 * Builds ACP prompt blocks: the message text plus the shared `Reference files:` section
 * listing every local context file (images included) by absolute path. No image blocks are
 * sent; remote and data URLs are not listed.
 */
export const buildAcpPromptBlocks = (message: AgentInputUserMessage): ContentBlock[] => {
  const text = appendContextFileReferenceSection(message.content, message.contextFiles ?? []).trim();
  if (!text) throw new Error("ACP_PROMPT_EMPTY: the message has no text or local file references.");
  return [{ type: "text", text }];
};
