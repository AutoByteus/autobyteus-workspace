import { autoUpdater as nativeUpdater } from 'electron';

/** A wait for the system updater ends as a failure after this long. Nothing has stopped, so only time is at stake. */
export const INSTALL_READY_BOUND_MS = 15 * 60_000;

type ReadinessOptions = Readonly<{
  platform: NodeJS.Platform;
  /** The system updater has its copy of the version waited for. */
  onReady: (version: string) => void;
  /** The bound passed with the wait still pending. */
  onBoundExpired: (version: string) => void;
}>;

/**
 * Whether the latest download is ready to install (autobyteus-356, DS-002). On macOS, electron-updater reports a download
 * before Squirrel has fetched, unpacked and verified its copy, and a native refusal arrives only then: Electron's own
 * `update-downloaded` says it is done. Other platforms have no second step. This reads only that public event.
 */
export class AppUpdateInstallReadiness {
  private downloadedVersion: string | null = null;
  private nativeReady = false;
  private waitingVersion: string | null = null;
  private boundTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: ReadinessOptions) {}

  private get hasSecondStep(): boolean { return this.options.platform === 'darwin'; }

  start(): void {
    if (this.hasSecondStep) nativeUpdater.on('update-downloaded', () => this.nativeDownloaded());
  }

  /** electron-updater reported a download of `version`: on macOS its native answer comes later, also for a cached re-emit. */
  downloadReported(version: string | null): void {
    this.downloadedVersion = version;
    this.nativeReady = false;
  }

  readyFor(version: string): boolean {
    return this.downloadedVersion === version && (!this.hasSecondStep || this.nativeReady);
  }

  get pendingVersion(): string | null { return this.waitingVersion; }

  /** One pending wait for `version`, with its bound. */
  wait(version: string): void {
    this.endWait();
    this.waitingVersion = version;
    this.boundTimer = setTimeout(() => {
      this.endWait();
      this.options.onBoundExpired(version);
    }, INSTALL_READY_BOUND_MS);
  }

  endWait(): void {
    if (this.boundTimer) clearTimeout(this.boundTimer);
    this.boundTimer = null;
    this.waitingVersion = null;
  }

  private nativeDownloaded(): void {
    this.nativeReady = true;
    const version = this.waitingVersion;
    if (!version) return;
    this.endWait();
    this.options.onReady(version);
  }
}
