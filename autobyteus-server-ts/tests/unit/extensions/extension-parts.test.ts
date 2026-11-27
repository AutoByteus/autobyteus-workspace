import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { create } from "tar";
import { ExtensionCatalog } from "../../../src/extensions/catalog/extension-catalog.js";
import { readExtensionCatalogSource, EXTENSIONS_CATALOG_PUBLIC_KEY_PEM, EXTENSIONS_CATALOG_URL } from "../../../src/extensions/catalog/extension-catalog-source.js";
import {
  compareExtensionVersions,
  describesSameExtension,
  readExtensionCatalogEntry,
  readExtensionDescription,
} from "../../../src/extensions/domain/extension-description.js";
import { ExtensionPackageInstaller } from "../../../src/extensions/packages/extension-package-installer.js";
import { ServerPartHost } from "../../../src/extensions/server-parts/server-part-host.js";
import { EXTENSION_LOG_MAX_BYTES, ExtensionLog } from "../../../src/extensions/storage/extension-log.js";
import { ExtensionStateStore } from "../../../src/extensions/storage/extension-state-store.js";
import {
  CATALOG_URL,
  describeTestExtension,
  TestCatalogPublisher,
  TestWeb,
} from "../../fixtures/extension-packages.js";

let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-extension-parts-")); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

