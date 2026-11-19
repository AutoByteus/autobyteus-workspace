import type { ApplicationShutdown } from './applicationShutdown'
import { ManagedStageGone, type ManagedStage, type LinuxManagedInstall } from '../updater/linuxManagedInstall'

type Settings = Readonly<{ automaticUpdate: boolean; updateChannel: 'stable' | 'beta' }>
type SessionOptions = Readonly<{
  writer: Pick<LinuxManagedInstall, 'stage' | 'activate' | 'status' | 'discard'>
  shutdown: ApplicationShutdown
  serverGone: () => boolean
  initialSettings: Settings
  notifyQuit: () => void
  quit: () => void
  exit: (code: number) => void
  requestReopen: (() => void) | null
  report: (error: unknown) => void
}>
export type ManagedUpdateEvent =
  | { type: 'restart-unavailable' }
  | { type: 'restart-write-failed' }
  | { type: 'ready'; version: string }
  | { type: 'invalidated' }
  | { type: 'verification-cancelled'; version: string }
  | { type: 'stage-gone'; version: string; automatic: boolean }
  | { type: 'activating'; version: string; automatic: boolean }
  | { type: 'stage-failed'; version: string; error: unknown }
  | { type: 'activation-failed'; version: string; error: unknown; automatic: boolean; confirmedOld: boolean }

/** Sole managed quit owner. Downloads never initiate shutdown; one independent quit or explicit restart does. */
export class ManagedUpdateSession {
  private generation = 0
  private pending: ManagedStage | null = null
  private verifying: number | null = null
  private intent: 'quit' | 'restart' | 'failed-restart' | null = null
  private automaticInstallBlockedVersion: string | null = null
  private passQuit = false
  private listeners = new Set<(event: ManagedUpdateEvent) => void>()
  private lastSettings: Settings
  constructor(private readonly options: SessionOptions) { this.lastSettings = options.initialSettings }
  onChange(listener: (event: ManagedUpdateEvent) => void): void { this.listeners.add(listener) }
  private emit(event: ManagedUpdateEvent): void { for (const listener of this.listeners) listener(event) }
  private discard(stage: ManagedStage): void { void this.options.writer.discard(stage).catch(this.options.report) }
  /** Updater-owned failure policy, independent of the visible notification outcome. */
  automaticInstallBlockChanged(version: string | null): void { this.automaticInstallBlockedVersion = version }
  async stageDownloaded(file: string, version: string): Promise<void> {
    if (this.intent !== null) return
    const generation = ++this.generation
    this.verifying = generation
    const channel = this.lastSettings.updateChannel
    if (this.pending) this.discard(this.pending)
    this.pending = null
    this.emit({ type: 'invalidated' })
    try {
      const stage = await this.options.writer.stage(file, version, channel)
      if (generation !== this.generation || this.intent !== null || this.lastSettings.updateChannel !== channel) {
        await this.options.writer.discard(stage).catch(this.options.report); return
      }
      this.pending = stage
      this.emit({ type: 'ready', version })
    } catch (error) {
      if (generation === this.generation) this.emit({ type: 'stage-failed', version, error })
    } finally {
      if (this.verifying === generation) {
        this.verifying = null
        if (this.intent === null && generation !== this.generation) this.emit({ type: 'verification-cancelled', version })
      }
    }
  }
  settingsChanged(current: Settings): void {
    if (current.updateChannel !== this.lastSettings.updateChannel || (!current.automaticUpdate && this.lastSettings.automaticUpdate)) {
      ++this.generation
      if (this.pending) this.discard(this.pending)
      this.pending = null
      this.emit({ type: 'invalidated' })
    }
    this.lastSettings = current
  }
  requestRestart(): { accepted: boolean } {
    if (!this.pending || this.intent !== null) return { accepted: false }
    if (!this.options.requestReopen) { this.emit({ type: 'restart-unavailable' }); return { accepted: false } }
    this.intent = 'restart'
    const stage = this.pending, generation = this.generation
    void this.finish(stage, generation, false)
    return { accepted: true }
  }
  willQuit(event: { preventDefault(): void }): void {
    if (this.passQuit) return
    event.preventDefault()
    if (this.intent === 'quit' || this.intent === 'restart') return
    // A settled manual failure allows exit, but no further update transaction in this process.
    const canActivate = this.intent === null
    this.intent = 'quit'
    // A late download cannot make this quit an install; capture readiness at this boundary.
    const stage = canActivate && this.lastSettings.automaticUpdate ? this.pending : null
    this.options.notifyQuit()
    void this.finish(stage, this.generation, true)
  }
  private async finish(stage: ManagedStage | null, generation: number, automatic: boolean): Promise<void> {
    try {
      try { await this.options.shutdown.stop() }
      catch (error) {
        if (automatic || !this.options.serverGone()) throw error
        this.options.shutdown.acceptIncompleteStopForInstall()
      }
      if (!this.options.serverGone()) throw new Error('Embedded server exit is not confirmed; no activation or relaunch')
      // No await separates preference/generation checks from activation dispatch.
      const settings = this.lastSettings
      if (stage && generation === this.generation && this.pending === stage && stage.channel === settings.updateChannel
        && (!automatic || (settings.automaticUpdate && stage.identity.version !== this.automaticInstallBlockedVersion))) {
        this.emit({ type: 'activating', version: stage.identity.version, automatic })
        try {
          const identity = await this.options.writer.activate(stage)
          if (identity.sha256 !== stage.identity.sha256) throw new Error('Writer committed an unexpected release')
        } catch (error) {
          // Lost reply is ambiguous; status hashes the live inode before reporting old or new.
          const actual = await this.options.writer.status()
          if (actual.sha256 === stage.baseline && error instanceof ManagedStageGone) {
            this.pending = null; ++this.generation
            this.emit({ type: 'stage-gone', version: stage.identity.version, automatic })
          } else if (actual.sha256 !== stage.identity.sha256) {
            this.emit({ type: 'activation-failed', version: stage.identity.version, error, automatic, confirmedOld: actual.sha256 === stage.baseline })
            if (actual.sha256 !== stage.baseline) throw new Error('Activation outcome requires repair')
          }
        }
      } else if (!automatic && (!stage || (await this.options.writer.status()).sha256 !== stage.baseline)) {
        throw new Error('Cancelled restart baseline could not be confirmed')
      }
      if (automatic) { this.passQuit = true; this.options.quit(); return }
      try { this.options.requestReopen!() }
      catch (error) {
        this.pending = null; ++this.generation
        this.intent = 'failed-restart'
        this.options.report(error)
        this.emit({ type: 'restart-write-failed' })
        return
      }
      this.passQuit = true
      this.options.exit(76)
    } catch (error) {
      this.options.report(error)
      if (stage) this.emit({ type: 'activation-failed', version: stage.identity.version, error, automatic, confirmedOld: false })
      // Existing ordinary shutdown failure behavior is terminal. An unknown manual
      // activation outcome must not create a second server or claim a successful restart.
      if (automatic) this.options.exit(1)
      else {
        this.pending = null; ++this.generation
        this.intent = 'failed-restart'
      }
    }
  }
}
