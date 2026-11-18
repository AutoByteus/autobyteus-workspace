import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NodeCredentialStore } from '../nodeCredentialStore'

vi.mock('../../logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }))

/** A stand-in for the OS keychain: reversible, and never plain text on disk. */
const keychain = {
  isEncryptionAvailable: () => true,
  encryptString: (plain: string) => Buffer.from(Buffer.from(plain, 'utf8').toString('base64').split('').reverse().join(''), 'utf8'),
  decryptString: (encrypted: Buffer) => Buffer.from(encrypted.toString('utf8').split('').reverse().join(''), 'base64').toString('utf8'),
}

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }) })
const userData = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-credentials-')); dirs.push(dir); return dir }

describe('NodeCredentialStore (NA-8, NA-10)', () => {
  it('keeps the credentials encrypted with the keychain in a 0600 file and reads them back', () => {
    const dir = userData()
    const store = NodeCredentialStore.inUserData(dir, keychain)
    store.set('docker', { credentialId: 'owncred_1', credential: 'own_secret_value' })
    const file = path.join(dir, 'node-credentials.json')
    expect(fs.readFileSync(file, 'utf8')).not.toContain('own_secret_value')
    if (process.platform !== 'win32') expect(fs.statSync(file).mode & 0o777).toBe(0o600)
    const reread = NodeCredentialStore.inUserData(dir, keychain)
    reread.load()
    expect(reread.get('docker')).toEqual({ credentialId: 'owncred_1', credential: 'own_secret_value' })
    reread.delete('docker')
    const after = NodeCredentialStore.inUserData(dir, keychain)
    after.load()
    expect(after.entryIds()).toEqual([])
  })

  it('NAS-32 a store that cannot be read is kept aside, never deleted; the desktop starts with no credentials', () => {
    const dir = userData()
    fs.writeFileSync(path.join(dir, 'node-credentials.json'), 'not encrypted json')
    const store = NodeCredentialStore.inUserData(dir, keychain)
    store.load()
    expect(store.entryIds()).toEqual([])
    expect(fs.readdirSync(dir).some((name) => name.startsWith('node-credentials.json.unreadable-'))).toBe(true)
  })

  it('without a keychain keeps credentials for this run only, writing nothing', () => {
    const dir = userData()
    const store = NodeCredentialStore.inUserData(dir, { ...keychain, isEncryptionAvailable: () => false })
    store.set('docker', { credentialId: 'owncred_1', credential: 'own_x' })
    expect(store.get('docker')).toMatchObject({ credential: 'own_x' })
    expect(fs.readdirSync(dir)).toEqual([])
  })
})