describe("extension description (contract §1, §3)", () => {
  it("reads the fields it uses, ignores the rest, keeps valid translations", () => {
    const description = readExtensionDescription({
      ...describeTestExtension(), icon: "ignored.png", translations: { "zh-CN": { name: "你好", description: "说你好" }, bad: { name: 1 } },
    });
    expect(description).toEqual({ ...describeTestExtension(), translations: { "zh-CN": { name: "你好", description: "说你好" } } });
    expect(() => readExtensionDescription({ ...describeTestExtension(), id: "Hello World" })).toThrow(/id/);
    expect(() => readExtensionDescription({ ...describeTestExtension(), version: "1.0" })).toThrow(/version/);
    expect(() => readExtensionDescription({ ...describeTestExtension(), offeredOn: "phone" })).toThrow(/offeredOn/);
    expect(() => readExtensionCatalogEntry({ ...describeTestExtension(), packageUrl: "file:///x", sha256: "0".repeat(64) })).toThrow(/packageUrl/);
  });

  it("compares package and entry without packageUrl and sha256, translations included", () => {
    const entry = readExtensionCatalogEntry({ ...describeTestExtension(), packageUrl: "https://x/p.tar.gz", sha256: "a".repeat(64) });
    expect(describesSameExtension(readExtensionDescription(describeTestExtension()), entry)).toBe(true);
    expect(describesSameExtension(readExtensionDescription({ ...describeTestExtension(), translations: { "zh-CN": { name: "x", description: "y" } } }), entry)).toBe(false);
    expect(compareExtensionVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareExtensionVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("uses the built-in catalog URL unless a developer's catalog is set", () => {
    expect(readExtensionCatalogSource({}).url).toBe(EXTENSIONS_CATALOG_URL);
    expect(EXTENSIONS_CATALOG_URL).toBe("https://github.com/AutoByteus/autobyteus-extensions/releases/download/catalog/extensions-catalog.json");
    expect(readExtensionCatalogSource({ AUTOBYTEUS_EXTENSIONS_CATALOG_URL: "https://dev/c.json", AUTOBYTEUS_EXTENSIONS_CATALOG_PUBLIC_KEY: "PEM" }))
      .toEqual({ url: "https://dev/c.json", publicKeyPem: "PEM" });
  });
});

describe("ExtensionCatalog (contract §3; AR-002 fetch policy)", () => {
  it("verifies the real published catalog with the built-in key (autobyteus-657), offline", async () => {
    // The `catalog` release's two assets as published on 2026-11-26: the built-in key is the signing key's public half.
    const published = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/published-extensions-catalog");
    const files = new Map([
      [EXTENSIONS_CATALOG_URL, await fs.readFile(path.join(published, "extensions-catalog.json"))],
      [`${EXTENSIONS_CATALOG_URL}.sig`, await fs.readFile(path.join(published, "extensions-catalog.json.sig"))],
    ]);
    const offline: typeof fetch = async (input) => {
      const body = files.get(String(input));
      return body ? new Response(new Uint8Array(body)) : new Response("not found", { status: 404 });
    };
    const catalog = new ExtensionCatalog(readExtensionCatalogSource({}), offline);
    const fetched = await catalog.fetch();
    expect(readExtensionCatalogSource({}).publicKeyPem).toBe(EXTENSIONS_CATALOG_PUBLIC_KEY_PEM);
    expect(fetched.status).toBe("verified");
    expect(fetched.entries).toEqual([expect.objectContaining({
      id: "voice-input", version: "1.0.0", offeredOn: "desktop-node",
      packageUrl: "https://github.com/AutoByteus/autobyteus-extensions/releases/download/voice-input-v1.0.0/voice-input-1.0.0.tar.gz",
      sha256: "57e0a541be18f3af12b0b18c177dfe98f29b63952dfed5dcef8903670a8caf8d",
    })]);

    // One byte more and it no longer verifies.
    files.set(EXTENSIONS_CATALOG_URL, Buffer.concat([files.get(EXTENSIONS_CATALOG_URL)!, Buffer.from(" ")]));
    expect((await catalog.fetch()).status).toBe("unverified");
  });

  it("verifies the exact bytes, skips unreadable entries, and keeps the last verified copy", async () => {
    const web = new TestWeb();
    const publisher = new TestCatalogPublisher(web);
    publisher.publishCatalog([
      await publisher.publishPackage(describeTestExtension()),
      { id: "broken" },
    ]);
    const catalog = new ExtensionCatalog({ url: CATALOG_URL, publicKeyPem: publisher.publicKeyPem }, web.fetch);
    expect(catalog.current()).toEqual({ status: "unreachable", entries: [] });
    expect((await catalog.fetch()).entries.map((entry) => entry.id)).toEqual(["hello"]);

    web.files.set(CATALOG_URL, Buffer.concat([web.files.get(CATALOG_URL)!, Buffer.from(" ")]));
    expect(await catalog.fetch()).toMatchObject({ status: "unverified", entries: [expect.objectContaining({ id: "hello" })] });
    web.unreachable = true;
    expect(await catalog.fetch()).toMatchObject({ status: "unreachable", entries: [expect.objectContaining({ id: "hello" })] });
  });

  it("shares one request between fetches at the same time, and never verifies without a public key", async () => {
    const web = new TestWeb();
    const publisher = new TestCatalogPublisher(web);
    publisher.publishCatalog([]);
    const catalog = new ExtensionCatalog({ url: CATALOG_URL, publicKeyPem: publisher.publicKeyPem }, web.fetch);
    await Promise.all([catalog.fetch(), catalog.fetch(), catalog.fetch()]);
    expect(web.requested).toEqual([CATALOG_URL, `${CATALOG_URL}.sig`]);
    const keyless = new ExtensionCatalog({ url: CATALOG_URL, publicKeyPem: "" }, web.fetch);
    expect((await keyless.fetch()).status).toBe("unverified");
  });

  it("answers unreachable when the fetch takes longer than 10 s", async () => {
    const hanging: typeof fetch = (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    });
    const original = AbortSignal.timeout;
    AbortSignal.timeout = () => original.call(AbortSignal, 20);
    try {
      const catalog = new ExtensionCatalog({ url: CATALOG_URL, publicKeyPem: "" }, hanging);
      expect((await catalog.fetch()).status).toBe("unreachable");
    } finally {
      AbortSignal.timeout = original;
    }
  });
});

describe("ExtensionPackageInstaller (contract §2, §3)", () => {
  const archiveOf = async (files: Record<string, string>, extra: (dir: string) => Promise<string[]> = async () => []) => {
    const dir = await fs.mkdtemp(path.join(root, "src-"));
    for (const [name, text] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true });
      await fs.writeFile(path.join(dir, name), text);
    }
    const names = [...Object.keys(files), ...await extra(dir)];
    const file = path.join(root, `${path.basename(dir)}.tar.gz`);
    await create({ gzip: true, file, cwd: dir, portable: true }, names);
    return fs.readFile(file);
  };

  it("refuses a link entry, and a package without its server part", async () => {
    const web = new TestWeb();
    const publisher = new TestCatalogPublisher(web);
    const installer = new ExtensionPackageInstaller(web.fetch);
    const description = describeTestExtension();
    const files = { "extension.json": JSON.stringify(description), "server/index.mjs": "export default {}", "ui/index.html": "<p>" };

    const withLink = await archiveOf(files, async (dir) => { await fs.symlink("/etc/passwd", path.join(dir, "ui", "secret")); return ["ui/secret"]; });
    const entry = { ...(await publisher.publishPackage(description)), translations: null };
    web.files.set(entry.packageUrl, withLink);
    const sha256 = (await import("node:crypto")).createHash("sha256").update(withLink).digest("hex");
    await expect(installer.stage({ ...entry, sha256 }, path.join(root, "staged"))).rejects.toThrow(/entry it may not have: ui\/secret/);

    const noServer = await archiveOf({ "extension.json": JSON.stringify(description), "ui/index.html": "<p>" });
    web.files.set(entry.packageUrl, noServer);
    const sha = (await import("node:crypto")).createHash("sha256").update(noServer).digest("hex");
    await expect(installer.stage({ ...entry, sha256: sha }, path.join(root, "staged"))).rejects.toThrow(/has no server\/index\.mjs/);
  });

  it("swaps a staged package in place of the installed one", async () => {
    const installer = new ExtensionPackageInstaller(new TestWeb().fetch);
    const staged = path.join(root, "x", "package.new");
    const installed = path.join(root, "x", "package");
    await fs.mkdir(staged, { recursive: true });
    await fs.mkdir(installed, { recursive: true });
    await fs.writeFile(path.join(staged, "v"), "new");
    await fs.writeFile(path.join(installed, "v"), "old");
    await installer.swapIn(staged, installed);
    expect(await fs.readFile(path.join(installed, "v"), "utf8")).toBe("new");
    expect(await fs.readdir(path.join(root, "x"))).toEqual(["package"]);
  });
});

