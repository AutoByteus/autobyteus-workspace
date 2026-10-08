import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import {
  appendContextFileReferenceSection,
  collectContextFileReferencePaths,
} from "autobyteus-ts/agent/message/context-file-reference-section.js";
import { resolveContextImageSource } from "../../../shared/context-image-source.js";

const ATTACHED_IMAGES_HEADING = "Attached images (open each with view_file to see it):";
const DATA_URL_IMAGE_NOTE =
  "[An attached image could not be attached: inline data URL images are not supported by Antigravity.]";

/**
 * Builds the single text string AGY accepts as user input. AGY's headless input is
 * text-only, so local images are listed by absolute path under an explicit heading
 * telling the agent to open them with its native `view_file` tool; remote image URLs
 * are named; inline data URL images get a short note (their bytes are never embedded).
 * Non-image files use the shared `Reference files:` section, and a non-image file
 * without a local path gets a `Context file: <uri>` line. Without context files the
 * message content is returned unchanged.
 */
export const buildAgyUserMessageText = (message: AgentInputUserMessage): string => {
  const imagePaths: string[] = [];
  const otherImageLines: string[] = [];
  const nonImageFiles: ContextFile[] = [];
  const contextFileLines: string[] = [];

  for (const contextFile of message.contextFiles ?? []) {
    if (contextFile.fileType !== ContextFileType.IMAGE) {
      nonImageFiles.push(contextFile);
      const uri = contextFile.uri.trim();
      if (uri && collectContextFileReferencePaths([contextFile]).length === 0) {
        contextFileLines.push(`Context file: ${uri}`);
      }
      continue;
    }
    const source = resolveContextImageSource(contextFile.uri);
    if (!source) continue;
    if (source.kind === "local_path") {
      if (!imagePaths.includes(source.path)) imagePaths.push(source.path);
    } else if (source.kind === "http_url") {
      otherImageLines.push(`Attached image URL: ${source.url}`);
    } else {
      otherImageLines.push(DATA_URL_IMAGE_NOTE);
    }
  }

  const imageLines = [
    ...(imagePaths.length > 0 ? [ATTACHED_IMAGES_HEADING, ...imagePaths.map((imagePath) => `- ${imagePath}`)] : []),
    ...otherImageLines,
  ];
  const attachmentBlocks = [imageLines.join("\n"), contextFileLines.join("\n")].filter((block) => block.length > 0);
  const text = attachmentBlocks.length > 0
    ? [message.content.trimEnd(), ...attachmentBlocks].filter((block) => block.length > 0).join("\n\n")
    : message.content;
  return appendContextFileReferenceSection(text, nonImageFiles);
};
