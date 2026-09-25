import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { antigravityCommand } from "../../../../runtime-management/antigravity-cli-capability.js";
import { parseAgyStreamMessage, type AgyStreamMessage } from "./agy-stream-message.js";

const MAX_LINE = 2 * 1024 * 1024;
const MAX_STDERR = 4096;
const TURN_IDLE_TIMEOUT_MS = 300_000;

export class AgyStreamProcess {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";
  private stderrTail = "";
  private listeners = new Set<(message: AgyStreamMessage) => void>();
  private closeListeners = new Set<(error: Error) => void>();
  private startupResolve: ((message: Extract<AgyStreamMessage, { event: "init" }>) => void) | null = null;
  private startupReject: ((error: Error) => void) | null = null;
  private initSeen = false;
  private turnIdleTimer: ReturnType<typeof setTimeout> | null = null;

  async start(input: {
    capsulePath: string; agentName: string; workspacePath: string;
    model: string; autoExecuteTools: boolean; conversationId: string | null;
  }): Promise<Extract<AgyStreamMessage, { event: "init" }>> {
    if (this.child) throw new Error("AGY_PROCESS_ALREADY_STARTED");
    const argv = [
      ...(input.conversationId ? ["--conversation", input.conversationId] : ["--new-project"]),
      "--agent", input.agentName, "--add-dir", input.workspacePath,
      "--model", input.model, "--input-format", "stream-json", "--output-format", "stream-json",
      ...(input.autoExecuteTools ? ["--dangerously-skip-permissions"] : []),
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
    this.resetTurnIdleTimer();
    try { await new Promise<void>((resolve, reject) => child.stdin.write(line, (error) => error ? reject(error) : resolve())); }
    catch (error) { this.clearTurnIdleTimer(); throw error; }
  }

  stop(): void {
    this.clearTurnIdleTimer();
    this.child?.kill("SIGTERM");
    this.child = null;
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
        if (message.event === "result") this.clearTurnIdleTimer();
        else if (this.turnIdleTimer) this.resetTurnIdleTimer();
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

  private resetTurnIdleTimer(): void {
    this.clearTurnIdleTimer();
    this.turnIdleTimer = setTimeout(() => this.fail(new Error("AGY_TURN_IDLE_TIMEOUT: no provider event for five minutes.")), TURN_IDLE_TIMEOUT_MS);
  }

  private clearTurnIdleTimer(): void {
    if (this.turnIdleTimer) clearTimeout(this.turnIdleTimer);
    this.turnIdleTimer = null;
  }
}
