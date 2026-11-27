import { randomBytes } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { createServerLogger } from "../logging/server-app-logger.js";
import type { AvailableCollaboratorEntry } from "../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { PeerDirectory } from "../remote-collaboration/settings/peer-directory.js";
import { PROVIDER_RELAY_PEER_SETTING } from "../credential-proxy/provider-relays/provider-relay-settings.js";
import type { SandboxDocker } from "./sandbox-docker.js";
import {
  DATA_IN_SANDBOX,
  isSharedFolderName,
  MEMORY_IN_SANDBOX,
  resolveGivenFolder,
  SandboxFolderError,
  SHARED_FOLDER_ROOT_IN_SANDBOX,
  WORKSPACE_IN_SANDBOX,
} from "./sandbox-folders.js";
import { SandboxPairingError, type SandboxPairing } from "./sandbox-pairing.js";
import type { SandboxPlatformCheck } from "./sandbox-platform.js";
import type { SandboxRecord, SandboxRecordsStore } from "./sandbox-records-store.js";
import { SANDBOX_LIMITS } from "./sandbox-settings.js";

const logger = createServerLogger("sandboxes");

/** How long a new sandbox node may take to hand out its setup code (QR-001 asks ≤ 90 s for the whole creation). */
const START_DEADLINE_MS = 180_000;
const EXEC_DEFAULT_SECONDS = 60;
const EXEC_MAX_SECONDS = 600;
const EXEC_OUTPUT_MAX_BYTES = 64 * 1024;

export type SandboxRefusalCode =
  | "SANDBOX_DOCKER_UNAVAILABLE" | "SANDBOX_PLATFORM_NOT_SUPPORTED"
  | "SANDBOX_LIMIT_REACHED" | "SANDBOX_IMAGE_UNKNOWN"
  | "SANDBOX_PACKAGE_INVALID" | "SANDBOX_SHARED_FOLDER_INVALID" | "SANDBOX_START_FAILED"
  | "SANDBOX_NOT_FOUND" | "SANDBOX_NOT_YOURS" | "SANDBOX_NOT_READY" | "SANDBOX_ARGUMENT_INVALID";

/** A refused sandbox request (C7): nothing was created, run or removed. */
export class SandboxRefusal extends Error {
  constructor(readonly code: SandboxRefusalCode, message: string) {
    super(message);
    this.name = "SandboxRefusal";
  }
}

/** Who asks: the run of an agent that has the tools (the only way a sandbox is created, used or removed). */
export type SandboxCaller = Readonly<{ kind: "run"; runId: string }>;

export type CreateSandboxInput = Readonly<{
  agentPackages: readonly string[];
  sharedFolders: readonly Readonly<{ path: string; name: string }>[];
  lifetimeMinutes: number;
}>;

export type CreatedSandbox = Readonly<{
  sandboxId: string;
  peerName: string;
  nodeId: string;
  workspaceFolder: string;
  runMemoryFolder: string;
  sharedFolders: readonly Readonly<{ name: string; pathInSandbox: string }>[];
  agents: readonly Readonly<{ name: string; address: string }>[];
  teams: readonly Readonly<{ name: string; address: string }>[];
  image: string;
  expiresAt: string;
}>;

export type SandboxCommandResult = Readonly<{ exitCode: number | null; stdout: string; stderr: string; truncated: boolean }>;

const freeLoopbackPort = (): Promise<number> => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => (address && typeof address === "object" ? resolve(address.port) : reject(new Error("no port"))));
  });
});

const entryOf = (entry: AvailableCollaboratorEntry) => Object.freeze({ name: entry.name, address: entry.address });

/**
 * The host node's sandboxes (DS-003, DS-006): creates one (checks, then one container from this node's release image,
 * paired as a normal peer marked `sandbox`, relayed through this node, with fresh mapped folders and the requested
 * packages), runs commands in it, and removes it on destroy, at expiry and at this node's start. The limit check and
 * the `starting` write are serialized (R-B). Removal unpairs it and removes its container and volumes, and keeps its
 * folders.
 */
