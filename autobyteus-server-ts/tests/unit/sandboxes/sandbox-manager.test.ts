/**
 * autobyteus-581 DS-003 / DS-006: `SandboxManager` with a scripted Docker, pairing and peers, real folders in a temp
 * root and the real C6 store. Covers creation (the container's environment holds no credential; mounts; the result),
 * every creation refusal leaving nothing behind (AC-014), the shared-folder rules (DEC-113, R-G), only the creating run
 * using or removing a sandbox (AC-012), destroy keeping the folders (AC-011), expiry and the start sweep (AC-013, R-A).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SandboxManager, SandboxRefusal, type CreateSandboxInput } from "../../../src/sandboxes/sandbox-manager.js";
import { SandboxRecordsStore } from "../../../src/sandboxes/sandbox-records-store.js";
import type { SandboxContainerSpec } from "../../../src/sandboxes/sandbox-docker.js";
import { resolveGivenFolder, SandboxFolderError } from "../../../src/sandboxes/sandbox-folders.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";

const HOST = "srv_host_000000000000000000000000000000000";
const CALLER = { kind: "run" as const, runId: "run-evaluator" };
const OTHER = { kind: "run" as const, runId: "run-other" };

let root = "";
const realRoot = () => fs.realpathSync(root);
const mkdir = (...parts: string[]) => { const dir = path.join(realRoot(), ...parts); fs.mkdirSync(dir, { recursive: true }); return dir; };

let harnesses = 0;
const harness = (overrides: Partial<ConstructorParameters<typeof SandboxManager>[0]> = {}) => {
  const dataDir = path.join(realRoot(), `data-${harnesses += 1}`);
  const started: SandboxContainerSpec[] = [];
  const removed: string[] = [];
  const execs: Array<{ sandboxId: string; argv: readonly string[]; timeoutMs: number }> = [];
  let peers: PeerNode[] = [];
  const docker = {
    startContainer: vi.fn(async (spec: SandboxContainerSpec) => { started.push(spec); return { exitCode: 0, stdout: "id", stderr: "", truncated: false, timedOut: false }; }),
    exec: vi.fn(async (sandboxId: string, argv: readonly string[], options: { timeoutMs: number }) => {
      execs.push({ sandboxId, argv, timeoutMs: options.timeoutMs });
      return { exitCode: 0, stdout: "ok\n", stderr: "", truncated: false, timedOut: false };
    }),
    remove: vi.fn(async (sandboxId: string) => { removed.push(sandboxId); }),
    listHostSandboxes: vi.fn(async () => [] as string[]),
  };
  const pairing = {
    connect: vi.fn(async (_id: string, baseUrl: string) => ({ baseUrl, graphql: vi.fn() })),
    pair: vi.fn(async (_session: unknown, sandboxId: string) => {
      peers.push({ nodeId: `srv_${sandboxId}`, name: sandboxId, address: "http://127.0.0.1:1", addedAt: "t", paired: true, machine: null, account: null, relation: "own" as const, sandbox: true });
      return `srv_${sandboxId}`;
    }),
    importPackages: vi.fn(async () => ({ agents: [{ name: "Writer", kind: "agent" as const, address: "/Writer" }], teams: [] })),
  };
  const records = new SandboxRecordsStore(dataDir);
  const manager = new SandboxManager({
    docker: docker as never,
    records,
    pairing,
    peers: {
      list: async () => peers,
      remove: vi.fn(async (nodeId: string) => { peers = peers.filter((peer) => peer.nodeId !== nodeId); }),
    },
    checkPlatform: async () => ({ supported: true }),
    hostNodeId: async () => HOST,
    relayOffer: async () => ({ AUTOBYTEUS_PROVIDER_RELAYS: "anthropic,openai", AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "" }),
    image: () => "autobyteus/autobyteus-server:1.5.15-beta.2",
    appDataDir: dataDir,
    testVault: null,
    freePort: async () => 47_581,
    ...overrides,
  });
  return { manager, docker, pairing, records, started, removed, execs, dataDir, peers: () => peers, setPeers: (next: PeerNode[]) => { peers = next; } };
};

const input = (overrides: Partial<CreateSandboxInput> = {}): CreateSandboxInput => ({
  agentPackages: [mkdir("packages", "writer")],
  sharedFolders: [],
  lifetimeMinutes: 120,
  ...overrides,
});

const refusalOf = async (promise: Promise<unknown>) => {
  const error = await promise.catch((caught) => caught);
  expect(error).toBeInstanceOf(SandboxRefusal);
  return error as SandboxRefusal;
};

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-manager-")); });
afterEach(() => { vi.useRealTimers(); fs.rmSync(root, { recursive: true, force: true }); });

describe("SandboxManager.create", () => {
  it("starts one container relayed through this node, paired, with fresh folders and no credential (AC-008, AC-010, C8)", async () => {
    const h = harness();
    const shared = mkdir("articles");
    const created = await h.manager.create(CALLER, input({ sharedFolders: [{ path: shared, name: "articles" }] }));
    expect(created.sandboxId).toMatch(/^sbx_[0-9a-f]{10}$/);
    expect(created).toMatchObject({
      peerName: created.sandboxId, nodeId: `srv_${created.sandboxId}`, image: "autobyteus/autobyteus-server:1.5.15-beta.2",
      sharedFolders: [{ name: "articles", pathInSandbox: "/home/autobyteus/shared/articles" }],
      agents: [{ name: "Writer", address: "/Writer" }], teams: [],
    });
    expect(fs.statSync(created.workspaceFolder).isDirectory()).toBe(true);
    expect(fs.statSync(created.runMemoryFolder).isDirectory()).toBe(true);
    const spec = h.started[0]!;
    expect(spec).toMatchObject({ hostNodeId: HOST, hostPort: 47_581, memory: "6g", cpus: "4" });
    expect(spec.environment).toEqual({
      AUTOBYTEUS_PROVIDER_RELAY_PEER: HOST,
      AUTOBYTEUS_PROVIDER_RELAYS: "anthropic,openai",
      AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES: "",
      AUTOBYTEUS_TEMP_WORKSPACE_DIR: "/home/autobyteus/workspace",
      AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:47581",
    });
    expect(spec.mounts).toEqual([
      { hostPath: created.workspaceFolder, containerPath: "/home/autobyteus/workspace", readOnly: false },
      { hostPath: created.runMemoryFolder, containerPath: "/home/autobyteus/data/memory", readOnly: false },
      { hostPath: shared, containerPath: "/home/autobyteus/shared/articles", readOnly: true },
    ]);
    expect(spec.anonymousVolumes).toEqual(["/home/autobyteus/data", "/root", "/home/autobyteus/server-packages"]);
    expect(await h.records.read()).toEqual([expect.objectContaining({ sandboxId: created.sandboxId, state: "ready", createdByRunId: "run-evaluator" })]);
    h.manager.close();
  });

  it("refuses with its reason and creates nothing: Docker or platform, no image (AC-014)", async () => {
    const noDocker = harness({ checkPlatform: async () => ({ supported: false, code: "SANDBOX_DOCKER_UNAVAILABLE", message: "start Docker" }) });
    expect((await refusalOf(noDocker.manager.create(CALLER, input()))).code).toBe("SANDBOX_DOCKER_UNAVAILABLE");
    const linux = harness({ checkPlatform: async () => ({ supported: false, code: "SANDBOX_PLATFORM_NOT_SUPPORTED", message: "macOS only" }) });
    expect((await refusalOf(linux.manager.create(CALLER, input()))).code).toBe("SANDBOX_PLATFORM_NOT_SUPPORTED");
    const dev = harness({ image: () => null });
    expect((await refusalOf(dev.manager.create(CALLER, input()))).code).toBe("SANDBOX_IMAGE_UNKNOWN");
    for (const h of [noDocker, linux, dev]) {
      expect(h.started).toEqual([]);
      expect(await h.records.read()).toEqual([]);
    }
  });

  it("refuses a fifth sandbox (AC-014) and an image Docker cannot find", async () => {
    const h = harness();
    for (let index = 0; index < 4; index += 1) await h.manager.create(CALLER, input());
    expect((await refusalOf(h.manager.create(CALLER, input()))).code).toBe("SANDBOX_LIMIT_REACHED");
    expect(h.started).toHaveLength(4);
    h.manager.close();
    const missing = harness();
    missing.docker.startContainer.mockResolvedValueOnce({ exitCode: 125, stdout: "", stderr: "manifest unknown", truncated: false, timedOut: false });
    expect((await refusalOf(missing.manager.create(CALLER, input()))).code).toBe("SANDBOX_IMAGE_UNKNOWN");
    expect(await missing.records.read()).toEqual([]);
  });

  it("refuses shared folders and packages that reach the user's home, credentials or app data (DEC-113, R-G)", async () => {
    const h = harness();
    const shared = mkdir("ok");
    const cases: Array<[CreateSandboxInput, string]> = [
      [input({ sharedFolders: [{ path: os.homedir(), name: "home" }] }), "SANDBOX_SHARED_FOLDER_INVALID"],
      [input({ sharedFolders: [{ path: "/", name: "root" }] }), "SANDBOX_SHARED_FOLDER_INVALID"],
      [input({ sharedFolders: [{ path: path.join(os.homedir(), ".ssh"), name: "ssh" }] }), "SANDBOX_SHARED_FOLDER_INVALID"],
      [input({ sharedFolders: [{ path: shared, name: "Bad Name" }] }), "SANDBOX_SHARED_FOLDER_INVALID"],
      [input({ sharedFolders: [{ path: shared, name: "a" }, { path: shared, name: "a" }] }), "SANDBOX_SHARED_FOLDER_INVALID"],
      [input({ sharedFolders: [{ path: "relative/path", name: "rel" }] }), "SANDBOX_SHARED_FOLDER_INVALID"],
      [input({ sharedFolders: [{ path: h.dataDir, name: "data" }] }), "SANDBOX_SHARED_FOLDER_INVALID"],
      [input({ agentPackages: [path.join(realRoot(), "missing")] }), "SANDBOX_PACKAGE_INVALID"],
      [input({ agentPackages: [path.join(os.homedir(), ".codex")] }), "SANDBOX_PACKAGE_INVALID"],
    ];
    fs.mkdirSync(h.dataDir, { recursive: true });
    for (const [given, code] of cases) expect((await refusalOf(h.manager.create(CALLER, given))).code).toBe(code);
    expect(h.started).toEqual([]);
    expect(await h.records.read()).toEqual([]);
  });

  it("a failed start removes the container, the pairing, the record and its new folders (AC-008 failure outcome)", async () => {
    const h = harness();
    h.pairing.importPackages.mockRejectedValueOnce(new Error("import exploded"));
    const refusal = await refusalOf(h.manager.create(CALLER, input()));
    expect(refusal.code).toBe("SANDBOX_START_FAILED");
    expect(h.removed).toHaveLength(1);
    expect(h.peers()).toEqual([]);
    expect(await h.records.read()).toEqual([]);
    expect(fs.existsSync(path.join(h.dataDir, "sandboxes", h.removed[0]!))).toBe(false);
  });
});

describe("using and removing a sandbox", () => {
  it("runs an argument list only for the creating run, with its time limit (AC-012)", async () => {
    const h = harness();
    const { sandboxId } = await h.manager.create(CALLER, input());
    expect(await h.manager.runIn(CALLER, sandboxId, ["ls", "-la"], 30)).toEqual({ exitCode: 0, stdout: "ok\n", stderr: "", truncated: false });
    expect(h.execs).toEqual([{ sandboxId, argv: ["ls", "-la"], timeoutMs: 30_000 }]);
    expect((await refusalOf(h.manager.runIn(OTHER, sandboxId, ["ls"], null))).code).toBe("SANDBOX_NOT_YOURS");
    expect((await refusalOf(h.manager.destroy(OTHER, sandboxId))).code).toBe("SANDBOX_NOT_YOURS");
    expect((await refusalOf(h.manager.runIn(CALLER, "sbx_unknown", ["ls"], null))).code).toBe("SANDBOX_NOT_FOUND");
    expect((await refusalOf(h.manager.runIn(CALLER, sandboxId, [], null))).code).toBe("SANDBOX_ARGUMENT_INVALID");
    expect((await refusalOf(h.manager.runIn(CALLER, sandboxId, ["ls"], 601))).code).toBe("SANDBOX_ARGUMENT_INVALID");
    h.manager.close();
  });

  it("destroy removes the container, unpairs and deletes the record, and keeps the folders (AC-011)", async () => {
    const h = harness();
    const created = await h.manager.create(CALLER, input());
    fs.writeFileSync(path.join(created.workspaceFolder, "result.md"), "done");
    expect(await h.manager.destroy(CALLER, created.sandboxId)).toEqual({ removed: true, foldersKept: true });
    expect(h.removed).toEqual([created.sandboxId]);
    expect(h.peers()).toEqual([]);
    expect(await h.records.read()).toEqual([]);
    expect(fs.readFileSync(path.join(created.workspaceFolder, "result.md"), "utf8")).toBe("done");
    expect((await refusalOf(h.manager.destroy(CALLER, created.sandboxId))).code).toBe("SANDBOX_NOT_FOUND");
  });

  it("removes a sandbox at its expiry, keeping its folders (AC-013)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let now = Date.parse("2026-11-26T12:00:00.000Z");
    const h = harness({ now: () => now });
    const created = await h.manager.create(CALLER, input({ lifetimeMinutes: 1 }));
    expect(created.expiresAt).toBe("2026-11-26T12:01:00.000Z");
    await vi.advanceTimersByTimeAsync(59_000);
    expect(h.removed).toEqual([]);
    now += 61_000;
    await vi.advanceTimersByTimeAsync(2_000);
    for (let tick = 0; tick < 200 && (await h.records.read()).length > 0; tick += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(await h.records.read()).toEqual([]);
    expect(h.removed).toEqual([created.sandboxId]);
    expect(fs.existsSync(created.workspaceFolder)).toBe(true);
  });

  it("the start sweep removes every listed sandbox, every container labelled for this host and every sandbox peer (AC-013, R-A)", async () => {
    const h = harness();
    const created = await h.manager.create(CALLER, input());
    h.manager.close();
    const orphan: PeerNode = { nodeId: "srv_orphan", name: "sbx_orphan", address: "http://x", addedAt: "t", paired: true, machine: null, account: null, relation: "own" as const, sandbox: true };
    const normal: PeerNode = { nodeId: "srv_desktop", name: "desktop", address: "http://y", addedAt: "t", paired: true, machine: null, account: null, relation: "own" as const, sandbox: false };
    h.setPeers([...h.peers(), orphan, normal]);
    h.docker.listHostSandboxes.mockResolvedValueOnce(["sbx_leftover"]);
    const restarted = harness({ docker: h.docker as never, records: h.records, peers: { list: async () => h.peers(),
      remove: async (nodeId: string) => h.setPeers(h.peers().filter((peer) => peer.nodeId !== nodeId)) } });
    await restarted.manager.sweepAtStart();
    expect(await h.records.read()).toEqual([]);
    expect(h.removed).toEqual([created.sandboxId, "sbx_leftover"]);
    expect(h.peers()).toEqual([normal]);
    expect(h.docker.listHostSandboxes).toHaveBeenCalledWith(HOST);
  });
});

describe("resolveGivenFolder", () => {
  it("resolves links before deciding: a link to a credential folder is refused like the folder", async () => {
    const home = mkdir("home");
    fs.mkdirSync(path.join(home, ".aws"));
    fs.mkdirSync(path.join(home, ".autobyteus-test"));
    const project = mkdir("home", "projects", "a");
    fs.symlinkSync(path.join(home, ".aws"), path.join(realRoot(), "aws-link"));
    const folders = { appDataDir: path.join(realRoot(), "appdata"), testVault: null, home };
    await expect(resolveGivenFolder(project, folders)).resolves.toBe(project);
    for (const given of [home, realRoot(), path.join(home, ".aws"), path.join(realRoot(), "aws-link"), path.join(home, ".autobyteus-test")]) {
      await expect(resolveGivenFolder(given, folders)).rejects.toBeInstanceOf(SandboxFolderError);
    }
  });
});
