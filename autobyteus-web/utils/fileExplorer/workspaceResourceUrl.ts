import type { FileRelativeResourceContext } from '~/stores/fileExplorerState'
import type { MarkdownImageResourceResolution } from '~/utils/markdownImageResource'

type WorkspaceMarkdownImageInput = {
  source: string
  documentPath: string
  context: FileRelativeResourceContext
  restBaseUrl: string
}

const DIRECT_SOURCE_PATTERN = /^[a-z][a-z\d+.-]*:/i

const isDirectImageSource = (source: string): boolean =>
  DIRECT_SOURCE_PATTERN.test(source) ||
  source.startsWith('//') ||
  source.startsWith('/')

const decodeRelativePathSegments = (sourcePath: string): string[] | null => {
  const decodedSegments: string[] = []
  for (const rawSegment of sourcePath.split('/')) {
    let decodedSegment: string
    try {
      decodedSegment = decodeURIComponent(rawSegment)
    } catch {
      return null
    }
    if (
      decodedSegment.includes('/') ||
      decodedSegment.includes('\\') ||
      decodedSegment.includes('\0')
    ) {
      return null
    }
    decodedSegments.push(decodedSegment)
  }
  return decodedSegments
}

const normalizeDocumentDirectory = (documentPath: string): string[] | null => {
  const normalized = documentPath.replace(/\\/g, '/').replace(/^\/+/, '')
  const segments = normalized.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '..' || segment.includes('\0'))) {
    return null
  }
  return segments.slice(0, -1).filter((segment) => segment !== '.')
}

export const buildWorkspaceContentUrl = (
  restBaseUrl: string,
  workspaceId: string,
  workspaceRelativePath: string,
): string => {
  const normalizedRestBase = restBaseUrl.replace(/\/+$/, '')
  return `${normalizedRestBase}/workspaces/${encodeURIComponent(workspaceId)}/content?path=${encodeURIComponent(workspaceRelativePath)}`
}

/** A relative reference in a workspace document, resolved to a path in the same workspace, or why it cannot be. */
export type WorkspaceRelativeReference =
  | { kind: 'resolved'; workspaceRelativePath: string; fragment: string | null }
  | { kind: 'blocked'; reason: 'invalid-path' | 'outside-workspace' }

/**
 * The one rule for a relative reference in a workspace document, an image source or a link (autobyteus-576 FU-002):
 * the `#fragment` and `?query` are not part of the file, each segment is URL-decoded, and the result is resolved against
 * the document's folder with POSIX rules; a reference that leaves the workspace root, or names no file, is refused.
 */
export const resolveWorkspaceRelativeReference = (reference: string, documentPath: string): WorkspaceRelativeReference => {
  const trimmedSource = reference.trim()
  if (!trimmedSource || trimmedSource.includes('\\')) {
    return { kind: 'blocked', reason: 'invalid-path' }
  }

  const fragmentIndex = trimmedSource.indexOf('#')
  const fragment = fragmentIndex >= 0 ? trimmedSource.slice(fragmentIndex) : null
  const withoutFragment = fragmentIndex >= 0
    ? trimmedSource.slice(0, fragmentIndex)
    : trimmedSource
  const queryIndex = withoutFragment.indexOf('?')
  const sourcePath = queryIndex >= 0
    ? withoutFragment.slice(0, queryIndex)
    : withoutFragment
  if (!sourcePath) {
    return { kind: 'blocked', reason: 'invalid-path' }
  }

  const documentDirectory = normalizeDocumentDirectory(documentPath)
  const sourceSegments = decodeRelativePathSegments(sourcePath)
  if (!documentDirectory || !sourceSegments) {
    return { kind: 'blocked', reason: 'invalid-path' }
  }

  const resolvedSegments = [...documentDirectory]
  for (const segment of sourceSegments) {
    if (!segment || segment === '.') {
      continue
    }
    if (segment === '..') {
      if (resolvedSegments.length === 0) {
        return { kind: 'blocked', reason: 'outside-workspace' }
      }
      resolvedSegments.pop()
      continue
    }
    resolvedSegments.push(segment)
  }
  if (resolvedSegments.length === 0) {
    return { kind: 'blocked', reason: 'invalid-path' }
  }

  return {
    kind: 'resolved',
    workspaceRelativePath: resolvedSegments.join('/'),
    fragment: fragment && fragment.length > 1 ? fragment : null,
  }
}

export const resolveWorkspaceMarkdownImageResource = ({
  source,
  documentPath,
  context,
  restBaseUrl,
}: WorkspaceMarkdownImageInput): MarkdownImageResourceResolution => {
  const trimmedSource = source.trim()
  if (!trimmedSource || isDirectImageSource(trimmedSource)) {
    return { kind: 'direct', url: trimmedSource }
  }
  const reference = resolveWorkspaceRelativeReference(trimmedSource, documentPath)
  if (reference.kind === 'blocked') {
    return reference
  }
  return {
    kind: 'managed',
    fetchUrl: buildWorkspaceContentUrl(restBaseUrl, context.workspaceId, reference.workspaceRelativePath),
    fragment: reference.fragment,
  }
}
