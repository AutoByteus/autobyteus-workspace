import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

type RunningNodeProcess = {
  child: ChildProcessWithoutNullStreams;
  baseUrl: string;
  dataDir: string;
  logPrefix: string;
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const reserveFreePort = async (): Promise<number> => {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to reserve free port.")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
};

let discoveryHarnessPrepared = false;

const ensureDiscoveryHarnessEntrypoint = (): string => {
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const entry = path.join(
    repoRoot,
    "tests",
    "e2e",
    "discovery",
    "fixtures",
    "discovery-node-harness.mjs",
  );

  if (!fs.existsSync(entry)) {
    throw new Error(`Discovery smoke harness not found: ${entry}`);
  }

  if (!discoveryHarnessPrepared) {
    execFileSync("pnpm", ["build"], {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });
    discoveryHarnessPrepared = true;
  }

  return entry;
};

const createNodeDataDir = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `autobyteus-discovery-smoke-${prefix}-`));
  fs.writeFileSync(path.join(dir, ".env"), "\n", "utf8");
  return dir;
};

const waitForHealth = async (baseUrl: string, timeoutMs = 30_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: string | null = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/rest/health`);
      if (response.ok) {
        return;
      }
      lastError = `health status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await wait(250);
  }

  throw new Error(`Timed out waiting for health at ${baseUrl}: ${lastError ?? "unknown error"}`);
};

const pollUntil = async (
  predicate: () => Promise<boolean>,
  timeoutMs = 25_000,
  pollMs = 300,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await wait(pollMs);
  }

  throw new Error("Timed out waiting for condition.");
};

const startNodeProcess = async (input: {
  role: "registry" | "client";
  nodeId: string;
  nodeName: string;
  port: number;
  dataDir: string;
  registryUrl?: string;
  logPrefix: string;
}): Promise<RunningNodeProcess> => {
  const entry = ensureDiscoveryHarnessEntrypoint();
  const baseUrl = `http://127.0.0.1:${input.port}`;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SMOKE_HOST: "127.0.0.1",
    SMOKE_PORT: String(input.port),
    SMOKE_DATA_DIR: input.dataDir,
    AUTOBYTEUS_SERVER_HOST: baseUrl,
    AUTOBYTEUS_NODE_ID: input.nodeId,
    AUTOBYTEUS_NODE_NAME: input.nodeName,
    AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
    AUTOBYTEUS_NODE_DISCOVERY_ROLE: input.role,
    AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL: input.registryUrl ?? baseUrl,
    AUTOBYTEUS_NODE_DISCOVERY_HEARTBEAT_INTERVAL_MS: "500",
    AUTOBYTEUS_NODE_DISCOVERY_SYNC_INTERVAL_MS: "500",
    AUTOBYTEUS_NODE_DISCOVERY_MAINTENANCE_INTERVAL_MS: "500",
    AUTOBYTEUS_NODE_DISCOVERY_DEGRADED_AFTER_MS: "2000",
    AUTOBYTEUS_NODE_DISCOVERY_UNREACHABLE_AFTER_MS: "4000",
    AUTOBYTEUS_NODE_DISCOVERY_TTL_MS: "6000",
  };

  const child = spawn(process.execPath, [entry], {
    cwd: path.resolve(__dirname, "..", "..", ".."),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(`[${input.logPrefix}] ${chunk.toString()}`);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(`[${input.logPrefix}] ${chunk.toString()}`);
  });

  await waitForHealth(baseUrl);

  return {
    child,
    baseUrl,
    dataDir: input.dataDir,
    logPrefix: input.logPrefix,
  };
};

const stopNodeProcess = async (node: RunningNodeProcess): Promise<void> => {
  const child = node.child;
  if (child.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;

    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve();
    };

    const hardKillTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      finish();
    }, 8_000);

    child.once("exit", () => {
      clearTimeout(hardKillTimer);
      finish();
    });

    child.kill("SIGTERM");
  });
};