export class SandboxManager {
  private tail: Promise<unknown> = Promise.resolve();
  private readonly expiryTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly deps: Readonly<{
    docker: SandboxDocker;
    records: Pick<SandboxRecordsStore, "read" | "write">;
    pairing: Pick<SandboxPairing, "connect" | "pair" | "importPackages">;
    peers: Pick<PeerDirectory, "list" | "remove">;
    checkPlatform: () => Promise<SandboxPlatformCheck>;
    hostNodeId: () => Promise<string>;
    /** C1's relay lists this node offers a new sandbox now (DEC-109). */
    relayOffer: () => Promise<Readonly<Record<string, string>>>;
    /** The image of this node's release, or `null` when unknown. */
    image: () => string | null;
    appDataDir: string;
    /** Folders a sandbox may never receive beyond the user's credential folders: the test vault when one is set. */
    testVault: string | null;
    freePort?: () => Promise<number>;
    now?: () => number;
  }>) {}

  async create(caller: SandboxCaller, input: CreateSandboxInput): Promise<CreatedSandbox> {
    const platform = await this.deps.checkPlatform();
    if (!platform.supported) throw new SandboxRefusal(platform.code, platform.message);
    const image = this.deps.image();
    if (!image) {
      throw new SandboxRefusal("SANDBOX_IMAGE_UNKNOWN", "This node's release is unknown (a development build), so no server image matches it. Set AUTOBYTEUS_SANDBOX_IMAGE.");
    }
    const packages = await this.resolveFolders(input.agentPackages, "SANDBOX_PACKAGE_INVALID", "agent package");
    const shared = await this.resolveShared(input.sharedFolders);

    const now = this.deps.now ?? Date.now;
    const sandboxId = `sbx_${randomBytes(5).toString("hex")}`;
    const folderRoot = path.join(this.deps.appDataDir, "sandboxes", sandboxId);
    const record: SandboxRecord = Object.freeze({
      sandboxId,
      nodeId: null,
      image,
      workspaceFolder: path.join(folderRoot, "workspace"),
      runMemoryFolder: path.join(folderRoot, "run-memory"),
      hostPort: await (this.deps.freePort ?? freeLoopbackPort)(),
      createdAt: new Date(now()).toISOString(),
      expiresAt: new Date(now() + input.lifetimeMinutes * 60_000).toISOString(),
      createdByRunId: caller.runId,
      state: "starting",
    });
    await this.serialized(async () => {
      const records = await this.deps.records.read();
      if (records.length >= SANDBOX_LIMITS.maxSandboxes) {
        throw new SandboxRefusal("SANDBOX_LIMIT_REACHED", `This node already has ${SANDBOX_LIMITS.maxSandboxes} sandboxes: destroy one first.`);
      }
      await this.deps.records.write([...records, record]);
    });
    try {
      return await this.start(record, packages, shared);
    } catch (error) {
      // A refused or failed start leaves nothing behind: container, pairing, record and its new, empty folders.
      await this.removeRecord(record, { keepFolders: false }).catch((cleanup) =>
        logger.error(`Sandbox ${sandboxId} could not be cleaned up after a failed start: ${String(cleanup)}`));
      if (error instanceof SandboxRefusal) throw error;
      if (error instanceof SandboxPairingError) throw new SandboxRefusal(error.code, error.message);
      throw new SandboxRefusal("SANDBOX_START_FAILED", `The sandbox could not start: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Runs an argument list (never a shell string) in the caller's ready sandbox, with a time limit and capped output. */
  async runIn(caller: SandboxCaller, sandboxId: string, argv: readonly string[], timeoutSeconds: number | null): Promise<SandboxCommandResult> {
    if (!Array.isArray(argv) || argv.length === 0 || argv.some((part) => typeof part !== "string")) {
      throw new SandboxRefusal("SANDBOX_ARGUMENT_INVALID", "argv must be a non-empty list of strings.");
    }
    const seconds = timeoutSeconds ?? EXEC_DEFAULT_SECONDS;
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > EXEC_MAX_SECONDS) {
      throw new SandboxRefusal("SANDBOX_ARGUMENT_INVALID", `timeoutSeconds must be a whole number from 1 to ${EXEC_MAX_SECONDS}.`);
    }
    const record = await this.requireOwned(caller, sandboxId);
    if (record.state !== "ready") throw new SandboxRefusal("SANDBOX_NOT_READY", `Sandbox ${sandboxId} is ${record.state}.`);
    const result = await this.deps.docker.exec(sandboxId, argv, { timeoutMs: seconds * 1000, maxOutputBytes: EXEC_OUTPUT_MAX_BYTES });
    return Object.freeze({ exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, truncated: result.truncated || result.timedOut });
  }

  /** Removes the caller's sandbox: container and volumes, pairing, record; its folders stay for their results. */
  async destroy(caller: SandboxCaller, sandboxId: string): Promise<Readonly<{ removed: true; foldersKept: true }>> {
    const record = await this.requireOwned(caller, sandboxId);
    await this.removeRecord(record, { keepFolders: true });
    return Object.freeze({ removed: true, foldersKept: true });
  }

  /**
   * At this node's start (DS-006): every sandbox from before it has no owner run any more. Removes every listed one,
   * every container labelled with this host, and every peer marked `sandbox` (R-A). Logs and goes on; never throws.
   */
  async sweepAtStart(): Promise<void> {
    try {
      for (const record of await this.deps.records.read()) {
        await this.removeRecord(record, { keepFolders: true }).catch((error) => logger.warn(`Sandbox ${record.sandboxId} not removed at start: ${String(error)}`));
      }
      const hostNodeId = await this.deps.hostNodeId();
      const containers = await this.deps.docker.listHostSandboxes(hostNodeId).catch(() => [] as readonly string[]);
      for (const sandboxId of containers) {
        await this.deps.docker.remove(sandboxId).catch((error) => logger.warn(`Sandbox container ${sandboxId} not removed at start: ${String(error)}`));
      }
      for (const peer of await this.deps.peers.list()) {
        if (peer.sandbox) await this.deps.peers.remove(peer.nodeId).catch(() => undefined);
      }
    } catch (error) {
      logger.warn(`The sandbox start sweep did not finish: ${String(error)}`);
    }
  }

  /** Stops the expiry timers (server shutdown); the sandboxes themselves go at the next start. */
  close(): void {
    for (const timer of this.expiryTimers.values()) clearTimeout(timer);
    this.expiryTimers.clear();
  }

  private async start(
    record: SandboxRecord,
    packages: readonly string[],
    shared: readonly Readonly<{ path: string; name: string }>[],
  ): Promise<CreatedSandbox> {
    const { sandboxId } = record;
    await mkdir(record.workspaceFolder, { recursive: true });
    await mkdir(record.runMemoryFolder, { recursive: true });
    const hostNodeId = await this.deps.hostNodeId();
    const started = await this.deps.docker.startContainer({
      sandboxId,
      hostNodeId,
      image: record.image,
      hostPort: record.hostPort,
      memory: SANDBOX_LIMITS.memory,
      cpus: SANDBOX_LIMITS.cpus,
      mounts: [
        { hostPath: record.workspaceFolder, containerPath: WORKSPACE_IN_SANDBOX, readOnly: false },
        // The node's own memory folder (inside its data volume): the server always keeps memory at <data>/memory.
        { hostPath: record.runMemoryFolder, containerPath: MEMORY_IN_SANDBOX, readOnly: false },
        ...shared.map((folder) => ({ hostPath: folder.path, containerPath: `${SHARED_FOLDER_ROOT_IN_SANDBOX}/${folder.name}`, readOnly: true })),
      ],
      anonymousVolumes: [DATA_IN_SANDBOX, "/root", "/home/autobyteus/server-packages"],
      // C8: C1's three variables and the node's own settings; never a key, token or credential.
      environment: {
        [PROVIDER_RELAY_PEER_SETTING]: hostNodeId,
        ...(await this.deps.relayOffer()),
        AUTOBYTEUS_TEMP_WORKSPACE_DIR: WORKSPACE_IN_SANDBOX,
        AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${record.hostPort}`,
      },
    });
    if (started.exitCode !== 0) {
      if (/manifest unknown|not found|pull access denied|repository does not exist/i.test(started.stderr)) {
        throw new SandboxRefusal("SANDBOX_IMAGE_UNKNOWN", `The server image ${record.image} is not available.`);
      }
      throw new SandboxRefusal("SANDBOX_START_FAILED", `Docker could not start the sandbox: ${started.stderr.trim().slice(0, 300)}`);
    }
    const session = await this.deps.pairing.connect(sandboxId, `http://127.0.0.1:${record.hostPort}`, Date.now() + START_DEADLINE_MS);
    const nodeId = await this.deps.pairing.pair(session, sandboxId);
    await this.update(sandboxId, (current) => ({ ...current, nodeId }));
    const imported = await this.deps.pairing.importPackages(session, sandboxId, packages);
    const ready = await this.update(sandboxId, (current) => ({ ...current, state: "ready" }));
    this.scheduleExpiry(ready);
    return Object.freeze({
      sandboxId,
      peerName: sandboxId,
      nodeId,
      workspaceFolder: record.workspaceFolder,
      runMemoryFolder: record.runMemoryFolder,
      sharedFolders: shared.map((folder) => Object.freeze({ name: folder.name, pathInSandbox: `${SHARED_FOLDER_ROOT_IN_SANDBOX}/${folder.name}` })),
      agents: imported.agents.map(entryOf),
      teams: imported.teams.map(entryOf),
      image: record.image,
      expiresAt: record.expiresAt,
    });
  }

  private scheduleExpiry(record: SandboxRecord): void {
    const delay = Math.max(0, Date.parse(record.expiresAt) - (this.deps.now ?? Date.now)());
    const timer = setTimeout(() => {
      this.expiryTimers.delete(record.sandboxId);
      void this.deps.records.read()
        .then((records) => records.find((entry) => entry.sandboxId === record.sandboxId))
        .then((current) => (current ? this.removeRecord(current, { keepFolders: true }) : undefined))
        .catch((error) => logger.warn(`Sandbox ${record.sandboxId} not removed at its expiry: ${String(error)}`));
    }, delay);
    timer.unref?.();
    this.expiryTimers.set(record.sandboxId, timer);
  }

  /** `removing` → container and volumes → pairing (record and mark gone) → C6 entry; folders by `keepFolders`. */
  private async removeRecord(record: SandboxRecord, options: Readonly<{ keepFolders: boolean }>): Promise<void> {
    const timer = this.expiryTimers.get(record.sandboxId);
    if (timer) clearTimeout(timer);
    this.expiryTimers.delete(record.sandboxId);
    await this.update(record.sandboxId, (current) => ({ ...current, state: "removing" })).catch(() => undefined);
    await this.deps.docker.remove(record.sandboxId);
    const peer = (await this.deps.peers.list()).find((entry) =>
      (record.nodeId !== null && entry.nodeId === record.nodeId) || (entry.sandbox && entry.name === record.sandboxId));
    if (peer) await this.deps.peers.remove(peer.nodeId);
    await this.serialized(async () => {
      await this.deps.records.write((await this.deps.records.read()).filter((entry) => entry.sandboxId !== record.sandboxId));
    });
    if (!options.keepFolders) await rm(path.dirname(record.workspaceFolder), { recursive: true, force: true });
  }

  private async requireOwned(caller: SandboxCaller, sandboxId: unknown): Promise<SandboxRecord> {
    const record = typeof sandboxId === "string"
      ? (await this.deps.records.read()).find((entry) => entry.sandboxId === sandboxId)
      : undefined;
    if (!record) throw new SandboxRefusal("SANDBOX_NOT_FOUND", `There is no sandbox ${String(sandboxId)} on this node.`);
    if (caller.runId !== record.createdByRunId) {
      throw new SandboxRefusal("SANDBOX_NOT_YOURS", `Sandbox ${record.sandboxId} was created by another run.`);
    }
    return record;
  }

  private async update(sandboxId: string, change: (record: SandboxRecord) => SandboxRecord): Promise<SandboxRecord> {
    return this.serialized(async () => {
      const records = await this.deps.records.read();
      const current = records.find((entry) => entry.sandboxId === sandboxId);
      if (!current) throw new Error(`Sandbox ${sandboxId} is no longer listed.`);
      const changed = Object.freeze(change(current));
      await this.deps.records.write(records.map((entry) => (entry.sandboxId === sandboxId ? changed : entry)));
      return changed;
    });
  }

  private async resolveFolders(given: readonly unknown[], code: "SANDBOX_PACKAGE_INVALID", label: string): Promise<string[]> {
    const resolved: string[] = [];
    for (const folder of given) {
      try {
        resolved.push(await resolveGivenFolder(folder, { appDataDir: this.deps.appDataDir, testVault: this.deps.testVault }));
      } catch (error) {
        throw new SandboxRefusal(code, `The ${label} ${String(folder)} cannot be used: ${error instanceof SandboxFolderError ? error.message : String(error)}`);
      }
    }
    return resolved;
  }

  private async resolveShared(given: readonly Readonly<{ path: string; name: string }>[]): Promise<Readonly<{ path: string; name: string }>[]> {
    const names = new Set<string>();
    const resolved: Readonly<{ path: string; name: string }>[] = [];
    for (const folder of given) {
      const refuse = (reason: string) => new SandboxRefusal("SANDBOX_SHARED_FOLDER_INVALID", `The shared folder ${String(folder?.path)} cannot be used: ${reason}`);
      if (!isSharedFolderName(folder?.name)) throw refuse("its name must be 1 to 40 lower-case letters, digits or '-', starting with a letter or digit.");
      if (names.has(folder.name)) throw refuse(`the name '${folder.name}' is used twice.`);
      names.add(folder.name);
      try {
        resolved.push(Object.freeze({
          path: await resolveGivenFolder(folder.path, { appDataDir: this.deps.appDataDir, testVault: this.deps.testVault }),
          name: folder.name,
        }));
      } catch (error) {
        throw refuse(error instanceof SandboxFolderError ? error.message : String(error));
      }
    }
    return resolved;
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
