import * as fsSync from 'fs'
import * as path from 'path'
import type {
  NodeAdminClaimHeadersResult,
  NodeAdminClaimSummary,
  RegisterNodeAdminClaimInput,
} from '../types/nodeAdminClaim'
import {
  NODE_ADMIN_CLAIM_ID_HEADER,
  NODE_ADMIN_CLAIM_SECRET_HEADER,
} from '../types/nodeAdminClaim'
import { logger } from './logger'
import { sanitizeBaseUrl } from './nodeRegistryStore'

const CLAIM_STORE_FILE_NAME = 'node-admin-claims.v1.json'

type StoredNodeAdminClaim = {
  nodeId: string
  managementBaseUrl: string
  claimId: string
  rawSecret: string
  createdAt: string
  updatedAt: string
}

type ClaimStoreFile = {
  version: 1
  claims: StoredNodeAdminClaim[]
}

const nowIsoString = (): string => new Date().toISOString()

const normalizeNodeId = (value: string): string => value.trim()

const normalizeClaimId = (value: string): string => value.trim()

const normalizeRawSecret = (value: string): string => value.trim()

const claimKey = (nodeId: string, managementBaseUrl: string): string =>
  `${normalizeNodeId(nodeId)}\n${sanitizeBaseUrl(managementBaseUrl).toLowerCase()}`

const emptyStore = (): ClaimStoreFile => ({ version: 1, claims: [] })

const summaryForMissing = (nodeId: string, managementBaseUrl: string): NodeAdminClaimSummary => ({
  status: 'missing',
  nodeId: normalizeNodeId(nodeId),
  managementBaseUrl: sanitizeBaseUrl(managementBaseUrl),
  claimIdSuffix: null,
  updatedAt: null,
})

const toSummary = (claim: StoredNodeAdminClaim): NodeAdminClaimSummary => ({
  status: 'configured',
  nodeId: claim.nodeId,
  managementBaseUrl: claim.managementBaseUrl,
  claimIdSuffix: claim.claimId.slice(-6),
  updatedAt: claim.updatedAt,
})

export class NodeAdminClaimStore {
  constructor(private readonly userDataPath: string) {}

  getFilePath(): string {
    return path.join(this.userDataPath, CLAIM_STORE_FILE_NAME)
  }

  private readStore(): ClaimStoreFile {
    const filePath = this.getFilePath()
    if (!fsSync.existsSync(filePath)) {
      return emptyStore()
    }
    try {
      const parsed = JSON.parse(fsSync.readFileSync(filePath, 'utf8')) as ClaimStoreFile
      if (!Array.isArray(parsed.claims)) {
        return emptyStore()
      }
      return {
        version: 1,
        claims: parsed.claims
          .map((claim) => this.normalizeLoadedClaim(claim))
          .filter((claim): claim is StoredNodeAdminClaim => claim !== null),
      }
    } catch (error) {
      logger.error('Failed to read node admin claim store:', error)
      return emptyStore()
    }
  }

  private writeStore(store: ClaimStoreFile): void {
    const filePath = this.getFilePath()
    try {
      fsSync.mkdirSync(path.dirname(filePath), { recursive: true })
      fsSync.writeFileSync(filePath, JSON.stringify(store, null, 2), {
        encoding: 'utf8',
        mode: 0o600,
      })
      try {
        fsSync.chmodSync(filePath, 0o600)
      } catch {
        // Best effort on platforms that support POSIX file modes.
      }
    } catch (error) {
      logger.error('Failed to persist node admin claim store:', error)
      throw error
    }
  }

