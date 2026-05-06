import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { downloadFileFromUrl } from "autobyteus-ts/utils/download-utils.js";
import { resolveSafePath } from "autobyteus-ts/utils/file-utils.js";
import type { MediaToolExecutionContext } from "./media-tool-contract.js";

const LOCAL_FILE_URL_PREFIX = "file:";

const isRemoteOrDataReference = (value: string): boolean =>
  value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");

const normalizeWorkspaceRoot = (context: MediaToolExecutionContext): string => {
  const workspaceRootPath = context.workspaceRootPath;
  if (typeof workspaceRootPath !== "string" || workspaceRootPath.trim().length === 0) {
    throw new Error(
      `Media tools require a workspace root to resolve local paths for agent '${context.agentId ?? "unknown"}'.`,
    );
  }
  return workspaceRootPath;
};

export class MediaPathResolver {
  resolveOutputFilePath(
    outputFilePath: string,
    context: MediaToolExecutionContext,
  ): string {
    return resolveSafePath(outputFilePath, normalizeWorkspaceRoot(context));
  }

  resolveInputImageReferences(
    inputImages: string[] | null | undefined,
    context: MediaToolExecutionContext,
  ): string[] {
    if (!inputImages || inputImages.length === 0) {
      return [];
    }
    return inputImages.map((entry) => this.resolveInputImageReference(entry, context));
  }

  resolveInputImageReference(
    inputImage: string,
    context: MediaToolExecutionContext,
  ): string {
    const normalized = inputImage.trim();
    if (!normalized) {
      throw new Error("Input image references must be non-empty strings.");
    }

    if (isRemoteOrDataReference(normalized)) {
      return normalized;
    }

    const localPath = normalized.startsWith(LOCAL_FILE_URL_PREFIX)
      ? fileURLToPath(normalized)
      : normalized;
    const resolvedPath = resolveSafePath(localPath, normalizeWorkspaceRoot(context));
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      throw new Error(`Input image path '${inputImage}' does not resolve to an existing file.`);
    }
    return resolvedPath;
  }

  async writeGeneratedMediaFromUrl(sourceUrl: string, outputFilePath: string): Promise<void> {
    await downloadFileFromUrl(sourceUrl, outputFilePath);
  }
}

let cachedMediaPathResolver: MediaPathResolver | null = null;

export const getMediaPathResolver = (): MediaPathResolver => {
  if (!cachedMediaPathResolver) {
    cachedMediaPathResolver = new MediaPathResolver();
  }
  return cachedMediaPathResolver;
};
