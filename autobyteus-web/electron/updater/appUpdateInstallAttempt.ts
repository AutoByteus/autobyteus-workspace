/** The stop starts this long after the install is accepted, so the caller's state reaches the windows first. */
const INSTALL_START_DELAY_MS = 100;

type InstallSteps = Readonly<{
  prepare: () => Promise<void> | void;
  quitAndInstall: () => void;
  /** `quitAndInstall` was called and did not throw. */
  onQuitRequested: () => void;
  onFailed: (error: unknown) => void;
}>;

/**
 * One accepted install: the short delay, the preparation (which stops the server), then `quitAndInstall`. A failed
 * automatic install settles it with `abort` before anything is decided from the state of the server (autobyteus-356,
 * CRR-002 F-API-002): a native refusal can arrive while the preparation is still stopping the server.
 */
export class AppUpdateInstallAttempt {
  private delay: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private aborted = false;

  constructor(private readonly steps: InstallSteps) {
    this.delay = setTimeout(() => {
      this.delay = null;
      this.running = this.run();
    }, INSTALL_START_DELAY_MS);
  }

  /**
   * No further step runs. Resolves when nothing is in flight any more: `false` when the delay was cancelled and nothing
   * had stopped, `true` when the install had begun (its preparation has now ended, however it ended).
   */
  async abort(): Promise<boolean> {
    this.aborted = true;
    if (this.delay) {
      clearTimeout(this.delay);
      this.delay = null;
      return false;
    }
    await this.running;
    return true;
  }

  private async run(): Promise<void> {
    try {
      await this.steps.prepare();
      if (this.aborted) return;
      this.steps.quitAndInstall();
      this.steps.onQuitRequested();
    } catch (error) {
      this.steps.onFailed(error);
    }
  }
}
