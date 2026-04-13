import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { asObject, asString, type JsonObject } from "../codex-app-server-json.js";
import { ContextFileLocalPathResolver } from "../../../../context-files/services/context-file-local-path-resolver.js";

const HTTP_URL_PATTERN = /^https?:\/\//i;
const IMAGE_DATA_URL_PATTERN = /^data:image\//i;
const contextFileLocalPathResolver = new ContextFileLocalPathResolver();

const resolveLocalPathUri = (uri: string): string | null => {
  const normalizedUri = uri.trim();
  if (!normalizedUri) {
    return null;
  }

  if (normalizedUri.startsWith("file://")) {
    try {
      return fileURLToPath(normalizedUri);
    } catch {
      return null;
    }
  }

  return path.isAbsolute(normalizedUri) ? normalizedUri : null;
};

const toCodexImageInput = (rawUri: string): JsonObject | null => {
  const uri = rawUri.trim();
  if (!uri) {
    return null;
  }

  if (IMAGE_DATA_URL_PATTERN.test(uri)) {
    return { type: "image", url: uri };
  }

  const resolvedContextFilePath = contextFileLocalPathResolver.resolve(uri);
  if (resolvedContextFilePath) {
    return { type: "localImage", path: resolvedContextFilePath };
  }

  const localPath = resolveLocalPathUri(uri);
  if (localPath) {
    return { type: "localImage", path: localPath };
  }

  if (HTTP_URL_PATTERN.test(uri)) {
    return { type: "image", url: uri };
  }

  return { type: "localImage", path: uri };
};

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
      const imageInput = toCodexImageInput(contextFile.uri);
      if (imageInput) {
        inputs.push(imageInput);
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
