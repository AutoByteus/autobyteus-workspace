import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { composeExtensions } from "../../../src/compositions/extensions-composition.js";
import type { ExtensionItem } from "../../../src/extensions/domain/extension-item.js";
import type { ExtensionManager } from "../../../src/extensions/services/extension-manager.js";
import {
  CATALOG_URL,
  describeTestExtension,
  TEST_PLATFORM,
  TestCatalogPublisher,
  TestWeb,
} from "../../fixtures/extension-packages.js";

type Steer = { calls: string[]; startGate?: Promise<void>; installGate?: Promise<void>; startError?: string; statusError?: string; installError?: string };
const steer = (id: string): Steer => {
  const all = ((globalThis as { __extensionTest?: Record<string, Steer> }).__extensionTest ??= {});
  return (all[id] ??= { calls: [] });
};

const until = async (check: () => Promise<boolean>, what: string): Promise<void> => {
  const deadline = Date.now() + 5_000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe("ExtensionManager (extension-contract.md §6, §7; design DS-001…DS-006)", () => {
  let root: string;
  let web: TestWeb;
  let publisher: TestCatalogPublisher;
  let manager: ExtensionManager;

  const newManager = (options: { isDesktopNode?: boolean; platform?: string } = {}) => composeExtensions({
    dataDir: root,
    platform: options.platform ?? TEST_PLATFORM,
    isDesktopNode: options.isDesktopNode ?? true,
    catalogSource: { url: CATALOG_URL, publicKeyPem: publisher.publicKeyPem },
    fetch: web.fetch,
  });
  const extensionsDir = () => path.join(root, "extensions");
  const itemOf = async (id: string, refreshCatalog = false): Promise<ExtensionItem | undefined> =>
    (await manager.list({ refreshCatalog })).extensions.find((item) => item.id === id);
  const installed = async (id = "hello") => {
    await manager.install(id);
    await until(async () => (await itemOf(id))?.state === "installed", `${id} installed`);
  };

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-extensions-manager-"));
    web = new TestWeb();
    publisher = new TestCatalogPublisher(web);
    publisher.publishCatalog([await publisher.publishPackage(describeTestExtension())]);
    (globalThis as { __extensionTest?: unknown }).__extensionTest = {};
    manager = newManager();
  });

  afterEach(async () => {
    await manager.stopAll();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("lists what the verified catalog offers here, and fetches only when asked", async () => {
    expect(await manager.list({ refreshCatalog: false })).toEqual({ catalog: "unreachable", platform: TEST_PLATFORM, extensions: [] });
    expect(web.requested).toEqual([]);

    const list = await manager.list({ refreshCatalog: true });
    expect(list.catalog).toBe("verified");
    expect(list.extensions).toEqual([expect.objectContaining({
      id: "hello", name: "Hello", state: "notInstalled", catalogVersion: "1.0.0", installedVersion: null, enabled: null,
      update: null, starting: false, platforms: [TEST_PLATFORM],
    })]);
    const fetched = web.requested.length;
    await manager.list({ refreshCatalog: false });
    expect(web.requested).toHaveLength(fetched);
  });

  it("offers desktop-node extensions only on the desktop's own node (REQ-011, AC-004)", async () => {
    publisher.publishCatalog([
      await publisher.publishPackage(describeTestExtension({ id: "voice", name: "Voice", offeredOn: "desktop-node" })),
      await publisher.publishPackage(describeTestExtension()),
    ]);
    manager = newManager({ isDesktopNode: false });
    expect((await manager.list({ refreshCatalog: true })).extensions.map((item) => item.id)).toEqual(["hello"]);
    manager = newManager({ isDesktopNode: true });
    expect((await manager.list({ refreshCatalog: true })).extensions.map((item) => item.id)).toEqual(["voice", "hello"]);
  });

  it("shows notAvailableHere for another platform or a newer contract, and refuses their install", async () => {
    publisher.publishCatalog([
      await publisher.publishPackage(describeTestExtension({ id: "elsewhere", platforms: ["other-os-x64"] })),
      await publisher.publishPackage(describeTestExtension({ id: "future", version: "2.0.0", contractVersion: 2 })),
    ]);
    const list = await manager.list({ refreshCatalog: true });
    expect(list.extensions.map((item) => [item.id, item.state, item.notAvailableReason])).toEqual([
      ["elsewhere", "notAvailableHere", "platform"],
      ["future", "notAvailableHere", "newerAutoByteus"],
    ]);
    await expect(manager.install("elsewhere")).rejects.toMatchObject({ code: "EXTENSION_NOT_AVAILABLE" });
    await expect(manager.install("future")).rejects.toMatchObject({ code: "EXTENSION_NOT_AVAILABLE" });
  });

  it("installs: package.new → install(ctx) with progress → package/ → enabled true → start (AC-002, DEC-015)", async () => {
    let release!: () => void;
    steer("hello").startGate = new Promise((resolve) => { release = resolve; });
    const started = await manager.install("hello");
    expect(started).toMatchObject({ state: "installing", progress: { message: "Downloading Hello 1.0.0", percent: null } });
    await expect(manager.install("hello")).rejects.toMatchObject({ code: "EXTENSION_BUSY" });

    await until(async () => (await itemOf("hello"))?.state === "installed", "installed");
    const item = await itemOf("hello");
    expect(item).toMatchObject({ state: "installed", installedVersion: "1.0.0", enabled: true, ready: true, starting: true, update: "none", message: "Ready (1.0.0)." });
    expect(JSON.parse(await fs.readFile(path.join(extensionsDir(), "state.json"), "utf8"))).toEqual({ hello: { enabled: true } });
    expect(await fs.readFile(path.join(extensionsDir(), "hello", "data", "installed-1.0.0.txt"), "utf8")).toBe("1.0.0");
    await expect(fs.access(path.join(extensionsDir(), "hello", "package.new"))).rejects.toThrow();
    release();
    await until(async () => (await itemOf("hello"))?.starting === false, "started");
    expect(steer("hello").calls).toEqual(["install 1.0.0", "start 1.0.0"]);
    expect((await manager.readLog("hello")).join("\n")).toMatch(/install: prepared 1\.0\.0[\s\S]*installed and turned on/);
  });

  it("reports the download, then the extension's own progress from ctx.progress", async () => {
    let answer!: () => void;
    const held = new Promise<void>((resolve) => { answer = resolve; });
    const fetchAll = web.fetch;
    manager = composeExtensions({
      dataDir: root, platform: TEST_PLATFORM, isDesktopNode: true,
      catalogSource: { url: CATALOG_URL, publicKeyPem: publisher.publicKeyPem },
      fetch: async (input, init) => {
        if (String(input).endsWith(".tar.gz")) await held;
        return fetchAll(input, init);
      },
    });
    let finishInstall!: () => void;
    steer("hello").installGate = new Promise((resolve) => { finishInstall = resolve; });
    await manager.install("hello");
    expect(await itemOf("hello")).toMatchObject({ state: "installing", progress: { message: "Downloading Hello 1.0.0", percent: null } });
    answer();
    await until(async () => (await itemOf("hello"))?.progress?.message === "Preparing hello 1.0.0", "install progress");
    expect((await itemOf("hello"))?.progress).toEqual({ message: "Preparing hello 1.0.0", percent: 40 });
    finishInstall();
    await until(async () => (await itemOf("hello"))?.state === "installed", "installed");
  });

  it("fails the install on a checksum mismatch: Failed with the reason and Install again; nothing installed (V13-02)", async () => {
    const entry = await publisher.publishPackage(describeTestExtension());
    publisher.publishCatalog([{ ...entry, sha256: "0".repeat(64) }]);
    await manager.install("hello");
    await until(async () => (await itemOf("hello"))?.state === "failed", "failed");
    expect(await itemOf("hello")).toMatchObject({ state: "failed", failureMessage: expect.stringContaining("does not match the signed list of extensions"), installedVersion: null });
    await expect(fs.access(path.join(extensionsDir(), "hello", "package"))).rejects.toThrow();
    expect(await fs.readFile(path.join(extensionsDir(), "state.json"), "utf8").catch(() => null)).toBeNull();
    expect((await manager.readLog("hello")).join("\n")).toContain("install failed");

    // After a restart the failure is gone: Not installed.
    manager = newManager();
    expect((await manager.list({ refreshCatalog: true })).extensions[0]).toMatchObject({ state: "notInstalled" });

    // Install again with the right package works.
    publisher.publishCatalog([entry]);
    await installed();
  });

  it("refuses a package that differs from its catalog entry, or whose install(ctx) fails", async () => {
    const entry = await publisher.publishPackage(describeTestExtension({ description: "packaged text" }));
    publisher.publishCatalog([{ ...entry, description: "catalog text" }]);
    await manager.install("hello");
    await until(async () => (await itemOf("hello"))?.state === "failed", "failed");
    expect((await itemOf("hello"))?.failureMessage).toContain("does not describe the same extension");

    publisher.publishCatalog([entry]);
    steer("hello").installError = "the runtime download stopped";
    await manager.install("hello");
    await until(async () => (await itemOf("hello"))?.state === "failed", "failed");
    expect((await itemOf("hello"))?.failureMessage).toBe("the runtime download stopped");
    await expect(fs.access(path.join(extensionsDir(), "hello", "package.new"))).rejects.toThrow();
  });

  it("refuses Install and Update when the catalog fetch does not verify, and keeps installed ones listed (V13)", async () => {
    await installed();
    publisher.publishCatalog([await publisher.publishPackage(describeTestExtension({ version: "1.1.0" }))], new TestCatalogPublisher(web).keys.privateKey);
    const list = await manager.list({ refreshCatalog: true });
    expect(list.catalog).toBe("unverified");
    expect(list.extensions).toEqual([expect.objectContaining({ id: "hello", state: "installed", catalogVersion: "1.0.0", update: "none" })]);
    await expect(manager.update("hello")).rejects.toMatchObject({ code: "EXTENSION_CATALOG_NOT_VERIFIED" });

    web.unreachable = true;
    expect(await manager.list({ refreshCatalog: true })).toMatchObject({ catalog: "unreachable", extensions: [expect.objectContaining({ state: "installed" })] });
    manager = newManager();
    expect(await manager.list({ refreshCatalog: true })).toMatchObject({ catalog: "unreachable", extensions: [expect.objectContaining({ id: "hello", state: "installed", catalogVersion: null })] });
  });

  it("updates to a newer catalog version, keeping data and enabled (AC-003)", async () => {
    await installed();
    const newer = await publisher.publishPackage(describeTestExtension({ version: "1.1.0" }));
    publisher.publishCatalog([newer]);
    expect(await itemOf("hello", true)).toMatchObject({ update: "available", catalogVersion: "1.1.0", installedVersion: "1.0.0" });
    expect(await manager.update("hello")).toMatchObject({ state: "updating", installedVersion: "1.0.0" });
    await until(async () => (await itemOf("hello"))?.installedVersion === "1.1.0" && (await itemOf("hello"))?.state === "installed", "updated");
    await until(async () => (await itemOf("hello"))?.starting === false, "started");
    expect(await itemOf("hello")).toMatchObject({ enabled: true, update: "none", message: "Ready (1.1.0)." });
    expect(await fs.readFile(path.join(extensionsDir(), "hello", "data", "installed-1.0.0.txt"), "utf8")).toBe("1.0.0");
    expect(steer("hello").calls).toEqual(["install 1.0.0", "start 1.0.0", "stop 1.0.0", "install 1.1.0", "start 1.1.0"]);
    expect(await manager.callAction("hello", "echo", { json: null, bytes: null })).toMatchObject({ version: "1.1.0" });
  });

  it("keeps the old version working when an update fails: message and Update still offered (AC-003)", async () => {
    await installed();
    publisher.publishCatalog([await publisher.publishPackage(describeTestExtension({ version: "1.1.0" }), {
      serverSource: "export default { install() { throw new Error('model download failed'); }, status() {}, stop() {}, actions: {} };",
    })]);
    await manager.update("hello");
    await until(async () => (await itemOf("hello"))?.state === "installed", "back to installed");
    await until(async () => (await itemOf("hello"))?.starting === false, "started again");
    expect(await itemOf("hello", true)).toMatchObject({
      state: "installed", installedVersion: "1.0.0", enabled: true, update: "available",
      message: "Update to 1.1.0 failed: model download failed",
    });
    expect(await manager.callAction("hello", "echo", { json: 1, bytes: null })).toMatchObject({ version: "1.0.0", json: 1 });
  });

  it("shows 'needs a newer AutoByteus' for a newer version with a newer contract (V13-05)", async () => {
    await installed();
    publisher.publishCatalog([await publisher.publishPackage(describeTestExtension({ version: "2.0.0", contractVersion: 2 }))]);
    expect(await itemOf("hello", true)).toMatchObject({ state: "installed", update: "needsNewerAutoByteus", catalogVersion: "2.0.0" });
    await expect(manager.update("hello")).rejects.toMatchObject({ code: "EXTENSION_NOT_AVAILABLE" });
  });

  it("turns off (stop) and on (start); a late start() after Off is ignored (Guidance)", async () => {
    await installed();
    await until(async () => (await itemOf("hello"))?.starting === false, "started");
    let release!: () => void;
    steer("hello").startGate = new Promise((resolve) => { release = resolve; });
    steer("hello").startError = "worker exited 1";
    expect(await manager.setEnabled("hello", false)).toMatchObject({ enabled: false, starting: false });
    expect(await manager.setEnabled("hello", true)).toMatchObject({ enabled: true, starting: true });
    await manager.setEnabled("hello", false);
    release();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await itemOf("hello")).toMatchObject({ enabled: false, starting: false, message: "Ready (1.0.0)." });
    await expect(manager.callAction("hello", "echo", { json: null, bytes: null })).rejects.toMatchObject({ code: "EXTENSION_OFF" });
    expect(JSON.parse(await fs.readFile(path.join(extensionsDir(), "state.json"), "utf8"))).toEqual({ hello: { enabled: false } });

    await manager.setEnabled("hello", true);
    await until(async () => (await itemOf("hello"))?.starting === false, "start failed");
    expect(await itemOf("hello")).toMatchObject({ message: "Could not start: worker exited 1" });
  });

  it("gates actions: not installed, off, unknown or inherited name, failing action; bytes and JSON reach it", async () => {
    await expect(manager.callAction("hello", "echo", { json: null, bytes: null })).rejects.toMatchObject({ code: "EXTENSION_NOT_INSTALLED" });
    await expect(manager.callAction("../etc", "echo", { json: null, bytes: null })).rejects.toMatchObject({ code: "EXTENSION_NOT_INSTALLED" });
    await installed();
    expect(await manager.callAction("hello", "echo", { json: { a: 1 }, bytes: null })).toEqual({ version: "1.0.0", json: { a: 1 }, bytes: null });
    expect(await manager.callAction("hello", "echo", { json: null, bytes: new Uint8Array(7) })).toMatchObject({ bytes: 7 });
    await expect(manager.callAction("hello", "constructor", { json: null, bytes: null })).rejects.toMatchObject({ code: "UNKNOWN_ACTION" });
    await expect(manager.callAction("hello", "toString", { json: null, bytes: null })).rejects.toMatchObject({ code: "UNKNOWN_ACTION" });
    await expect(manager.callAction("hello", "nothing", { json: null, bytes: null })).rejects.toMatchObject({ code: "UNKNOWN_ACTION" });
    await expect(manager.callAction("hello", "fail", { json: null, bytes: null })).rejects.toMatchObject({ code: "ACTION_FAILED", message: "echo failed on purpose" });
  });

  it("removes: stop, delete the folder, then the entry; Install works again", async () => {
    await installed();
    expect(await manager.remove("hello")).toMatchObject({ state: "notInstalled" });
    await expect(fs.access(path.join(extensionsDir(), "hello"))).rejects.toThrow();
    expect(JSON.parse(await fs.readFile(path.join(extensionsDir(), "state.json"), "utf8"))).toEqual({});
    expect(steer("hello").calls.at(-1)).toBe("stop 1.0.0");
    await expect(manager.remove("hello")).rejects.toMatchObject({ code: "EXTENSION_NOT_INSTALLED" });
    await installed();
  });

  it("contains a broken extension: Failed with a message, others work, nothing deleted (V12, AC-011)", async () => {
    publisher.publishCatalog([
      await publisher.publishPackage(describeTestExtension()),
      await publisher.publishPackage(describeTestExtension({ id: "other", name: "Other" })),
    ]);
    await manager.list({ refreshCatalog: true });
    await installed("hello");
    await installed("other");
    const description = path.join(extensionsDir(), "hello", "package", "extension.json");
    await fs.writeFile(description, "{ not json");
    manager = newManager();
    const list = await manager.list({ refreshCatalog: false });
    expect(list.extensions.find((item) => item.id === "hello")).toMatchObject({ state: "failed", failureMessage: expect.stringContaining("cannot be read") });
    expect(list.extensions.find((item) => item.id === "other")).toMatchObject({ state: "installed", enabled: true });
    expect(await fs.readFile(description, "utf8")).toBe("{ not json");

    steer("other").statusError = "status exploded";
    expect(await itemOf("other")).toMatchObject({ state: "failed", failureMessage: "status exploded", installedVersion: "1.0.0", enabled: true });
  });

  it("reads an unreadable state.json as everything Off and does not rewrite it until a change (V12-02)", async () => {
    await installed();
    const file = path.join(extensionsDir(), "state.json");
    await fs.writeFile(file, "garbage");
    manager = newManager();
    expect(await itemOf("hello")).toMatchObject({ state: "installed", enabled: false });
    expect(await fs.readFile(file, "utf8")).toBe("garbage");
    await manager.setEnabled("hello", true);
    expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual({ hello: { enabled: true } });
  });

  it("starts the extensions that are on after the node listens, and stops them all at shutdown (DS-006)", async () => {
    publisher.publishCatalog([
      await publisher.publishPackage(describeTestExtension()),
      await publisher.publishPackage(describeTestExtension({ id: "other", name: "Other" })),
    ]);
    await manager.list({ refreshCatalog: true });
    await installed("hello");
    await installed("other");
    await manager.setEnabled("other", false);
    await manager.stopAll();
    steer("hello").calls.length = 0;
    steer("other").calls.length = 0;

    manager = newManager();
    await manager.startEnabled();
    await until(async () => steer("hello").calls.includes("start 1.0.0"), "hello started");
    expect(steer("other").calls).toEqual([]);
    await manager.stopAll();
    expect(steer("hello").calls).toEqual(["start 1.0.0", "stop 1.0.0"]);
  });

  it("serves the page's files from package/ui only", async () => {
    await installed();
    expect(await manager.pageFile("hello", "index.html")).toBe(path.join(extensionsDir(), "hello", "package", "ui", "index.html"));
    expect(await manager.pageFile("hello", "../server/index.mjs")).toBeNull();
    expect(await manager.pageFile("hello", "missing.js")).toBeNull();
    expect(await manager.pageFile("nothing", "index.html")).toBeNull();
  });

  it("autobyteus-661: one extension that is on per role; only it gets ctx.privateNetwork, and it is the role's provider", async () => {
    publisher.publishCatalog([
      await publisher.publishPackage(describeTestExtension()),
      await publisher.publishPackage(describeTestExtension({ id: "network-a", name: "Network A", provides: "private-network" })),
      await publisher.publishPackage(describeTestExtension({ id: "network-b", name: "Network B", provides: "private-network" })),
    ]);
    manager = composeExtensions({
      dataDir: root, platform: TEST_PLATFORM, isDesktopNode: true,
      catalogSource: { url: CATALOG_URL, publicKeyPem: publisher.publicKeyPem }, fetch: web.fetch,
      privateNetwork: () => ({ callerSocketPath: "/data/private-network/caller.sock", nodePort: 29695 }),
    });
    await expect(manager.enabledProvider("private-network")).resolves.toBeNull();
    await installed("network-a");
    await installed("hello");
    await expect(manager.enabledProvider("private-network")).resolves.toBe("network-a");
    await expect(manager.callAction("network-a", "privateNetwork", { json: null, bytes: null }))
      .resolves.toEqual({ callerSocketPath: "/data/private-network/caller.sock", nodePort: 29695 });
    await expect(manager.callAction("hello", "privateNetwork", { json: null, bytes: null })).resolves.toBeNull();
    // A second provider installs but stays off, and cannot be turned on while the first is on.
    await installed("network-b");
    expect(await itemOf("network-b")).toMatchObject({ state: "installed", enabled: false });
    await expect(manager.setEnabled("network-b", true)).rejects.toMatchObject({ code: "EXTENSION_ROLE_TAKEN" });
    await manager.setEnabled("network-a", false);
    await expect(manager.enabledProvider("private-network")).resolves.toBeNull();
    await expect(manager.setEnabled("network-b", true)).resolves.toMatchObject({ enabled: true });
    await expect(manager.enabledProvider("private-network")).resolves.toBe("network-b");
  });
});
