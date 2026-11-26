import { createHash, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { create } from "tar";

/**
 * Real extension packages and signed catalogs for tests (extension-contract.md §1–§4), served by an in-memory web
 * whose `fetch` the catalog and the package installer receive. The signing key pair is made per test.
 */

export type TestDescription = {
  id: string;
  name: string;
  description: string;
  version: string;
  contractVersion: number;
  offeredOn: "desktop-node" | "every-node";
  platforms: string[];
  translations?: Record<string, { name: string; description: string }>;
};

export const TEST_PLATFORM = "test-os-arm64";

export const describeTestExtension = (overrides: Partial<TestDescription> = {}): TestDescription => ({
  id: "hello",
  name: "Hello",
  description: "Says hello. Downloads nothing.",
  version: "1.0.0",
  contractVersion: 1,
  offeredOn: "every-node",
  platforms: [TEST_PLATFORM],
  ...overrides,
});

/**
 * A server part whose behavior a test steers through `globalThis.__extensionTest[<id>]` (the module runs in the
 * test's own process): `startGate` / `installGate` hold `start()` / `install()` until resolved, `startError` / `statusError` / `installError`
 * make those steps fail. It records its calls in `calls`.
 */
export const steerableServerPart = (version: string): string => `
import fs from "node:fs/promises";
import path from "node:path";
const steer = (ctx) => {
  globalThis.__extensionTest ??= {};
  return globalThis.__extensionTest[path.basename(path.dirname(ctx.dir))] ??= { calls: [] };
};
export default {
  async install(ctx) {
    const s = steer(ctx); s.calls.push("install ${version}");
    ctx.progress({ message: "Preparing hello ${version}", percent: 40 });
    if (s.installGate) await s.installGate;
    if (s.installError) throw new Error(s.installError);
    await fs.writeFile(path.join(ctx.dir, "installed-${version}.txt"), "${version}");
    ctx.log("install: prepared ${version}");
  },
  async start(ctx) {
    const s = steer(ctx); s.calls.push("start ${version}");
    if (s.startGate) await s.startGate;
    if (s.startError) throw new Error(s.startError);
  },
  async status(ctx) {
    const s = steer(ctx);
    if (s.statusError) throw new Error(s.statusError);
    return { ready: true, message: "Ready (${version})." };
  },
  async stop(ctx) { steer(ctx).calls.push("stop ${version}"); },
  actions: {
    async echo(ctx, input) {
      return { version: "${version}", json: input.json, bytes: input.bytes ? input.bytes.length : null };
    },
    async fail() { throw new Error("echo failed on purpose"); },
  },
};
`;

export type TestPackage = Readonly<{ bytes: Buffer; sha256: string }>;

export const buildTestPackage = async (input: {
  description: TestDescription;
  serverSource?: string;
  files?: Record<string, string>;
  omit?: string[];
}): Promise<TestPackage> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-test-package-"));
  try {
    const files: Record<string, string> = {
      "extension.json": JSON.stringify(input.description, null, 2),
      "server/index.mjs": input.serverSource ?? steerableServerPart(input.description.version),
      "ui/index.html": "<!doctype html><title>page</title><p>page</p>",
      ...input.files,
    };
    for (const name of input.omit ?? []) delete files[name];
    for (const [name, text] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(path.join(root, name), text);
    }
    const archive = path.join(root, "..", `${path.basename(root)}.tar.gz`);
    await create({ gzip: true, file: archive, cwd: root, portable: true }, Object.keys(files));
    const bytes = await fs.readFile(archive);
    await fs.rm(archive, { force: true });
    return { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
};

/** An in-memory web: `fetch` answers the URLs it holds, 404 otherwise; `unreachable` makes every fetch throw. */
export class TestWeb {
  readonly files = new Map<string, Buffer>();
  unreachable = false;
  readonly requested: string[] = [];

  readonly fetch: typeof fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    this.requested.push(url);
    if (this.unreachable) throw new TypeError("fetch failed");
    const body = this.files.get(url);
    return body ? new Response(new Uint8Array(body)) : new Response("not found", { status: 404 });
  };
}

export const CATALOG_URL = "https://extensions.test/catalog/extensions-catalog.json";

export class TestCatalogPublisher {
  readonly keys = generateKeyPairSync("ed25519");
  readonly publicKeyPem = this.keys.publicKey.export({ type: "spki", format: "pem" }).toString();

  constructor(readonly web: TestWeb) {}

  /** Publishes a package at `https://extensions.test/<id>-<version>.tar.gz` and returns its catalog entry. */
  async publishPackage(
    description: TestDescription,
    options: { serverSource?: string; files?: Record<string, string>; omit?: string[] } = {},
  ): Promise<TestDescription & { packageUrl: string; sha256: string }> {
    const built = await buildTestPackage({ description, ...options });
    const packageUrl = `https://extensions.test/${description.id}-${description.version}.tar.gz`;
    this.web.files.set(packageUrl, built.bytes);
    return { ...description, packageUrl, sha256: built.sha256 };
  }

  /** Signs and publishes the catalog; `signWith` another key makes it unverifiable. */
  publishCatalog(entries: unknown[], signWith: KeyObject = this.keys.privateKey): void {
    const bytes = Buffer.from(JSON.stringify({ extensions: entries }));
    this.web.files.set(CATALOG_URL, bytes);
    this.web.files.set(`${CATALOG_URL}.sig`, Buffer.from(sign(null, bytes, signWith).toString("base64")));
  }
}

/**
 * The node's real extension routes (action call and page files) for a test that sends requests through Fastify's
 * `inject`, without a network (used by the web's voice integration test, which has no Fastify of its own).
 */
export const extensionRoutesApp = async (extensions: import("../../src/extensions/services/extension-manager.js").ExtensionManager) => {
  const { default: fastify } = await import("fastify");
  const { registerExtensionRoutes } = await import("../../src/api/rest/extensions.js");
  const app = fastify();
  await app.register(async (rest) => registerExtensionRoutes(rest, { extensions }), { prefix: "/rest" });
  await app.ready();
  return app;
};
