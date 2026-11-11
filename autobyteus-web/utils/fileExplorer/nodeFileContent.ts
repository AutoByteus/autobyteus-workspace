import { authorizedFetch } from '~/utils/remoteAccess/authorizedTransport';

/**
 * A node file (autobyteus-436): a file on the node's computer opened by its absolute path, read-only, through
 * `GET /rest/node-files/content?path=`. This is the one loader both clients use (autobyteus-471): the phone's viewer
 * and the desktop's Files panel. The request carries the client's credential: the phone's through `authorizedFetch`,
 * a desktop window's owner credential through the desktop app.
 */

/** Why a node file did not load: the node's refusal, or anything else ("could not be opened"). */
export type NodeFileRefusal = 'not-found' | 'folder' | 'failed';

export type LoadedNodeFile =
  | Readonly<{ kind: 'text'; content: string }>
  | Readonly<{ kind: 'blob'; blob: Blob }>
  | Readonly<{ kind: 'refused'; refusal: NodeFileRefusal }>;

/** The node-file URL for one absolute path. */
export const nodeFileContentUrl = (restBaseUrl: string, absolutePath: string): string =>
  `${restBaseUrl.replace(/\/$/, '')}/node-files/content?path=${encodeURIComponent(absolutePath)}`;

const REFUSAL_BY_CODE: Readonly<Record<string, NodeFileRefusal>> = {
  NODE_FILE_NOT_FOUND: 'not-found',
  NODE_FILE_IS_FOLDER: 'folder',
};

/** The message each refusal shows (the 436 messages; other failures: today's "could not be opened"). */
export const NODE_FILE_REFUSAL_MESSAGE_KEYS: Readonly<Record<NodeFileRefusal, string>> = {
  'not-found': 'workspace.components.mobile.views.MobileFiles.node_file_not_found',
  folder: 'workspace.components.mobile.views.MobileFiles.node_file_is_folder',
  failed: 'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed',
};

/**
 * Fetches a file once from its node URL: text as content, anything else as a blob; a refused or failed request is a
 * refusal (never an exception). `asText` comes from the file's type, read from its name.
 */
export const loadNodeFileFromUrl = async (url: string, asText: boolean): Promise<LoadedNodeFile> => {
  try {
    const response = await authorizedFetch(url);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { code?: unknown } | null;
      const refusal = typeof body?.code === 'string' ? REFUSAL_BY_CODE[body.code] : undefined;
      return { kind: 'refused', refusal: refusal ?? 'failed' };
    }
    return asText ? { kind: 'text', content: await response.text() } : { kind: 'blob', blob: await response.blob() };
  } catch {
    return { kind: 'refused', refusal: 'failed' };
  }
};

/** Loads one node file by its absolute path from the node at `restBaseUrl`. */
export const loadNodeFile = (restBaseUrl: string, absolutePath: string, asText: boolean): Promise<LoadedNodeFile> =>
  loadNodeFileFromUrl(nodeFileContentUrl(restBaseUrl, absolutePath), asText);

const NODE_FILE_PREVIEW_ERROR_PREFIX = 'node-file-preview:';

/** A node file's refusal as an open file's `error` (the desktop Files panel words it, as it words local-file errors). */
export const nodeFilePreviewError = (refusal: NodeFileRefusal): string => `${NODE_FILE_PREVIEW_ERROR_PREFIX}${refusal}`;

/** The message key of an open file's `error` when it is a node file's refusal; null for any other error. */
export const nodeFilePreviewErrorMessageKey = (value: string | null | undefined): string | null => {
  if (!value?.startsWith(NODE_FILE_PREVIEW_ERROR_PREFIX)) return null;
  const refusal = value.slice(NODE_FILE_PREVIEW_ERROR_PREFIX.length) as NodeFileRefusal;
  return NODE_FILE_REFUSAL_MESSAGE_KEYS[refusal] ?? null;
};
