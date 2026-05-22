import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContextFile } from './context-file.js';

const REFERENCE_FILES_HEADING = 'Reference files:';
const REST_CONTEXT_FILE_LOCATOR_PATTERN = /^\/?rest(?:\/|$)/i;
const URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export type ContextFileUriResolver = (uri: string) => string | null | undefined;

export interface ContextFileReferenceSectionOptions {
  resolveUri?: ContextFileUriResolver;
}

const hasNullByte = (value: string): boolean => value.includes('\0');

const normalizeLocalReferencePath = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || hasNullByte(trimmedValue)) {
    return null;
  }

  if (REST_CONTEXT_FILE_LOCATOR_PATTERN.test(trimmedValue)) {
    return null;
  }

  if (/^file:/i.test(trimmedValue)) {
    try {
      const filePath = fileURLToPath(trimmedValue);
      return filePath && !hasNullByte(filePath) ? filePath : null;
    } catch {
      return null;
    }
  }

  if (path.isAbsolute(trimmedValue) || path.win32.isAbsolute(trimmedValue)) {
    return trimmedValue;
  }

  if (URI_SCHEME_PATTERN.test(trimmedValue)) {
    return null;
  }

  return null;
};

const resolveContextFileReferencePath = (
  uri: string,
  options: ContextFileReferenceSectionOptions,
): string | null => {
  const trimmedUri = uri.trim();
  if (!trimmedUri || hasNullByte(trimmedUri)) {
    return null;
  }

  if (options.resolveUri) {
    try {
      const resolvedUri = options.resolveUri(trimmedUri);
      const resolvedPath = normalizeLocalReferencePath(resolvedUri);
      if (resolvedPath) {
        return resolvedPath;
      }
    } catch {
      // Ignore resolver failures and fall back to direct local-path normalization.
    }
  }

  return normalizeLocalReferencePath(trimmedUri);
};

const dedupeReferencePaths = (paths: readonly string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const rawPath of paths) {
    const normalizedPath = normalizeLocalReferencePath(rawPath);
    if (!normalizedPath || seen.has(normalizedPath)) {
      continue;
    }
    seen.add(normalizedPath);
    deduped.push(normalizedPath);
  }

  return deduped;
};

export function collectContextFileReferencePaths(
  contextFiles: readonly ContextFile[] | null | undefined,
  options: ContextFileReferenceSectionOptions = {},
): string[] {
  const seen = new Set<string>();
  const paths: string[] = [];

  for (const contextFile of contextFiles ?? []) {
    if (!contextFile || typeof contextFile.uri !== 'string') {
      continue;
    }

    const referencePath = resolveContextFileReferencePath(contextFile.uri, options);
    if (!referencePath || seen.has(referencePath)) {
      continue;
    }

    seen.add(referencePath);
    paths.push(referencePath);
  }

  return paths;
}

export function buildReferenceFilesSection(paths: readonly string[]): string {
  const referencePaths = dedupeReferencePaths(paths);
  if (referencePaths.length === 0) {
    return '';
  }

  return [
    REFERENCE_FILES_HEADING,
    ...referencePaths.map((referencePath) => `- ${referencePath}`),
  ].join('\n');
}

export function appendReferenceFilesSection(content: string, paths: readonly string[]): string {
  const section = buildReferenceFilesSection(paths);
  if (!section) {
    return content;
  }

  const trimmedContent = content.trimEnd();
  if (trimmedContent.endsWith(section)) {
    return content;
  }

  return trimmedContent ? `${trimmedContent}\n\n${section}` : section;
}

export function appendContextFileReferenceSection(
  content: string,
  contextFiles: readonly ContextFile[] | null | undefined,
  options: ContextFileReferenceSectionOptions = {},
): string {
  return appendReferenceFilesSection(
    content,
    collectContextFileReferencePaths(contextFiles, options),
  );
}
