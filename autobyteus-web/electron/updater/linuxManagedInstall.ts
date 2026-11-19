import { execFile } from 'node:child_process'
import { lstatSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { promisify } from 'node:util'

export type ManagedIdentity = Readonly<{ version: string; sha256: string }>
export type ManagedStage = Readonly<{ id: string; baseline: string; identity: ManagedIdentity; channel: 'stable' | 'beta' }>
export class ManagedStageGone extends Error {}
type Receipt = { code?: string; error?: string; stageID?: string; expectedDigest?: string; record?: string }
const execute = promisify(execFile)

/** The native client owns signed downloads and the authenticated writer protocol. No shell or elevation. */
export class LinuxManagedInstall {
  constructor(private readonly client: string) {}
  private async command(args: string[]): Promise<Receipt> {
    const { stdout } = await execute(this.client, args, { timeout: 210_000, maxBuffer: 8192 })
    const receipt = JSON.parse(stdout) as Receipt
    if (receipt.error) {
      if (receipt.code === 'STAGE_GONE') throw new ManagedStageGone(receipt.error)
      throw new Error(receipt.error)
    }
    return receipt
  }
  private identity(receipt: Receipt): ManagedIdentity {
    if (!receipt.record) throw new Error('Writer returned no authenticated identity')
    const record = JSON.parse(Buffer.from(receipt.record, 'base64').toString('utf8')) as ManagedIdentity
    if (typeof record.version !== 'string' || !/^[0-9a-f]{64}$/.test(record.sha256)) throw new Error('Invalid writer identity')
    return { version: record.version, sha256: record.sha256 }
  }
  async stage(file: string, version: string, channel: 'stable' | 'beta'): Promise<ManagedStage> {
    const receipt = await this.command(['stage', file, version, channel])
    if (!receipt.stageID || !receipt.expectedDigest) throw new Error('Writer returned no verified stage')
    const identity = this.identity(receipt)
    if (identity.version !== version) throw new Error('Staged release differs from requested update')
    return { id: receipt.stageID, baseline: receipt.expectedDigest, identity, channel }
  }
  async activate(stage: ManagedStage): Promise<ManagedIdentity> {
    return this.identity(await this.command(['activate', stage.id, stage.baseline, stage.channel]))
  }
  async status(): Promise<ManagedIdentity> { return this.identity(await this.command(['status'])) }
  async discard(stage: ManagedStage): Promise<void> { await this.command(['discard', stage.id]) }
}

/** Environment is only a hint; root-owned ancestors and the kernel attachment establish context. */
export function detectLinuxManagedInstall(): LinuxManagedInstall | null {
  if (process.platform !== 'linux' || !process.getuid || process.getuid() === 0) return null
  const uid = process.getuid()
  const root = `/opt/autobyteus-desktop/${uid}`
  const canonical = `${root}/app/AutoByteus.AppImage`
  if (process.env.APPIMAGE !== canonical) return null
  for (const directory of ['/opt', '/opt/autobyteus-desktop', root, `${root}/support`]) {
    const st = lstatSync(directory)
    if (!st.isDirectory() || st.uid !== 0 || (st.mode & 0o022) !== 0) throw new Error('Unprotected managed installation')
  }
  const store = lstatSync(`${root}/app`), image = lstatSync(canonical)
  if (!store.isDirectory() || !image.isFile() || store.uid === uid || store.uid === 0 || store.uid !== image.uid
    || (store.mode & 0o022) !== 0 || (image.mode & 0o022) !== 0) throw new Error('Invalid managed image ownership')
  const label = readFileSync('/proc/self/attr/current', 'utf8').trim()
  if (label !== `autobyteus-desktop-${uid} (unconfined)`) throw new Error('Managed application has no scoped kernel attachment')
  return new LinuxManagedInstall(path.join(path.dirname(process.execPath), 'autobyteus-install-client'))
}
