import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { asObject, asString, type JsonObject } from "./codex-runtime-json.js";

export const toCodexUserInput = (message: AgentInputUserMessage): Array<JsonObject> => {
  const baseText = message.content.trim();
  const textLines = [baseText];
  const interAgentEnvelope = asObject(
    (message.metadata as Record<string, unknown> | undefined)?.inter_agent_envelope ??
      (message.metadata as Record<string, unknown> | undefined)?.interAgentEnvelope,
  );
  if (interAgentEnvelope) {
    const sender =
      asString(interAgentEnvelope.senderAgentName) ??
      asString(interAgentEnvelope.senderAgentRunId) ??
      "agent";
    const recipient = asString(interAgentEnvelope.recipientName) ?? "recipient";
    const messageType = asString(interAgentEnvelope.messageType) ?? "agent_message";
    textLines.unshift(`[InterAgentMessage type=${messageType}] from ${sender} to ${recipient}`);
  }
  const inputs: Array<JsonObject> = [];

  for (const contextFile of message.contextFiles ?? []) {
    if (contextFile.fileType === ContextFileType.IMAGE) {
      const uri = contextFile.uri.trim();
      if (!uri) {
        continue;
      }
      if (/^https?:\/\//i.test(uri)) {
        inputs.push({ type: "image", url: uri });
      } else {
        inputs.push({ type: "localImage", path: uri });
      }
      continue;
    }

    if (contextFile.uri.trim()) {
      textLines.push(`Context file: ${contextFile.uri.trim()}`);
    }
  }

  inputs.unshift({
    type: "text",
    text: textLines.filter((line) => line.length > 0).join("\n"),
    text_elements: [],
  });
  return inputs;
};
