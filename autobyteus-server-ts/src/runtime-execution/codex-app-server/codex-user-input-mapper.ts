import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getMediaStorageService } from "../../services/media-storage-service.js";
import { asObject, asString, type JsonObject } from "./codex-runtime-json.js";

const HTTP_URL_PATTERN = /^https?:\/\//i;
const IMAGE_DATA_URL_PATTERN = /^data:image\//i;
const REST_FILES_PREFIX = "/rest/files/";
const REST_FILES_PREFIX_NO_LEADING_SLASH = "rest/files/";

const isLoopbackHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const resolveConfiguredBaseOrigin = (): string | null => {
  try {
    return new URL(appConfigProvider.config.getBaseUrl()).origin;
  } catch {
    return null;
  }
};

const resolveRestMediaRelativePath = (uri: string): string | null => {
  const normalizedUri = uri.trim();
  if (!normalizedUri) {
    return null;
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(normalizedUri);
  } catch {
    parsedUrl = null;
  }

  if (parsedUrl && /^https?:$/i.test(parsedUrl.protocol)) {
    const configuredOrigin = resolveConfiguredBaseOrigin();
    if (configuredOrigin) {
      if (parsedUrl.origin !== configuredOrigin) {
        return null;
      }
    } else if (!isLoopbackHostname(parsedUrl.hostname)) {
      return null;
    }
  }

  const pathLike = parsedUrl ? parsedUrl.pathname : normalizedUri;
  const startsWithRootedPrefix = pathLike.startsWith(REST_FILES_PREFIX);
  const startsWithUnrootedPrefix = pathLike.startsWith(REST_FILES_PREFIX_NO_LEADING_SLASH);
  if (!startsWithRootedPrefix && !startsWithUnrootedPrefix) {
    return null;
  }

  const relative = startsWithRootedPrefix
    ? pathLike.slice(REST_FILES_PREFIX.length)
    : pathLike.slice(REST_FILES_PREFIX_NO_LEADING_SLASH.length);
  if (!relative.trim()) {
    return null;
  }

  try {
    return decodeURIComponent(relative);
  } catch {
    return relative;
  }
};

const resolveLocalMediaPathFromRestRelativePath = (relativePath: string): string | null => {
  const mediaRoot = getMediaStorageService().getMediaRoot();
  const resolvedRoot = path.resolve(mediaRoot);
  const resolvedCandidate = path.resolve(mediaRoot, relativePath);
  const isWithinRoot =
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
  if (!isWithinRoot) {
    return null;
  }

  return fs.existsSync(resolvedCandidate) ? resolvedCandidate : null;
};

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

  const restMediaRelativePath = resolveRestMediaRelativePath(uri);
  if (restMediaRelativePath !== null) {
    const localMediaPath = resolveLocalMediaPathFromRestRelativePath(restMediaRelativePath);
    return localMediaPath ? { type: "localImage", path: localMediaPath } : null;
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