describe("Discovery process smoke e2e", () => {
  const runningNodes: RunningNodeProcess[] = [];

  afterEach(async () => {
    while (runningNodes.length > 0) {
      const node = runningNodes.pop();
      if (node) {
        await stopNodeProcess(node);
        fs.rmSync(node.dataDir, { recursive: true, force: true });
      }
    }
  });

  it(
    "registers client node to registry and converges peers across separate server processes",
    async () => {
      const registryPort = await reserveFreePort();
      const clientPort = await reserveFreePort();
      const registryDataDir = createNodeDataDir("registry");
      const clientDataDir = createNodeDataDir("client");

      const registryNode = await startNodeProcess({
        role: "registry",
        nodeId: "registry-smoke-node",
        nodeName: "Registry Smoke Node",
        port: registryPort,
        dataDir: registryDataDir,
        logPrefix: "registry",
      });
      runningNodes.push(registryNode);

      const clientNode = await startNodeProcess({
        role: "client",
        nodeId: "client-smoke-node",
        nodeName: "Client Smoke Node",
        port: clientPort,
        dataDir: clientDataDir,
        registryUrl: registryNode.baseUrl,
        logPrefix: "client",
      });
      runningNodes.push(clientNode);

      await pollUntil(async () => {
        const response = await fetch(`${registryNode.baseUrl}/rest/node-discovery/peers`);
        if (!response.ok) {
          return false;
        }

        const payload = (await response.json()) as { peers?: Array<{ nodeId?: string }> };
        const ids = new Set((payload.peers ?? []).map((peer) => String(peer.nodeId ?? "")));
        return ids.has("registry-smoke-node") && ids.has("client-smoke-node");
      });

      const registryPeersResponse = await fetch(`${registryNode.baseUrl}/rest/node-discovery/peers`);
      const registryPeersPayload = (await registryPeersResponse.json()) as {
        peers?: Array<{ nodeId: string; nodeName: string; baseUrl: string }>;
      };
      expect(registryPeersResponse.ok).toBe(true);
      expect(registryPeersPayload.peers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ nodeId: "registry-smoke-node" }),
          expect.objectContaining({ nodeId: "client-smoke-node" }),
        ]),
      );

      await pollUntil(async () => {
        const response = await fetch(`${clientNode.baseUrl}/rest/node-discovery/peers`);
        if (!response.ok) {
          return false;
        }
        const payload = (await response.json()) as { peers?: Array<{ nodeId?: string }> };
        return (payload.peers ?? []).some((peer) => peer.nodeId === "registry-smoke-node");
      });

      const clientSelfResponse = await fetch(`${clientNode.baseUrl}/rest/node-discovery/self`);
      const clientSelfPayload = (await clientSelfResponse.json()) as {
        nodeId: string;
        discoveryRole: string;
        discoveryRegistryUrl: string | null;
      };
      expect(clientSelfResponse.ok).toBe(true);
      expect(clientSelfPayload).toMatchObject({
        nodeId: "client-smoke-node",
        discoveryRole: "client",
        discoveryRegistryUrl: registryNode.baseUrl,
      });
    },
    90_000,
  );

  it(
    "converges when client starts before registry",
    async () => {
      const registryPort = await reserveFreePort();
      const clientPort = await reserveFreePort();
      const registryDataDir = createNodeDataDir("registry-late");
      const clientDataDir = createNodeDataDir("client-early");
      const registryBaseUrl = `http://127.0.0.1:${registryPort}`;

      const clientNode = await startNodeProcess({
        role: "client",
        nodeId: "client-early-node",
        nodeName: "Client Early Node",
        port: clientPort,
        dataDir: clientDataDir,
        registryUrl: registryBaseUrl,
        logPrefix: "client-early",
      });
      runningNodes.push(clientNode);

      await wait(2_000);

      const registryNode = await startNodeProcess({
        role: "registry",
        nodeId: "registry-late-node",
        nodeName: "Registry Late Node",
        port: registryPort,
        dataDir: registryDataDir,
        logPrefix: "registry-late",
      });
      runningNodes.push(registryNode);

      await pollUntil(async () => {
        const response = await fetch(`${registryNode.baseUrl}/rest/node-discovery/peers`);
        if (!response.ok) {
          return false;
        }
        const payload = (await response.json()) as { peers?: Array<{ nodeId?: string }> };
        const ids = new Set((payload.peers ?? []).map((peer) => String(peer.nodeId ?? "")));
        return ids.has("registry-late-node") && ids.has("client-early-node");
      }, 35_000, 400);

      await pollUntil(async () => {
        const response = await fetch(`${clientNode.baseUrl}/rest/node-discovery/peers`);
        if (!response.ok) {
          return false;
        }
        const payload = (await response.json()) as { peers?: Array<{ nodeId?: string }> };
        const ids = new Set((payload.peers ?? []).map((peer) => String(peer.nodeId ?? "")));
        return ids.has("registry-late-node") && ids.has("client-early-node");
      }, 35_000, 400);
    },
    120_000,
  );
});
