import {
  appendContextFileReferenceSection,
  collectContextFileReferencePaths,
} from "autobyteus-ts/agent/message/context-file-reference-section.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { type JsonObject } from "../codex-app-server-json.js";
import { resolveContextImageSource } from "../../../shared/context-image-source.js";

const toCodexImageInput = (
  rawUri: string,
): JsonObject | null => {
  const source = resolveContextImageSource(rawUri);
  if (!source) {
    return null;
  }
  return source.kind === "local_path"
    ? { type: "localImage", path: source.path }
    : { type: "image", url: source.url };
};

const isEligibleReferenceFile = (
  contextFile: ContextFile,
): boolean =>
  collectContextFileReferencePaths([contextFile])
    .length > 0;

export const toCodexUserInput = (
  message: AgentInputUserMessage,
): Array<JsonObject> => {
  const baseText = message.content.trim();
  const textLines: string[] = [];
  if (baseText) {
    textLines.push(baseText);
  }
  const inputs: Array<JsonObject> = [];

  for (const contextFile of message.contextFiles ?? []) {
    if (contextFile.fileType === ContextFileType.IMAGE) {
      const imageInput = toCodexImageInput(
        contextFile.uri,
      );
      if (imageInput) {
        inputs.push(imageInput);
      }
      continue;
    }

    if (
      !isEligibleReferenceFile(contextFile) &&
      contextFile.uri.trim()
    ) {
      textLines.push(`Context file: ${contextFile.uri.trim()}`);
    }
  }

  inputs.unshift({
    type: "text",
    text: appendContextFileReferenceSection(
      textLines.filter((line) => line.length > 0).join("\n"),
      message.contextFiles,
    ),
    text_elements: [],
  });
  return inputs;
};
