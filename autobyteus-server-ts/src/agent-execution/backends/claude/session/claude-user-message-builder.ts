import fs from "node:fs/promises";
import path from "node:path";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { appendContextFileReferenceSection } from "autobyteus-ts/agent/message/context-file-reference-section.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import type { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { resolveContextImageSource } from "../../../shared/context-image-source.js";
import type {
  ClaudeSdkUserContentBlock,
  ClaudeSdkUserMessage,
} from "../../../../runtime-management/claude/client/claude-sdk-streaming-session.js";

/** Local image files above this size are not attached (the CLI downsizes smaller ones). */
export const CLAUDE_INLINE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

const MEDIA_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
};

const DATA_URL_PATTERN = /^data:([^;,]+);base64,(.*)$/is;

const isImageContextFile = (contextFile: ContextFile): boolean =>
  contextFile.fileType === ContextFileType.IMAGE;

const imageUnavailableNote = (uri: string, reason: string): ClaudeSdkUserContentBlock => ({
  type: "text",
  text: `[Attached image could not be attached: ${uri} (${reason}).]`,
});

const describeReadFailure = (error: unknown): string => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (code === "ENOENT") return "file not found";
  if (code === "EACCES" || code === "EPERM") return "permission denied";
  if (code === "EISDIR") return "not a file";
  return error instanceof Error ? error.message : String(error);
};

const readLocalImageBlock = async (
  uri: string,
  filePath: string,
): Promise<ClaudeSdkUserContentBlock> => {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return imageUnavailableNote(uri, "not a file");
    if (stat.size > CLAUDE_INLINE_IMAGE_MAX_BYTES) return imageUnavailableNote(uri, "file is larger than 20 MB");
    const data = await fs.readFile(filePath);
    return {
      type: "image",
      source: {
        type: "base64",
        // The CLI corrects a wrong media type from the bytes (probe H); the extension is a hint.
        media_type: MEDIA_TYPE_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? "image/png",
        data: data.toString("base64"),
      },
    };
  } catch (error) {
    return imageUnavailableNote(uri, describeReadFailure(error));
  }
};

const toImageBlock = async (contextFile: ContextFile): Promise<ClaudeSdkUserContentBlock | null> => {
  const source = resolveContextImageSource(contextFile.uri);
  if (!source) {
    return null;
  }
  if (source.kind === "http_url") {
    return { type: "image", source: { type: "url", url: source.url } };
  }
  if (source.kind === "data_url") {
    const match = DATA_URL_PATTERN.exec(source.url);
    return match
      ? { type: "image", source: { type: "base64", media_type: match[1]!.toLowerCase(), data: match[2]! } }
      : imageUnavailableNote("data URL", "not a base64 image data URL");
  }
  return readLocalImageBlock(contextFile.uri.trim(), source.path);
};

/** The message text as sent: content plus the reference section for non-image files. */
export const describeClaudeUserMessageText = (message: AgentInputUserMessage): string =>
  appendContextFileReferenceSection(
    message.content,
    (message.contextFiles ?? []).filter((contextFile) => !isImageContextFile(contextFile)),
  ).trim();

/** Synchronous check that the message has text, a file reference, or an image to send. */
export const hasClaudeUserMessageContent = (message: AgentInputUserMessage): boolean =>
  describeClaudeUserMessageText(message).length > 0 || (message.contextFiles ?? []).some(isImageContextFile);

/**
 * Builds the SDK user message: carried-over system notes, the text with path references
 * for non-image context files, then inline image blocks. Unreadable images become a
 * visible text note instead of failing the input (AC-013).
 */
export const buildClaudeUserMessage = async (input: {
  uuid: string;
  message: AgentInputUserMessage;
  systemNotes?: readonly string[];
}): Promise<ClaudeSdkUserMessage> => {
  const contextFiles = input.message.contextFiles ?? [];
  const text = describeClaudeUserMessageText(input.message);
  const content: ClaudeSdkUserContentBlock[] = [
    ...(input.systemNotes ?? []).map((note): ClaudeSdkUserContentBlock => ({ type: "text", text: note })),
  ];
  if (text) {
    content.push({ type: "text", text });
  }
  for (const contextFile of contextFiles.filter(isImageContextFile)) {
    const block = await toImageBlock(contextFile);
    if (block) content.push(block);
  }
  if (content.length === 0) {
    throw new Error("Claude runtime message content is required.");
  }
  return {
    type: "user",
    uuid: input.uuid,
    parent_tool_use_id: null,
    message: { role: "user", content },
  };
};
