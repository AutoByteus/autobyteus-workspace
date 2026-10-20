import { spawn, type ChildProcess } from "node:child_process";

export const OPERATION_TIMEOUT_MS = 10 * 60_000;
const OUTPUT_LIMIT = 4 * 1024;
const KILL_GRACE_MS = 3_000;
// CSI/OSC escape sequences and other C0 controls except tab, line feed, carriage return and a
// lone ESC (kept until the rest of a sequence split across two chunks arrives).
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b[@-Z\\-_]|[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f]/g;

export const stripAnsi = (text: string): string => text.replace(ANSI_PATTERN, "");

export type RuntimeProcessResult = Readonly<{
  exitCode: number | null;
  /** The process's combined output, ANSI stripped, its last 4 KB. */
  output: string;
  cancelled: boolean;
  timedOut: boolean;
}>;

/**
 * One vendor process (update or login): started with the server's environment and no stdin,
 * it always ends — on its own exit, on cancel, on its time-out or on server close (QR-003).
 */
export class RuntimeProcessOperation {
  readonly finished: Promise<RuntimeProcessResult>;
  private readonly child: ChildProcess | null;
  private output = "";
  private cancelled = false;
  private timedOut = false;
  private exited = false;
  private killTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(argv: readonly string[], options: Readonly<{ timeoutMs?: number }> = {}) {
    const [command, ...args] = argv;
    let resolveFinished!: (result: RuntimeProcessResult) => void;
    this.finished = new Promise((resolve) => { resolveFinished = resolve; });
    const finish = (exitCode: number | null) => {
      if (this.exited) return;
      this.exited = true;
      clearTimeout(timeout);
      if (this.killTimer) clearTimeout(this.killTimer);
      resolveFinished({ exitCode, output: this.output.trim(), cancelled: this.cancelled, timedOut: this.timedOut });
    };
    const timeout = setTimeout(() => {
      this.timedOut = true;
      this.stop();
    }, options.timeoutMs ?? OPERATION_TIMEOUT_MS);
    try {
      this.child = spawn(command!, args, { env: process.env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      this.child = null;
      this.append(error instanceof Error ? error.message : String(error));
      finish(null);
      return;
    }
    const collect = (chunk: Buffer) => this.append(chunk.toString("utf8"));
    this.child.stdout!.on("data", collect);
    this.child.stderr!.on("data", collect);
    this.child.once("error", (error) => {
      this.append(error.message);
      finish(null);
    });
    this.child.once("close", (code) => finish(code));
  }

  /** The last non-empty output line so far (progress bars overwrite their line with `\r`). */
  latestLine(): string | null {
    const lines = this.output.split(/[\r\n]+/).map((line) => line.trim()).filter(Boolean);
    return lines.at(-1) ?? null;
  }

  /** Stops the process: SIGTERM, then SIGKILL if it is still running after 3 s. */
  cancel(): void {
    this.cancelled = true;
    this.stop();
  }

  private stop(): void {
    if (this.exited || !this.child) return;
    this.child.kill("SIGTERM");
    this.killTimer ??= setTimeout(() => { if (!this.exited) this.child?.kill("SIGKILL"); }, KILL_GRACE_MS);
  }

  private append(text: string): void {
    this.output = stripAnsi(this.output + text).slice(-OUTPUT_LIMIT);
  }
}
