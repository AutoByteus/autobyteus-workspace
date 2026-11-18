import {
  RELEASED_NODE_REGISTRY_FILE_NAME,
  RELEASED_NODE_REGISTRY_STORAGE_KEY,
} from '../../frozen/released-node-registry';

/**
 * autobyteus-290 SM-6 (the Electron file) and SM-7 (the window's browser-mode copy): the desktop node list's records
 * say `nodeId` for the node's ID, and the unread `isSystem` is dropped. `id` (the entry's own ID) and every other
 * field are copied as they are; the current reader decides about each record, as before (N-907).
 */
export const NODE_REGISTRY_ENTRY_NAMES = {
  sourceFileName: RELEASED_NODE_REGISTRY_FILE_NAME,
  targetFileName: 'node-registry.json',
  sourceStorageKey: RELEASED_NODE_REGISTRY_STORAGE_KEY,
  targetStorageKey: 'autobyteus.node_registry',
} as const;

export type NodeRegistryConversion = { ok: true; text: string } | { ok: false; reason: string };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const convertRecord = (record: unknown): unknown => {
  if (!isPlainObject(record)) return record;
  const { serverInstanceId, isSystem: _isSystem, ...rest } = record;
  return 'serverInstanceId' in record ? { ...rest, nodeId: serverInstanceId } : rest;
};

/** Fails only when the text is not readable JSON; a snapshot without a `nodes` list is copied unchanged. */
export const convertNodeRegistryText = (text: string): NodeRegistryConversion => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: `not readable JSON (${error instanceof Error ? error.message : String(error)})` };
  }
  const converted = isPlainObject(parsed) && Array.isArray(parsed.nodes)
    ? { ...parsed, nodes: parsed.nodes.map(convertRecord) }
    : parsed;
  return { ok: true, text: JSON.stringify(converted, null, 2) };
};
