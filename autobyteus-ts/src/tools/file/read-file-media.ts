import fs from 'node:fs/promises';
import { ContextFile } from '../../agent/message/context-file.js';
import type { MultimodalCapabilities } from '../../llm/multimodal-capabilities.js';
import type { MediaFileKind } from '../../utils/media-file-kind.js';

/** The part of the agent context the media read needs: the current model's input capabilities. */
export type MediaReadContext = {
  llmInstance?: { model?: { multimodalCapabilities?: MultimodalCapabilities } | null } | null;
};

const ANALYSIS_BY_KIND: Readonly<Record<MediaFileKind, string>> = Object.freeze({
  image: 'visual',
  audio: 'audio',
  video: 'video',
});

/**
 * read_file's media branch: a resolved image, audio or video file becomes a context file, which the agent loop attaches
 * to the next turn for the model to see. A missing or non-regular file, an empty file, and a kind the model marks
 * `unsupported` are refused; `unknown` loads.
 */
export async function readMediaFileAsContextFile(
  context: MediaReadContext,
  resolvedPath: string,
  kind: MediaFileKind,
): Promise<ContextFile> {
  let stat;
  try {
    stat = await fs.stat(resolvedPath);
  } catch {
    throw new Error(`The file at resolved path ${resolvedPath} does not exist.`);
  }
  if (!stat.isFile()) {
    throw new Error(`The path ${resolvedPath} is not a regular file.`);
  }
  if (stat.size === 0) {
    throw new Error(`The media file '${resolvedPath}' is empty and was not loaded.`);
  }

  if (context.llmInstance?.model?.multimodalCapabilities?.[kind] === 'unsupported') {
    throw new Error(
      `The selected model does not support ${kind} input. The ${kind} file was not loaded. ` +
        `Continue without ${ANALYSIS_BY_KIND[kind]} analysis and do not claim to have inspected it.`,
    );
  }

  return new ContextFile(resolvedPath);
}
