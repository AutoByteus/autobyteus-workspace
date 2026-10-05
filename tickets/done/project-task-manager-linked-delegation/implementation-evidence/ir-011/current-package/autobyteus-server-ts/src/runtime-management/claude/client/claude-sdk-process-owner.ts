import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { StringDecoder } from "node:string_decoder";
import type { SpawnOptions, SpawnedProcess } from "@anthropic-ai/claude-agent-sdk";

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const waitUntil = async (test: () => boolean, deadline: number) => {
  while (!test() && Date.now() < deadline) await pause(Math.min(20, deadline - Date.now()));
  return test();
};

/** Exact Node ownership, distinct from the SDK's best-effort Query cleanup. No PID lookup. */
export class ClaudeSdkProcessOwner {
  private receipts: ClaudeSdkChildReceipt[] = [];
  private cancelled = false;
  private releaseAttempt: Promise<void> | null = null;
  private released = false;

  constructor(private readonly stderr: (text: string) => void = () => undefined) {}

  readonly spawn = (options: SpawnOptions): SpawnedProcess => {
    if (this.cancelled) throw new Error("CLAUDE_OPENING_CLOSED: No late SDK process acquisition.");
    // Receipt exists before spawn; child is attached before any diagnostic/facade setup.
    const receipt = new ClaudeSdkChildReceipt(this.stderr);
    this.receipts.push(receipt);
    return receipt.acquire(options);
  };

  cancel(): void {
    this.cancelled = true;
    for (const receipt of this.receipts) receipt.requestEof();
  }

  release(deadline = Date.now() + 10_000): Promise<void> {
    this.cancel();
    if (this.released) return Promise.resolve();
    if (this.releaseAttempt) return this.releaseAttempt;
    const attempt = (async () => {
      const results = await Promise.allSettled(this.receipts.map(receipt => receipt.release(deadline)));
      const errors = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
      if (errors.length) throw new AggregateError(errors, "CLAUDE_CHILD_RELEASE_FAILED: Exact child/IO proof pending.");
      this.released = true;
      this.receipts = [];
    })();
    this.releaseAttempt = attempt;
    void attempt.finally(() => { if (this.releaseAttempt === attempt) this.releaseAttempt = null; }).catch(() => undefined);
    return attempt;
  }
}

/** Public SDK facade: physical exit immediately, SDK exit after final stderr drain. */
class ClaudeSdkChildReceipt extends EventEmitter implements SpawnedProcess {
  private child: ChildProcessWithoutNullStreams | null = null;
  private spawned = false;
  private creationFailed = false;
  private physicalExit = false;
  private nodeClosed = false;
  private stderrClosed = false;
  private sdkExitDelivered = false;
  private eofAt: number | null = null;
  private releaseProof = false;
  private tail = "";
  private readonly decoder = new StringDecoder("utf8");
  private exitDeliveryTimer: ReturnType<typeof setTimeout> | undefined;
  private finalExitCode: number | null = null;
  private finalSignalCode: NodeJS.Signals | null = null;
  private finalKilled = false;
  private lastSignal: { signal: NodeJS.Signals; at: number; result: boolean } | null = null;
  private streams: ChildProcessWithoutNullStreams | null = null;
  private readonly callbackFaults: unknown[] = [];

  constructor(private readonly onStderr: (text: string) => void) {
    super();
    // Node may emit a spawn error before the SDK installs its listener; retain/forward it.
    this.on("error", () => undefined);
  }

  get stdin() { return this.requireStreams().stdin; }
  get stdout() { return this.requireStreams().stdout; }
  get killed() { return this.child?.killed ?? this.finalKilled; }
  get exitCode() { return this.child?.exitCode ?? this.finalExitCode; }
  get signalCode() { return this.child?.signalCode ?? this.finalSignalCode; }

  acquire(options: SpawnOptions): SpawnedProcess {
    try {
      const child = spawn(options.command, options.args, {
        cwd: options.cwd, env: options.env, signal: options.signal,
        stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
      });
      this.child = child;
      this.streams = child;
      child.on("spawn", this.onSpawn);
      child.on("error", this.onError);
      child.on("exit", this.onExit);
      child.on("close", this.onClose);
      child.stderr.on("data", this.onStderrData);
      child.stderr.on("error", this.onStderrError);
      child.stderr.on("close", this.onStderrClose);
      return this;
    } catch (error) {
      // Only a thrown spawn with no attached child proves never-started.
      // A post-acquisition setup fault must retain actual exit/IO authority.
      if (!this.child) { this.creationFailed = true; this.nodeClosed = true; }
      throw error;
    }
  }

  kill(signal: NodeJS.Signals): boolean {
    if (this.provenInactive()) return false;
    const child = this.child;
    if (!child) return false;
    // SDK and application deadlines can signal in the same tick. Retry is not memoized.
    const previous = this.lastSignal;
    if (previous?.signal === signal && Date.now() - previous.at < 50) return previous.result;
    const result = child.kill(signal);
    this.lastSignal = { signal, at: Date.now(), result };
    return result;
  }

