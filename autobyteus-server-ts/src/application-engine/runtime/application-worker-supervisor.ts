import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";

type WorkerExitListener = (event: {
  code: number | null;
  signal: NodeJS.Signals | null;
  expected: boolean;
}) => void;

const resolveWorkerEntryPath = (): { entryPath: string; useStripTypes: boolean } => {
  const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    { entryPath: path.resolve(runtimeDir, "../worker/application-worker-entry.js"), useStripTypes: false },
    { entryPath: path.resolve(runtimeDir, "../../../dist/application-engine/worker/application-worker-entry.js"), useStripTypes: false },
    { entryPath: path.resolve(runtimeDir, "../worker/application-worker-entry.ts"), useStripTypes: true },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.entryPath)) {
      return candidate;
    }
  }

  throw new Error("Application worker entrypoint could not be resolved.");
};

export class ApplicationWorkerSupervisor {
  private process: ChildProcessWithoutNullStreams | null = null;
  private expectedExitProcess: ChildProcessWithoutNullStreams | null = null;
  private readonly exitListeners = new Set<WorkerExitListener>();

  onExit(listener: WorkerExitListener): () => void {
    this.exitListeners.add(listener);
    return () => {
      this.exitListeners.delete(listener);
    };
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  start(input: {
    cwd: string;
    stdoutLogPath: string;
    stderrLogPath: string;
    env?: Record<string, string>;
  }): ChildProcessWithoutNullStreams {
    if (this.process) {
      return this.process;
    }

    fs.mkdirSync(path.dirname(input.stdoutLogPath), { recursive: true });
    fs.mkdirSync(path.dirname(input.stderrLogPath), { recursive: true });

    const { entryPath, useStripTypes } = resolveWorkerEntryPath();
    const args = useStripTypes ? ["--experimental-strip-types", entryPath] : [entryPath];
    const child = spawn(process.execPath, args, {
      cwd: input.cwd,
      env: {
        ...process.env,
        ...input.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutStream = fs.createWriteStream(input.stdoutLogPath, { flags: "a" });
    const stderrStream = fs.createWriteStream(input.stderrLogPath, { flags: "a" });
    child.stdout.pipe(stdoutStream);
    child.stderr.pipe(stderrStream);
    child.on("close", (code, signal) => {
      const expected = this.expectedExitProcess === child;
      if (expected) {
        this.expectedExitProcess = null;
      }
      this.process = null;
      stdoutStream.end();
      stderrStream.end();
      for (const listener of this.exitListeners) {
        listener({ code, signal, expected });
      }
    });

    this.process = child;
    return child;
  }

  async stop(): Promise<void> {
    const current = this.process;
    if (!current) {
      return;
    }
    this.expectedExitProcess = current;
    await new Promise<void>((resolve) => {
      let closed = false;
      const cleanup = () => {
        closed = true;
        current.removeListener("close", cleanup);
        resolve();
      };
      current.once("close", cleanup);
      current.kill("SIGTERM");
      setTimeout(() => {
        if (!closed) {
          current.kill("SIGKILL");
        }
      }, 5_000).unref();
    });
  }
}
