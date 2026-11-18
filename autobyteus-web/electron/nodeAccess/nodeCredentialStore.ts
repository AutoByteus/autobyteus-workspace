import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../logger'

/** One node's owner credential, as the node issued it for this desktop. */
export type StoredNodeCredential = Readonly<{ credentialId: string; credential: string }>

/** What the store needs from Electron's `safeStorage` (the OS keychain). */
export type CredentialEncryption = Readonly<{
  isEncryptionAvailable(): boolean
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
}>

const isStoredCredential = (value: unknown): value is StoredNodeCredential =>
  Boolean(value) && typeof (value as StoredNodeCredential).credentialId === 'string'
  && typeof (value as StoredNodeCredential).credential === 'string'

/**
 * The desktop's owner credentials for remote and Docker nodes, by node entry ID (NA-8, NA-10): one file in the app's
 * user-data folder, `node-credentials.json`, encrypted with the OS keychain (`safeStorage`), mode 0600. Without a
 * keychain the credentials stay in memory for this run only. A file that cannot be read is kept aside, never deleted
 * (the owner connects those nodes again with a setup code). Only the main process reads it; no credential is logged.
 */
export class NodeCredentialStore {
  private readonly credentials = new Map<string, StoredNodeCredential>()

  constructor(
    private readonly filePath: string,
    private readonly encryption: CredentialEncryption,
  ) {}

  static inUserData(userDataPath: string, encryption: CredentialEncryption): NodeCredentialStore {
    return new NodeCredentialStore(path.join(userDataPath, 'node-credentials.json'), encryption)
  }

  load(): void {
    if (!fs.existsSync(this.filePath)) return
    try {
      const plain = this.encryption.decryptString(fs.readFileSync(this.filePath))
      const parsed = JSON.parse(plain) as Record<string, unknown>
      for (const [entryId, value] of Object.entries(parsed)) {
        if (isStoredCredential(value)) this.credentials.set(entryId, { credentialId: value.credentialId, credential: value.credential })
      }
    } catch {
      const aside = `${this.filePath}.unreadable-${Date.now()}`
      logger.warn(`Node credentials could not be read; kept as ${path.basename(aside)}. Connect those nodes again.`)
      try { fs.renameSync(this.filePath, aside) } catch { /* left in place */ }
    }
  }

  get(entryId: string): StoredNodeCredential | null {
    return this.credentials.get(entryId) ?? null
  }

  entryIds(): string[] {
    return [...this.credentials.keys()]
  }

  set(entryId: string, credential: StoredNodeCredential): void {
    this.credentials.set(entryId, credential)
    this.save()
  }

  delete(entryId: string): void {
    if (this.credentials.delete(entryId)) this.save()
  }

  private save(): void {
    if (!this.encryption.isEncryptionAvailable()) {
      logger.warn('The OS keychain is not available: node credentials are kept for this run only.')
      return
    }
    const encrypted = this.encryption.encryptString(JSON.stringify(Object.fromEntries(this.credentials)))
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    const temporary = `${this.filePath}.${process.pid}.tmp`
    fs.writeFileSync(temporary, encrypted, { mode: 0o600 })
    fs.renameSync(temporary, this.filePath)
  }
}
