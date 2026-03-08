import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import type {
  ManagedMessagingRuntimeLaunchConfig,
  ManagedMessagingRuntimeSnapshot,
} from "./types.js";

type ProcessExitListener = (event: { code: number | null; signal: NodeJS.Signals | null }) => void;

export class MessagingGatewayProcessSupervisor {
  private process: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private runtimeSnapshot: ManagedMessagingRuntimeSnapshot = {
    running: false,
    bindHost: null,
    bindPort: null,
    pid: null,
    startedAt: null,
  };
  private readonly exitListeners = new Set<ProcessExitListener>();

  onExit(listener: ProcessExitListener): () => void {
    this.exitListeners.add(listener);
    return () => {
      this.exitListeners.delete(listener);
    };
  }

  getRuntimeSnapshot(): ManagedMessagingRuntimeSnapshot {
    return { ...this.runtimeSnapshot };
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  async start(
    launchConfig: ManagedMessagingRuntimeLaunchConfig,
  ): Promise<ManagedMessagingRuntimeSnapshot> {
    await this.stop();

    const bindPort = await this.resolveBindPort(
      launchConfig.bindHost,
      launchConfig.bindPort,
    );
    await mkdir(path.dirname(launchConfig.stdoutLogPath), { recursive: true });
    await mkdir(path.dirname(launchConfig.stderrLogPath), { recursive: true });

    const stdoutStream = fs.createWriteStream(launchConfig.stdoutLogPath, {
      flags: "a",
    });
    const stderrStream = fs.createWriteStream(launchConfig.stderrLogPath, {
      flags: "a",
    });

    const child = spawn(
      process.execPath,
      [path.join(launchConfig.installDir, "dist", "index.js")],
      {
        cwd: launchConfig.installDir,
        env: {
          ...process.env,
          ...launchConfig.env,
          GATEWAY_HOST: launchConfig.bindHost,
          GATEWAY_PORT: String(bindPort),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout.pipe(stdoutStream);
    child.stderr.pipe(stderrStream);
    child.on("close", (code, signal) => {
      stdoutStream.end();
      stderrStream.end();
      this.process = null;
      this.runtimeSnapshot = {
        running: false,
        bindHost: launchConfig.bindHost,
        bindPort,
        pid: null,
        startedAt: this.runtimeSnapshot.startedAt,
      };
      for (const listener of this.exitListeners) {
        listener({ code, signal });
      }
    });

    this.process = child;
    this.runtimeSnapshot = {
      running: true,
      bindHost: launchConfig.bindHost,
      bindPort,
      pid: child.pid ?? null,
      startedAt: new Date().toISOString(),
    };

    await this.waitForHealth(launchConfig.bindHost, bindPort);
    return this.getRuntimeSnapshot();
  }

  async stop(): Promise<void> {
    const current = this.process;
    if (!current) {
      return;
    }

    await new Promise<void>((resolve) => {
      const cleanup = () => {
        current.removeListener("close", cleanup);
        resolve();
      };
      current.once("close", cleanup);
      current.kill("SIGTERM");
      setTimeout(() => {
        if (!current.killed) {
          current.kill("SIGKILL");
        }
      }, 5_000).unref();
    });
  }

  async collectDiagnostics(
    version: string | null,
    installRoot: string | null,
  ): Promise<Record<string, unknown>> {
    return {
      runtime: this.getRuntimeSnapshot(),
      version,
      installRoot,
    };
  }

  private async waitForHealth(host: string, port: number): Promise<void> {
    const url = `http://${host}:${port}/health`;
    const deadline = Date.now() + getHealthStartupTimeoutMs();
    let lastError = "Gateway did not become healthy.";
    while (Date.now() < deadline) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(2_000),
        });
        if (response.ok) {
          return;
        }
        lastError = `Managed messaging runtime health probe returned HTTP ${response.status}.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      await delay(250);
    }
    throw new Error(lastError);
  }

  private async resolveBindPort(
    host: string,
    preferredPort: number,
  ): Promise<number> {
    if (preferredPort > 0 && (await isPortAvailable(host, preferredPort))) {
      return preferredPort;
    }
    return findAvailablePort(host);
  }
}

const HEALTH_STARTUP_TIMEOUT_MS = 60_000;
const HEALTH_STARTUP_TIMEOUT_ENV = "MANAGED_MESSAGING_GATEWAY_HEALTH_STARTUP_TIMEOUT_MS";

const getHealthStartupTimeoutMs = (): number => {
  const raw = process.env[HEALTH_STARTUP_TIMEOUT_ENV];
  if (!raw) {
    return HEALTH_STARTUP_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1_000) {
    return HEALTH_STARTUP_TIMEOUT_MS;
  }
  return parsed;
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isPortAvailable = async (host: string, port: number): Promise<boolean> => {
  try {
    const server = await reservePort(host, port);
    await closeServer(server);
    return true;
  } catch {
    return false;
  }
};

const findAvailablePort = async (host: string): Promise<number> => {
  const server = await reservePort(host, 0);
  const address = server.address();
  const port =
    typeof address === "object" && address !== null ? address.port : null;
  await closeServer(server);
  if (!port) {
    throw new Error("Failed to allocate a port for managed messaging.");
  }
  return port;
};

const reservePort = async (host: string, port: number): Promise<net.Server> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      resolve(server);
    });
  });

const closeServer = async (server: net.Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
