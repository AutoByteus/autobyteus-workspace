import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { antigravityCommand } from "../../../../runtime-management/antigravity-cli-capability.js";
import { parseAgyStreamMessage, type AgyStreamMessage } from "./agy-stream-message.js";
import { listAgyBackgroundProcessGroups, signalProcessGroups } from "./agy-background-process-groups.js";

const MAX_LINE = 2 * 1024 * 1024;
const MAX_STDERR = 4096;
const BACKGROUND_GROUP_KILL_DELAY_MS = 1_500;

export class AgyStreamProcess {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";
  private stderrTail = "";
  private listeners = new Set<(message: AgyStreamMessage) => void>();
  private closeListeners = new Set<(error: Error) => void>();
  private startupResolve: ((message: Extract<AgyStreamMessage, { event: "init" }>) => void) | null = null;
  private startupReject: ((error: Error) => void) | null = null;
  private initSeen = false;

  async start(input: {
    capsulePath: string; agentName: string; workspacePath: string;
    model: string; conversationId: string | null;
  }): Promise<Extract<AgyStreamMessage, { event: "init" }>> {
    if (this.child) throw new Error("AGY_PROCESS_ALREADY_STARTED");
    const argv = [
      ...(input.conversationId ? ["--conversation", input.conversationId] : ["--new-project"]),
      "--agent", input.agentName, "--add-dir", input.workspacePath,
      "--model", input.model, "--input-format", "stream-json", "--output-format", "stream-json",
      // Always auto-approve: linked skill folders live outside the capsule and headless AGY
      // cannot prompt for the reads it would otherwise deny.
      "--dangerously-skip-permissions",
    ];
    const promise = new Promise<Extract<AgyStreamMessage, { event: "init" }>>((resolve, reject) => {
      this.startupResolve = resolve; this.startupReject = reject;
    });
    const child = spawn(antigravityCommand(), argv, { cwd: input.capsulePath, shell: false, stdio: ["pipe", "pipe", "pipe"] });
    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.acceptStdout(chunk));
    child.stderr.on("data", (chunk: string) => { this.stderrTail = (this.stderrTail + chunk).slice(-MAX_STDERR); });
    child.on("error", (error) => this.fail(error));
    child.on("close", (code, signal) => this.fail(new Error(`AGY process exited (${code ?? signal ?? "unknown"}): ${this.stderrTail}`)));
    const timer = setTimeout(() => this.fail(new Error("AGY_STARTUP_TIMEOUT: no init message.")), 60_000);
    try { return await promise; }
    finally { clearTimeout(timer); }
  }

  subscribe(listener: (message: AgyStreamMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onClose(listener: (error: Error) => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  async sendUserMessage(content: string): Promise<void> {
    const child = this.child;
    if (!child || !this.initSeen || !child.stdin.writable) throw new Error("AGY_PROCESS_NOT_READY");
    const line = `${JSON.stringify({ event: "user", message: { content } })}\n`;
    await new Promise<void>((resolve, reject) => child.stdin.write(line, (error) => error ? reject(error) : resolve()));
  }

  /**
   * Stops AGY and, while AGY is still alive, the background process groups it started (daemons survive
   * a SIGTERM of AGY alone). If AGY already exited on its own its groups can no longer be found.
   */
  stop(): void {
    const child = this.child;
    this.child = null;
    if (!child) return;
    let groups: number[] = [];
    if (child.exitCode === null && child.signalCode === null && child.pid) {
      try {
        groups = listAgyBackgroundProcessGroups(child.pid);
        signalProcessGroups(groups, "SIGTERM");
      } catch (error) {
        console.warn("AGY_BACKGROUND_GROUP_STOP_FAILED", error instanceof Error ? error.message : String(error));
      }
    }
    child.kill("SIGTERM");
    if (groups.length) setTimeout(() => signalProcessGroups(groups, "SIGKILL"), BACKGROUND_GROUP_KILL_DELAY_MS).unref();
  }

  private acceptStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    while (true) {
      const newline = this.stdoutBuffer.indexOf("\n");
      if (newline < 0) {
        if (this.stdoutBuffer.length > MAX_LINE) this.fail(new Error("AGY_STREAM_LINE_TOO_LONG"));
        return;
      }
      if (newline > MAX_LINE) { this.fail(new Error("AGY_STREAM_LINE_TOO_LONG")); return; }
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      try {
        const message = parseAgyStreamMessage(line);
        if (!message) continue;
        if (message.event === "init") {
          if (this.initSeen) throw new Error("AGY_STREAM_DUPLICATE_INIT");
          this.initSeen = true;
          this.startupResolve?.(message);
          this.startupResolve = null; this.startupReject = null;
        } else if (!this.initSeen) throw new Error("AGY_STREAM_BEFORE_INIT");
        for (const listener of this.listeners) listener(message);
      } catch (error) { this.fail(error instanceof Error ? error : new Error(String(error))); return; }
    }
  }

  private fail(error: Error): void {
    this.startupReject?.(error);
    this.startupResolve = null; this.startupReject = null;
    for (const listener of this.closeListeners) listener(error);
    this.stop();
  }
}
