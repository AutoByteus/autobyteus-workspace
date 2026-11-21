import type { SafeRestartMoment } from '../updater/safeRestartMoment'
import type { ApplicationShutdown } from './applicationShutdown'
import { ManagedStageGone, type ManagedStage, type LinuxManagedInstall } from '../updater/linuxManagedInstall'

type Settings = Readonly<{ automaticUpdate: boolean; updateChannel: 'stable' | 'beta' }>
type Activation = Readonly<{ consent: 'automatic' | 'manual'; ending: 'quit' | 'reopen' }>
type SessionOptions = Readonly<{
  restartMoment: Pick<SafeRestartMoment, 'watch' | 'cancel'>
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

/** Sole managed quit owner. A verified stage may be activated by one safe restart, explicit restart or quit. */
export class ManagedUpdateSession {
  private generation = 0
  private pending: ManagedStage | null = null
  private verifying: number | null = null
  private intent: 'quit' | 'restart' | 'failed-restart' | null = null
  private automaticInstallBlockedVersion: string | null = null
  private quitLatched = false
  private passQuit = false
  private listeners = new Set<(event: ManagedUpdateEvent) => void>()
  private lastSettings: Settings
  constructor(private readonly options: SessionOptions) { this.lastSettings = options.initialSettings }
  onChange(listener: (event: ManagedUpdateEvent) => void): void { this.listeners.add(listener) }
  private emit(event: ManagedUpdateEvent): void { for (const listener of this.listeners) listener(event) }
  private discard(stage: ManagedStage): void { void this.options.writer.discard(stage).catch(this.options.report) }
  /** Updater-owned failure policy, independent of the visible notification outcome. */
  automaticInstallBlockChanged(version: string | null): void {
    if (this.automaticInstallBlockedVersion === version) return
    this.automaticInstallBlockedVersion = version
    this.watchForRestart()
  }
  get canReopen(): boolean { return !!this.options.requestReopen }
  get passingQuit(): boolean { return this.passQuit }
  quitRequested(): void { this.quitLatched = true; this.options.restartMoment.cancel() }
  private watchForRestart(): void {
    this.options.restartMoment.cancel()
    const stage = this.pending, generation = this.generation
    const eligible = () => stage !== null && this.pending === stage && this.generation === generation && this.canReopen &&
      this.intent === null && !this.quitLatched && this.lastSettings.automaticUpdate &&
      this.lastSettings.updateChannel === stage.channel && this.automaticInstallBlockedVersion !== stage.identity.version
    if (stage && eligible()) this.options.restartMoment.watch(() => {
      if (!eligible()) return
      this.intent = 'restart'
      void this.finish(stage, generation, { consent: 'automatic', ending: 'reopen' })
    })
  }
  async stageDownloaded(file: string, version: string): Promise<void> {
    if (this.intent !== null || this.quitLatched) return
    this.options.restartMoment.cancel()
    const generation = ++this.generation
    this.verifying = generation
    const channel = this.lastSettings.updateChannel
    if (this.pending) this.discard(this.pending)
    this.pending = null
    this.emit({ type: 'invalidated' })
    try {
      const stage = await this.options.writer.stage(file, version, channel)
      if (generation !== this.generation || this.intent !== null || this.quitLatched || this.lastSettings.updateChannel !== channel) {
        await this.options.writer.discard(stage).catch(this.options.report); return
      }
      this.pending = stage
      this.emit({ type: 'ready', version })
      this.watchForRestart()
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
    const changed = current.automaticUpdate !== this.lastSettings.automaticUpdate || current.updateChannel !== this.lastSettings.updateChannel
    if (current.updateChannel !== this.lastSettings.updateChannel || (!current.automaticUpdate && this.lastSettings.automaticUpdate)) {
      ++this.generation
      if (this.pending) this.discard(this.pending)
      this.pending = null
      this.emit({ type: 'invalidated' })
    }
    this.lastSettings = current
    if (changed) this.watchForRestart()
  }
  requestRestart(): { accepted: boolean } {
    if (!this.pending || this.intent !== null || this.quitLatched) return { accepted: false }
    if (!this.options.requestReopen) { this.emit({ type: 'restart-unavailable' }); return { accepted: false } }
    this.options.restartMoment.cancel()
    this.intent = 'restart'
    const stage = this.pending, generation = this.generation
    void this.finish(stage, generation, { consent: 'manual', ending: 'reopen' })
    return { accepted: true }
  }
  willQuit(event: { preventDefault(): void }): void {
    if (this.passQuit) return
    this.quitRequested()
    event.preventDefault()
    if (this.intent === 'quit' || this.intent === 'restart') return
    // A settled manual failure allows exit, but no further update transaction in this process.
    const canActivate = this.intent === null
    this.intent = 'quit'
    // A late download cannot make this quit an install; capture readiness at this boundary.
    const stage = canActivate && this.lastSettings.automaticUpdate ? this.pending : null
    this.options.notifyQuit()
    void this.finish(stage, this.generation, { consent: 'automatic', ending: 'quit' })
  }
  private async finish(stage: ManagedStage | null, generation: number, { consent, ending }: Activation): Promise<void> {
    const automatic = consent === 'automatic'
    try {
      try { await this.options.shutdown.stop() }
      catch (error) {
        if (ending === 'quit' || !this.options.serverGone()) throw error
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
      } else if (ending === 'reopen' && (!stage || (await this.options.writer.status()).sha256 !== stage.baseline)) {
        throw new Error('Cancelled restart baseline could not be confirmed')
      }
      if (ending === 'quit' || this.quitLatched) { this.passQuit = true; this.options.quit(); return }
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
      if (ending === 'quit' || this.quitLatched) this.options.exit(1)
      else {
        this.pending = null; ++this.generation
        this.intent = 'failed-restart'
      }
    }
  }
}