  requestEof(): void {
    this.eofAt ??= Date.now();
    try { this.child?.stdin.end(); } catch (error) { if (this.callbackFaults.length < 10) this.callbackFaults.push(error); }
  }

  async release(deadline: number): Promise<void> {
    if (this.releaseProof) return;
    this.requestEof();
    await waitUntil(() => this.provenInactive(), Math.min(deadline, this.eofAt! + 2_000));
    const signalFaults: unknown[] = [];
    const signal = (value: NodeJS.Signals) => {
      try { if (!this.kill(value) && !this.provenInactive()) signalFaults.push(new Error(`Claude ${value} returned false without exit.`)); }
      catch (error) { signalFaults.push(error); }
    };
    if (!this.provenInactive()) {
      if (process.platform !== "win32") signal("SIGTERM");
      await waitUntil(() => this.provenInactive(), Math.min(deadline, Date.now() + 5_000));
    }
    if (!this.provenInactive()) {
      signal("SIGKILL");
      await waitUntil(() => this.provenInactive(), Math.min(deadline, Date.now() + 2_000));
    }
    if (!this.provenInactive()) throw new AggregateError(signalFaults, "Claude exact child has no exit/failed-spawn proof before deadline.");
    if (!this.child) { this.releaseProof = true; return; } // synchronous spawn rejection
    await waitUntil(() => this.stderrClosed, Math.min(deadline, Date.now() + 200));
    this.deliverSdkExit();
    const streams = [this.child.stdin, this.child.stdout, this.child.stderr];
    const closed = new Set(streams.filter(stream => stream.closed));
    const listeners = streams.map(stream => {
      const observe = () => { closed.add(stream); };
      stream.once("close", observe);
      return { stream, observe };
    });
    try {
      for (const stream of streams) stream.destroy();
      if (!await waitUntil(() => closed.size === streams.length, deadline)) throw new Error("Claude owned IO close proof pending.");
    } finally { for (const { stream, observe } of listeners) stream.off("close", observe); }
    const child = this.child;
    this.finalExitCode = child.exitCode; this.finalSignalCode = child.signalCode; this.finalKilled = child.killed;
    child.off("spawn", this.onSpawn); child.off("error", this.onError);
    child.off("exit", this.onExit); child.off("close", this.onClose);
    child.stderr.off("data", this.onStderrData); child.stderr.off("error", this.onStderrError); child.stderr.off("close", this.onStderrClose);
    clearTimeout(this.exitDeliveryTimer);
    this.child = null; this.streams = null; this.tail = ""; this.callbackFaults.length = 0;
    this.removeAllListeners();
    this.releaseProof = true;
  }

  private provenInactive(): boolean { return this.physicalExit || (!this.spawned && this.creationFailed && this.nodeClosed); }
  private requireStreams() {
    if (!this.streams) throw new Error("Claude SDK process IO is released.");
    return this.streams;
  }
  private readonly onSpawn = () => { this.spawned = true; };
  private readonly onError = (error: Error) => {
    if (!this.spawned) this.creationFailed = true;
    try { this.emit("error", error); } catch (fault) { if (this.callbackFaults.length < 10) this.callbackFaults.push(fault); }
  };
  private readonly onExit = (code: number | null, signal: NodeJS.Signals | null) => {
    this.physicalExit = true; this.finalExitCode = code; this.finalSignalCode = signal;
    if (this.stderrClosed) this.deliverSdkExit();
    else this.exitDeliveryTimer = setTimeout(() => this.deliverSdkExit(), 200);
  };
  private readonly onClose = () => { this.nodeClosed = true; };
  private readonly onStderrData = (chunk: Buffer) => { this.appendStderr(this.decoder.write(chunk)); };
  private readonly onStderrError = (error: Error) => { if (this.callbackFaults.length < 10) this.callbackFaults.push(error); };
  private readonly onStderrClose = () => {
    this.appendStderr(this.decoder.end()); this.stderrClosed = true;
    if (this.physicalExit) this.deliverSdkExit();
  };
  private appendStderr(text: string): void {
    // Bound the copy even when a single read chunk is large; callback remains the app diagnostics owner.
    this.tail = (this.tail + text.slice(-4096)).slice(-2048);
    try { this.onStderr(text); } catch (error) { if (this.callbackFaults.length < 10) this.callbackFaults.push(error); }
  }
  private deliverSdkExit(): void {
    if (!this.physicalExit || this.sdkExitDelivered) return;
    this.sdkExitDelivered = true;
    clearTimeout(this.exitDeliveryTimer);
    try { this.emit("exit", this.finalExitCode, this.finalSignalCode); } catch (fault) { if (this.callbackFaults.length < 10) this.callbackFaults.push(fault); }
  }
}
