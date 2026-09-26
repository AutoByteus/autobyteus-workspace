import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";

const STDERR_TAIL_LIMIT = 4096;
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
 * a bounded stderr tail kept for diagnostics only, exit detection and stop.
 */
export class AcpAgentProcess {
  private readonly exitListeners = new Set<(exit: AcpAgentProcessExit) => void>();
  private exitInfo: AcpAgentProcessExit | null = null;
  private stderr = "";
  readonly output: WritableStream<Uint8Array>;
  readonly input: ReadableStream<Uint8Array>;

  private constructor(private readonly child: ChildProcessWithoutNullStreams) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      this.stderr = (this.stderr + chunk).slice(-STDERR_TAIL_LIMIT);
    });
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

  /** Diagnostics only; never surfaced to users because it may contain paths or secrets. */
  stderrTail(): string { return this.stderr; }

  onExit(listener: (exit: AcpAgentProcessExit) => void): () => void {
    if (this.exitInfo) {
      listener(this.exitInfo);
      return () => undefined;
    }
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  /** Closes stdin, then SIGTERM, then SIGKILL after a short grace period. */
  async stop(): Promise<void> {
    if (this.exitInfo) return;
    const exited = new Promise<void>((resolve) => this.onExit(() => resolve()));
    this.child.stdin.end();
    this.child.kill("SIGTERM");
    const timer = setTimeout(() => { if (!this.exitInfo) this.child.kill("SIGKILL"); }, STOP_GRACE_MS);
    try { await exited; } finally { clearTimeout(timer); }
  }

  private recordExit(exit: AcpAgentProcessExit): void {
    if (this.exitInfo) return;
    this.exitInfo = exit;
    for (const listener of this.exitListeners) listener(exit);
    this.exitListeners.clear();
  }
}
