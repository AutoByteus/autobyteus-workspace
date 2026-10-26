import * as fsSync from 'fs'
import * as path from 'path'
import type {
  IdentifyNodeRegistryChange,
  NodeEntry,
  NodeRegistrySnapshot,
} from './nodeRegistryTypes'
import { EMBEDDED_ENTRY_ID, isNodeId } from './nodeRegistryTypes'
import { logger } from './logger'

const NODE_REGISTRY_FILE_NAME = 'node-registry.json'

function getRegistryFilePath(userDataPath: string): string {
  return path.join(userDataPath, NODE_REGISTRY_FILE_NAME)
}

export function nowIsoString(): string {
  return new Date().toISOString()
}

export function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

function getEmbeddedNodeEntry(activeEmbeddedBaseUrl: string): NodeEntry {
  const now = nowIsoString()
  return {
    id: EMBEDDED_ENTRY_ID,
    name: 'Embedded Node',
    baseUrl: sanitizeBaseUrl(activeEmbeddedBaseUrl),
    nodeType: 'embedded',
    createdAt: now,
    updatedAt: now,
  }
}

export function ensureEmbeddedNode(
  snapshot: NodeRegistrySnapshot,
  activeEmbeddedBaseUrl: string,
): NodeRegistrySnapshot {
  const normalizedActiveBaseUrl = sanitizeBaseUrl(activeEmbeddedBaseUrl)
  if (!normalizedActiveBaseUrl) {
    throw new Error('Active embedded client base URL is required')
  }
  const existingIndex = snapshot.nodes.findIndex((node) => node.id === EMBEDDED_ENTRY_ID)
  if (existingIndex === -1) {
    return {
      version: snapshot.version + 1,
      nodes: [getEmbeddedNodeEntry(normalizedActiveBaseUrl), ...snapshot.nodes],
    }
  }

  const existing = snapshot.nodes[existingIndex]
  if (sanitizeBaseUrl(existing.baseUrl) === normalizedActiveBaseUrl) {
    return snapshot
  }

  return {
    version: snapshot.version + 1,
    nodes: snapshot.nodes.map((node, index) => (
      index === existingIndex
        ? {
            ...node,
            baseUrl: normalizedActiveBaseUrl,
            updatedAt: nowIsoString(),
          }
        : node
    )),
  }
}

function normalizeLoadedNode(rawNode: unknown): NodeEntry | null {
  if (!rawNode || typeof rawNode !== 'object') {
    return null
  }

  const node = rawNode as Record<string, unknown>
  const id = typeof node.id === 'string' ? node.id.trim() : ''
  const name = typeof node.name === 'string' ? node.name.trim() : ''
  const baseUrlRaw = typeof node.baseUrl === 'string' ? node.baseUrl.trim() : ''
  const nodeType = node.nodeType === 'embedded' || node.nodeType === 'remote' ? node.nodeType : null

  if (!id || !name || !baseUrlRaw || !nodeType) {
    return null
  }

  const legacyRegistrationSource = typeof node.registrationSource === 'string'
    ? node.registrationSource
    : null

  if (nodeType === 'remote' && legacyRegistrationSource === 'discovered') {
    return null
  }

  const now = nowIsoString()
  const createdAt = typeof node.createdAt === 'string' && node.createdAt.trim()
    ? node.createdAt
    : now
  const updatedAt = typeof node.updatedAt === 'string' && node.updatedAt.trim()
    ? node.updatedAt
    : now
  return {
    id,
    name,
    baseUrl: sanitizeBaseUrl(baseUrlRaw),
    nodeType,
    // Absent or not a valid ID: not learned yet (one-nodes-tab, design § Persisted Data).
    ...(isNodeId(node.nodeId) ? { nodeId: node.nodeId } : {}),
    createdAt,
    updatedAt,
  }
}

export function loadNodeRegistrySnapshot(
  userDataPath: string,
  activeEmbeddedBaseUrl: string,
): NodeRegistrySnapshot {
  const filePath = getRegistryFilePath(userDataPath)
  if (!fsSync.existsSync(filePath)) {
    return ensureEmbeddedNode({
      version: 0,
      nodes: [],
    }, activeEmbeddedBaseUrl)
  }

  try {
    const raw = fsSync.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as NodeRegistrySnapshot
    if (!Array.isArray(parsed.nodes) || typeof parsed.version !== 'number') {
      logger.warn('Node registry file is invalid; regenerating default registry.')
      return ensureEmbeddedNode({
        version: 0,
        nodes: [],
      }, activeEmbeddedBaseUrl)
    }

    const normalizedNodes = parsed.nodes
      .map((node) => normalizeLoadedNode(node))
      .filter((node): node is NodeEntry => node !== null)

    if (normalizedNodes.length !== parsed.nodes.length) {
      logger.info(
        `Node registry migration removed ${parsed.nodes.length - normalizedNodes.length} incompatible/legacy node record(s).`,
      )
    }

    return ensureEmbeddedNode({
      version: parsed.version,
      nodes: normalizedNodes,
    }, activeEmbeddedBaseUrl)
  } catch (error) {
    logger.error('Failed to read node registry file:', error)
    return ensureEmbeddedNode({
      version: 0,
      nodes: [],
    }, activeEmbeddedBaseUrl)
  }
}

export function saveNodeRegistrySnapshot(userDataPath: string, snapshot: NodeRegistrySnapshot): void {
  try {
    fsSync.writeFileSync(getRegistryFilePath(userDataPath), JSON.stringify(snapshot, null, 2), 'utf8')
  } catch (error) {
    logger.error('Failed to persist node registry snapshot:', error)
  }
}

export function getEntryById(
  snapshot: NodeRegistrySnapshot,
  entryId: string,
): NodeEntry | undefined {
  return snapshot.nodes.find((node) => node.id === entryId)
}

/**
 * The `identify` change (one-nodes-tab AR-003): the entry's `nodeId` set to, or replaced by, the node ID its own
 * address answered; the same array when it is already that ID. Never merges entries or changes a name or address.
 */
export function identifyNodeEntry(
  nodes: NodeEntry[],
  change: IdentifyNodeRegistryChange,
  now: string,
): NodeEntry[] {
  const index = nodes.findIndex((node) => node.id === change.entryId)
  if (index === -1) throw new Error(`Node does not exist: ${change.entryId}`)
  if (!isNodeId(change.nodeId)) throw new Error(`Invalid node ID: ${change.nodeId}`)
  if (nodes[index]!.nodeId === change.nodeId) return nodes
  return nodes.map((node, at) => at === index ? { ...node, nodeId: change.nodeId, updatedAt: now } : node)
}