  private normalizeLoadedClaim(rawClaim: unknown): StoredNodeAdminClaim | null {
    if (!rawClaim || typeof rawClaim !== 'object') {
      return null
    }
    const claim = rawClaim as Partial<StoredNodeAdminClaim>
    const nodeId = normalizeNodeId(String(claim.nodeId ?? ''))
    const managementBaseUrl = sanitizeBaseUrl(String(claim.managementBaseUrl ?? ''))
    const claimId = normalizeClaimId(String(claim.claimId ?? ''))
    const rawSecret = normalizeRawSecret(String(claim.rawSecret ?? ''))
    if (!nodeId || !managementBaseUrl || !claimId || !rawSecret) {
      return null
    }
    const createdAt = typeof claim.createdAt === 'string' && claim.createdAt.trim()
      ? claim.createdAt
      : nowIsoString()
    const updatedAt = typeof claim.updatedAt === 'string' && claim.updatedAt.trim()
      ? claim.updatedAt
      : createdAt
    return { nodeId, managementBaseUrl, claimId, rawSecret, createdAt, updatedAt }
  }

  getSummary(nodeId: string, managementBaseUrl: string): NodeAdminClaimSummary {
    const targetKey = claimKey(nodeId, managementBaseUrl)
    const claim = this.readStore().claims.find((entry) => claimKey(entry.nodeId, entry.managementBaseUrl) === targetKey)
    return claim ? toSummary(claim) : summaryForMissing(nodeId, managementBaseUrl)
  }

  register(input: RegisterNodeAdminClaimInput): NodeAdminClaimSummary {
    const nodeId = normalizeNodeId(input.nodeId)
    const managementBaseUrl = sanitizeBaseUrl(input.managementBaseUrl)
    const claimId = normalizeClaimId(input.claimId)
    const rawSecret = normalizeRawSecret(input.rawSecret)
    if (!nodeId || !managementBaseUrl || !claimId || !rawSecret) {
      throw new Error('Node ID, management base URL, claim ID, and claim secret are required.')
    }

    const store = this.readStore()
    const targetKey = claimKey(nodeId, managementBaseUrl)
    const now = nowIsoString()
    const existingIndex = store.claims.findIndex((entry) => claimKey(entry.nodeId, entry.managementBaseUrl) === targetKey)
    const nextClaim: StoredNodeAdminClaim = {
      nodeId,
      managementBaseUrl,
      claimId,
      rawSecret,
      createdAt: existingIndex >= 0 ? store.claims[existingIndex].createdAt : now,
      updatedAt: now,
    }
    if (existingIndex >= 0) {
      store.claims[existingIndex] = nextClaim
    } else {
      store.claims.push(nextClaim)
    }
    this.writeStore(store)
    return toSummary(nextClaim)
  }

  getHeaders(nodeId: string, managementBaseUrl: string): NodeAdminClaimHeadersResult {
    const targetKey = claimKey(nodeId, managementBaseUrl)
    const claim = this.readStore().claims.find((entry) => claimKey(entry.nodeId, entry.managementBaseUrl) === targetKey)
    if (!claim) {
      return {
        ok: false,
        reason: 'missing',
        summary: summaryForMissing(nodeId, managementBaseUrl),
      }
    }
    return {
      ok: true,
      headers: {
        [NODE_ADMIN_CLAIM_ID_HEADER]: claim.claimId,
        [NODE_ADMIN_CLAIM_SECRET_HEADER]: claim.rawSecret,
      },
      summary: toSummary(claim),
    }
  }

  clear(nodeId: string, managementBaseUrl?: string | null): NodeAdminClaimSummary {
    const normalizedNodeId = normalizeNodeId(nodeId)
    const normalizedManagementBaseUrl = managementBaseUrl ? sanitizeBaseUrl(managementBaseUrl) : ''
    const store = this.readStore()
    const nextClaims = store.claims.filter((entry) => {
      if (entry.nodeId !== normalizedNodeId) {
        return true
      }
      return normalizedManagementBaseUrl
        ? claimKey(entry.nodeId, entry.managementBaseUrl) !== claimKey(normalizedNodeId, normalizedManagementBaseUrl)
        : false
    })
    if (nextClaims.length !== store.claims.length) {
      this.writeStore({ version: 1, claims: nextClaims })
    }
    return normalizedManagementBaseUrl
      ? summaryForMissing(normalizedNodeId, normalizedManagementBaseUrl)
      : summaryForMissing(normalizedNodeId, '')
  }
}
