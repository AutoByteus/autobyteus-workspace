import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { downloadFileFromUrl } from "autobyteus-ts/utils/download-utils.js";
import type { MediaToolExecutionContext } from "./media-tool-contract.js";

const LOCAL_FILE_URL_PREFIX = "file:";

const isRemoteOrDataReference = (value: string): boolean =>
  value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");

const isWithinOrEqualPath = (rootPath: string, targetPath: string): boolean => {
  const relativePath = path.relative(rootPath, targetPath);
  return (
    relativePath === "" ||
    (
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath)
    )
  );
};

const normalizeWorkspaceRoot = (context: MediaToolExecutionContext): string => {
  const workspaceRootPath = context.workspaceRootPath;
  if (typeof workspaceRootPath !== "string" || workspaceRootPath.trim().length === 0) {
    throw new Error(
      `Media tools require a workspace root to resolve local paths for agent '${context.agentId ?? "unknown"}'.`,
    );
  }
  return workspaceRootPath;
};

const resolveLocalMediaPath = (
  rawPath: string,
  context: MediaToolExecutionContext,
  pathLabel: string,
  options: { allowFileUrl?: boolean } = {},
): string => {
  const normalizedPath = rawPath.trim();
  if (!normalizedPath) {
    throw new Error(`${pathLabel} must be a non-empty string.`);
  }

  const isFileUrl = normalizedPath.startsWith(LOCAL_FILE_URL_PREFIX);
  if (isFileUrl && options.allowFileUrl !== true) {
    throw new Error(`${pathLabel} must be a local file path, not a file: URL.`);
  }
  const localPath = isFileUrl ? fileURLToPath(normalizedPath) : normalizedPath;
  const workspaceRoot = path.resolve(normalizeWorkspaceRoot(context));
  if (path.isAbsolute(localPath)) {
    return path.resolve(localPath);
  }

  const resolvedPath = path.resolve(workspaceRoot, localPath);
  if (!isWithinOrEqualPath(workspaceRoot, resolvedPath)) {
    throw new Error(
      `${pathLabel} '${rawPath}' escapes the workspace when resolved as a relative path; use an absolute local path for external media locations.`,
    );
  }
  return resolvedPath;
};

export class MediaPathResolver {
  resolveOutputFilePath(
    outputFilePath: string,
    context: MediaToolExecutionContext,
  ): string {
    return resolveLocalMediaPath(outputFilePath, context, "Output file path");
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

    const resolvedPath = resolveLocalMediaPath(
      inputImage,
      context,
      "Input image path",
      { allowFileUrl: true },
    );
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
