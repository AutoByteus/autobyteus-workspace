import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendContextFileReferenceSection,
  collectContextFileReferencePaths,
  type ContextFileReferenceSectionOptions,
} from "autobyteus-ts/agent/message/context-file-reference-section.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { type JsonObject } from "../codex-app-server-json.js";
import { ContextFileLocalPathResolver } from "../../../../context-files/services/context-file-local-path-resolver.js";

const HTTP_URL_PATTERN = /^https?:\/\//i;
const IMAGE_DATA_URL_PATTERN = /^data:image\//i;

type ContextFilePathResolverLike = Pick<ContextFileLocalPathResolver, "resolve">;

const createContextFileReferenceOptions = (
  contextFileLocalPathResolver: ContextFilePathResolverLike,
): ContextFileReferenceSectionOptions => ({
  resolveUri: (uri) => contextFileLocalPathResolver.resolve(uri),
});

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

const toCodexImageInput = (
  rawUri: string,
  contextFileLocalPathResolver: ContextFilePathResolverLike,
): JsonObject | null => {
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

const isEligibleReferenceFile = (
  contextFile: ContextFile,
  contextFileReferenceOptions: ContextFileReferenceSectionOptions,
): boolean =>
  collectContextFileReferencePaths([contextFile], contextFileReferenceOptions)
    .length > 0;

export const toCodexUserInput = (
  message: AgentInputUserMessage,
): Array<JsonObject> => {
  const contextFileLocalPathResolver = new ContextFileLocalPathResolver();
  const contextFileReferenceOptions = createContextFileReferenceOptions(
    contextFileLocalPathResolver,
  );
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
        contextFileLocalPathResolver,
      );
      if (imageInput) {
        inputs.push(imageInput);
      }
      continue;
    }

    if (
      !isEligibleReferenceFile(contextFile, contextFileReferenceOptions) &&
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
      contextFileReferenceOptions,
    ),
    text_elements: [],
  });
  return inputs;
};