describe("ServerPartHost (contract §4)", () => {
  const writePart = async (dir: string, source: string) => {
    await fs.mkdir(path.join(dir, "server"), { recursive: true });
    await fs.writeFile(path.join(dir, "server", "index.mjs"), source);
  };

  it("refuses a module without the contract's shape, and wraps what an extension throws", async () => {
    const host = new ServerPartHost({ platform: "p", log: () => undefined });
    await writePart(path.join(root, "a"), "export default { install() {}, stop() {}, actions: {} };");
    await expect(host.load("a", path.join(root, "a"), path.join(root, "a-data"))).rejects.toThrow(/status/);
    await writePart(path.join(root, "b"), "export default { install() {}, status() { throw 'plain'; }, stop() {}, actions: {} };");
    const part = await host.load("b", path.join(root, "b"), path.join(root, "b-data"));
    await expect(part.status()).rejects.toThrow("plain");
    await writePart(path.join(root, "c"), "throw new Error('syntax-ish');");
    await expect(host.load("c", path.join(root, "c"), path.join(root, "c-data"))).rejects.toThrow(/could not be loaded: syntax-ish/);
  });

  it("imports each load anew, so Remove + Install of the same version gets fresh module state", async () => {
    const host = new ServerPartHost({ platform: "p", log: () => undefined });
    await writePart(path.join(root, "d"), "let n = 0; export default { install() {}, async status() { return { ready: true, message: String(++n) }; }, stop() {}, actions: {} };");
    const first = await host.load("d", path.join(root, "d"), path.join(root, "d-data"));
    expect((await first.status()).message).toBe("1");
    expect((await first.status()).message).toBe("2");
    const second = await host.load("d", path.join(root, "d"), path.join(root, "d-data"));
    expect((await second.status()).message).toBe("1");
  });

  it("gives ctx.dir, ctx.platform and ctx.log, and refuses a status that never answers", async () => {
    const lines: string[] = [];
    const host = new ServerPartHost({ platform: "test-os-x64", log: (id, line) => lines.push(`${id}: ${line}`) });
    await writePart(path.join(root, "e"), "export default { install() {}, status() { return new Promise(() => {}); }, stop() {}, actions: { async where(ctx) { ctx.log('hi'); return { dir: ctx.dir, platform: ctx.platform }; } } };");
    const part = await host.load("e", path.join(root, "e"), path.join(root, "e-data"));
    expect(await part.call("where", { json: null, bytes: null })).toEqual({ dir: path.join(root, "e-data"), platform: "test-os-x64" });
    expect(lines).toEqual(["e: hi"]);
    await expect(fs.access(path.join(root, "e-data"))).resolves.toBeUndefined();
    const timers = await import("vitest").then(({ vi }) => vi);
    timers.useFakeTimers();
    try {
      const status = part.status();
      const outcome = expect(status).rejects.toThrow(/did not answer within 5 seconds/);
      await timers.advanceTimersByTimeAsync(5_000);
      await outcome;
    } finally {
      timers.useRealTimers();
    }
  });
});

describe("ExtensionLog and ExtensionStateStore (contract §7)", () => {
  it("cuts the log to its newer half beyond 1 MB, and drops lines once the folder is gone", async () => {
    const store = new ExtensionStateStore(root);
    const log = new ExtensionLog((id) => store.logFile(id));
    await fs.mkdir(store.folder("x"), { recursive: true });
    const long = "y".repeat(1000);
    for (let index = 0; index < 1100; index += 1) log.append("x", `${index} ${long}`);
    await log.idle("x");
    const { size } = await fs.stat(store.logFile("x"));
    expect(size).toBeLessThanOrEqual(EXTENSION_LOG_MAX_BYTES);
    const lines = await log.tail("x");
    expect(lines).toHaveLength(200);
    expect(lines.at(-1)).toMatch(/^\d{4}-\d{2}-\d{2}T.* 1099 y+$/);
    await fs.rm(store.folder("x"), { recursive: true });
    log.append("x", "after remove");
    await log.idle("x");
    await expect(fs.access(store.folder("x"))).rejects.toThrow();
  });

  it("writes state.json atomically, one change after another", async () => {
    const store = new ExtensionStateStore(root);
    await Promise.all([
      store.update((states) => { states.a = { enabled: true }; }),
      store.update((states) => { states.b = { enabled: false }; }),
    ]);
    expect(JSON.parse(await fs.readFile(path.join(root, "state.json"), "utf8"))).toEqual({ a: { enabled: true }, b: { enabled: false } });
    await fs.writeFile(path.join(root, "state.json"), JSON.stringify({ a: { enabled: "yes" }, b: { enabled: true, extra: 1 } }));
    expect(await store.read()).toEqual({ b: { enabled: true } });
  });
});
