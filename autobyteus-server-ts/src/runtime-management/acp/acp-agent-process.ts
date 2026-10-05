import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";

const STOP_GRACE_MS = 2_000;

export type AcpAgentProcessSpec = Readonly<{
  command: string;
  args: readonly string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
}>;

export type AcpAgentProcessExit = Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
  /** Spawn failure (for example ENOENT); null for an ordinary exit. */
  spawnErrorCode: string | null;
}>;

/**
 * Owns one ACP agent child process: spawn, Node-to-Web stream bridging for the SDK,
 * stderr draining (agent output is never surfaced), exit detection and stop.
 */
export class AcpAgentProcess {
  private readonly exitListeners = new Set<(exit: AcpAgentProcessExit) => void>();
  private stopAttempt: Promise<void> | null = null;
  private exitInfo: AcpAgentProcessExit | null = null;
  readonly output: WritableStream<Uint8Array>;
  readonly input: ReadableStream<Uint8Array>;

  private constructor(private readonly child: ChildProcessWithoutNullStreams) {
    // Drained so the child never blocks on a full pipe; the content may hold paths or secrets.
    child.stderr.resume();
    // Writes after exit fail with EPIPE; the connection observes the close instead.
    child.stdin.on("error", () => undefined);
    child.once("error", (error: NodeJS.ErrnoException) =>
      this.recordExit({ code: null, signal: null, spawnErrorCode: error.code ?? "SPAWN_FAILED" }));
    child.once("close", (code, signal) => this.recordExit({ code, signal, spawnErrorCode: null }));
    this.output = Writable.toWeb(child.stdin) as WritableStream<Uint8Array>;
    this.input = Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;
  }

  static spawn(spec: AcpAgentProcessSpec): AcpAgentProcess {
    return new AcpAgentProcess(spawn(spec.command, [...spec.args], {
      cwd: spec.cwd, env: spec.env, shell: false, stdio: ["pipe", "pipe", "pipe"],
    }));
  }

  get exited(): AcpAgentProcessExit | null { return this.exitInfo; }

  onExit(listener: (exit: AcpAgentProcessExit) => void): () => void {
    if (this.exitInfo) {
      listener(this.exitInfo);
      return () => undefined;
    }
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  /** Closes stdin, then SIGTERM, then SIGKILL after a short grace period. */
  stop(): Promise<void> {
    if (this.exitInfo) return Promise.resolve();
    if (this.stopAttempt) return this.stopAttempt;
    const attempt = this.stopOnce();
    this.stopAttempt = attempt;
    void attempt.finally(() => { if (this.stopAttempt === attempt) this.stopAttempt = null; }).catch(() => undefined);
    return attempt;
  }

  private async stopOnce(): Promise<void> {
    let unregister = () => undefined as void;
    const exited = new Promise<void>((resolve) => { unregister = this.onExit(() => resolve()); });
    this.child.stdin.end();
    this.child.kill("SIGTERM");
    const kill = setTimeout(() => { if (!this.exitInfo) this.child.kill("SIGKILL"); }, STOP_GRACE_MS);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([exited, new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("ACP exact process exit could not be confirmed.")), 5_000);
      })]);
    } finally { clearTimeout(kill); clearTimeout(timeout); unregister(); }
  }

  private recordExit(exit: AcpAgentProcessExit): void {
    if (this.exitInfo) return;
    this.exitInfo = exit;
    for (const listener of this.exitListeners) listener(exit);
    this.exitListeners.clear();
  }
}
