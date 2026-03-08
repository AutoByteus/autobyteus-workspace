import * as fsSync from 'fs'
import * as path from 'path'
import type { NodeProfile, NodeRegistrySnapshot } from './nodeRegistryTypes'
import { EMBEDDED_NODE_ID } from './nodeRegistryTypes'
import { logger } from './logger'

const NODE_REGISTRY_FILE_NAME = 'node-registry.v1.json'

function getRegistryFilePath(userDataPath: string): string {
  return path.join(userDataPath, NODE_REGISTRY_FILE_NAME)
}

export function nowIsoString(): string {
  return new Date().toISOString()
}

export function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

function getEmbeddedNodeProfile(internalServerPort: number): NodeProfile {
  const now = nowIsoString()
  return {
    id: EMBEDDED_NODE_ID,
    name: 'Embedded Node',
    baseUrl: `http://localhost:${internalServerPort}`,
    nodeType: 'embedded',
    capabilities: {
      terminal: true,
      fileExplorerStreaming: true,
    },
    capabilityProbeState: 'ready',
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function ensureEmbeddedNode(
  snapshot: NodeRegistrySnapshot,
  internalServerPort: number,
): NodeRegistrySnapshot {
  const existing = snapshot.nodes.find((node) => node.id === EMBEDDED_NODE_ID)
  if (existing) {
    return snapshot
  }

  return {
    version: snapshot.version + 1,
    nodes: [getEmbeddedNodeProfile(internalServerPort), ...snapshot.nodes],
  }
}

function normalizeLoadedNode(rawNode: unknown): NodeProfile | null {
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

  const capabilityProbeState = node.capabilityProbeState === 'unknown'
    || node.capabilityProbeState === 'ready'
    || node.capabilityProbeState === 'degraded'
    ? node.capabilityProbeState
    : undefined

  let capabilities: NodeProfile['capabilities'] | undefined
  if (node.capabilities && typeof node.capabilities === 'object') {
    const rawCapabilities = node.capabilities as Record<string, unknown>
    if (typeof rawCapabilities.terminal === 'boolean' && typeof rawCapabilities.fileExplorerStreaming === 'boolean') {
      capabilities = {
        terminal: rawCapabilities.terminal,
        fileExplorerStreaming: rawCapabilities.fileExplorerStreaming,
      }
    }
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
    capabilities,
    capabilityProbeState,
    isSystem: nodeType === 'embedded',
    createdAt,
    updatedAt,
  }
}

export function loadNodeRegistrySnapshot(
  userDataPath: string,
  internalServerPort: number,
): NodeRegistrySnapshot {
  const filePath = getRegistryFilePath(userDataPath)
  if (!fsSync.existsSync(filePath)) {
    return ensureEmbeddedNode({
      version: 0,
      nodes: [],
    }, internalServerPort)
  }

  try {
    const raw = fsSync.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as NodeRegistrySnapshot
    if (!Array.isArray(parsed.nodes) || typeof parsed.version !== 'number') {
      logger.warn('Node registry file is invalid; regenerating default registry.')
      return ensureEmbeddedNode({
        version: 0,
        nodes: [],
      }, internalServerPort)
    }

    const normalizedNodes = parsed.nodes
      .map((node) => normalizeLoadedNode(node))
      .filter((node): node is NodeProfile => node !== null)

    if (normalizedNodes.length !== parsed.nodes.length) {
      logger.info(
        `Node registry migration removed ${parsed.nodes.length - normalizedNodes.length} incompatible/legacy node record(s).`,
      )
    }

    return ensureEmbeddedNode({
      version: parsed.version,
      nodes: normalizedNodes,
    }, internalServerPort)
  } catch (error) {
    logger.error('Failed to read node registry file:', error)
    return ensureEmbeddedNode({
      version: 0,
      nodes: [],
    }, internalServerPort)
  }
}

export function saveNodeRegistrySnapshot(userDataPath: string, snapshot: NodeRegistrySnapshot): void {
  try {
    fsSync.writeFileSync(getRegistryFilePath(userDataPath), JSON.stringify(snapshot, null, 2), 'utf8')
  } catch (error) {
    logger.error('Failed to persist node registry snapshot:', error)
  }
}

export function getNodeProfileById(
  snapshot: NodeRegistrySnapshot,
  nodeId: string,
): NodeProfile | undefined {
  return snapshot.nodes.find((node) => node.id === nodeId)
}
