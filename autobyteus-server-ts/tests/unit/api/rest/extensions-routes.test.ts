import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerGraphql } from "../../../../src/api/graphql/index.js";
import { EXTENSION_ACTION_BODY_LIMIT_BYTES, registerExtensionRoutes } from "../../../../src/api/rest/extensions.js";
import { routeAccessFor } from "../../../../src/api/security/node-route-permissions.js";
import { composeExtensions } from "../../../../src/compositions/extensions-composition.js";
import type { ExtensionManager } from "../../../../src/extensions/services/extension-manager.js";
import { registerTestNodeAccess } from "../../../helpers/node-access-test-gate.js";
import {
  CATALOG_URL,
  describeTestExtension,
  TEST_PLATFORM,
  TestCatalogPublisher,
  TestWeb,
} from "../../../fixtures/extension-packages.js";

/**
 * The extensions' transport (extension-contract.md §6; design DS-004/DS-005): the action route with JSON and WAV
 * bodies and its error codes, the page route with its CSP, and owner only everywhere (REQ-005, AC-006).
 */
const OWNER = `own_${"o".repeat(43)}`;
const PHONE = `mra_${"p".repeat(43)}`;
const owner = { authorization: `Bearer ${OWNER}` };
const phone = { authorization: `Bearer ${PHONE}` };

describe("extension routes and GraphQL", () => {
  let root: string;
  let app: FastifyInstance;
  let manager: ExtensionManager;

  const gql = async (query: string, headers: Record<string, string>) => (await app.inject({
    method: "POST", url: "/graphql", headers: { ...headers, "content-type": "application/json" }, payload: JSON.stringify({ query }),
  })).json() as { data?: Record<string, unknown> | null; errors?: { extensions?: { code?: string } }[] };

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-extension-routes-"));
    const web = new TestWeb();
    const publisher = new TestCatalogPublisher(web);
    publisher.publishCatalog([await publisher.publishPackage(describeTestExtension(), {
      files: { "ui/index.html": "<!doctype html><script src=\"page.js\"></script>", "ui/page.js": "console.log(1)" },
    })]);
    manager = composeExtensions({
      dataDir: root, platform: TEST_PLATFORM, isDesktopNode: false,
      catalogSource: { url: CATALOG_URL, publicKeyPem: publisher.publicKeyPem }, fetch: web.fetch,
    });
    app = fastify();
    await registerTestNodeAccess(app, {
      launchCredential: OWNER,
      verifiers: [{ prefix: "mra_", verify: (credential) => credential === PHONE
        ? { ok: true, identity: { kind: "phone", deviceId: "phone-1" } }
        : { ok: false, refusal: { code: "NODE_CREDENTIAL_INVALID", message: "no" } as never } }],
    });
    await app.register(async (rest) => registerExtensionRoutes(rest, { extensions: manager }), { prefix: "/rest" });
    await registerGraphql(app, { extensions: manager });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await manager.stopAll();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("classifies every extension route as owner only (SP-1)", () => {
    for (const route of ["/rest/extensions/:id/actions/:action", "/rest/extensions/:id/ui/*"]) {
      const access = routeAccessFor({ method: "POST", route, isWebSocketUpgrade: false });
      expect(access.kind === "clients" ? [...access.permitted] : access.kind).toEqual(["owner"]);
    }
  });

  it("NAS-43 refuses a phone or no credential on the list, every mutation, actions and pages (AC-006)", async () => {
    for (const query of [
      "{ extensions { catalog } }", "{ extensionLog(id: \"hello\") }", "mutation { installExtension(id: \"hello\") { id } }",
      "mutation { setExtensionEnabled(id: \"hello\", enabled: true) { id } }", "mutation { removeExtension(id: \"hello\") { id } }",
      "mutation { updateExtension(id: \"hello\") { id } }",
    ]) {
      expect((await gql(query, phone)).errors?.[0]?.extensions?.code).toBe("NODE_ROUTE_NOT_PERMITTED");
    }
    expect((await app.inject({ method: "POST", url: "/graphql", payload: { query: "{ extensions { catalog } }" } })).statusCode).toBe(401);
    for (const headers of [phone, {}]) {
      expect((await app.inject({ method: "POST", url: "/rest/extensions/hello/actions/echo", headers, payload: {} })).statusCode).toBeGreaterThanOrEqual(401);
      expect((await app.inject({ method: "GET", url: "/rest/extensions/hello/ui/index.html", headers })).statusCode).toBeGreaterThanOrEqual(401);
    }
  });

  it("NAS-42 lists and installs through GraphQL for the owner", async () => {
    const listed = await gql("{ extensions(refreshCatalog: true) { catalog extensions { id state catalogVersion translations } } }", owner);
    expect(listed.data?.extensions).toEqual({ catalog: "verified", extensions: [{ id: "hello", state: "notInstalled", catalogVersion: "1.0.0", translations: null }] });
    const installing = await gql("mutation { installExtension(id: \"hello\") { state progress { message percent } } }", owner);
    expect(installing.data?.installExtension).toEqual({ state: "installing", progress: { message: "Downloading Hello 1.0.0", percent: null } });
    const deadline = Date.now() + 5_000;
    while ((await gql("{ extensions { extensions { state } } }", owner)).data?.extensions !== undefined) {
      const state = ((await gql("{ extensions { extensions { state } } }", owner)).data?.extensions as { extensions: { state: string }[] }).extensions[0]?.state;
      if (state === "installed") break;
      if (Date.now() > deadline) throw new Error(`still ${state}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const refused = await gql("mutation { installExtension(id: \"hello\") { id } }", owner);
    expect(refused.errors?.[0]?.extensions?.code).toBe("EXTENSION_ALREADY_INSTALLED");
    expect((await gql("{ extensionLog(id: \"hello\") }", owner)).data?.extensionLog).toEqual(expect.arrayContaining([expect.stringContaining("installed and turned on")]));
  });

  it("calls an action with JSON or a WAV body and answers { output } or { code, message }", async () => {
    const json = await app.inject({ method: "POST", url: "/rest/extensions/hello/actions/echo", headers: owner, payload: { language: "en" } });
    expect(json.json()).toEqual({ output: { version: "1.0.0", json: { language: "en" }, bytes: null } });
    const wav = await app.inject({
      method: "POST", url: "/rest/extensions/hello/actions/echo",
      headers: { ...owner, "content-type": "audio/wav" }, payload: Buffer.alloc(3 * 1024 * 1024, 1),
    });
    expect(wav.json()).toEqual({ output: { version: "1.0.0", json: null, bytes: 3 * 1024 * 1024 } });
    const unknown = await app.inject({ method: "POST", url: "/rest/extensions/hello/actions/constructor", headers: owner, payload: {} });
    expect([unknown.statusCode, unknown.json().code]).toEqual([404, "UNKNOWN_ACTION"]);
    const failing = await app.inject({ method: "POST", url: "/rest/extensions/hello/actions/fail", headers: owner, payload: {} });
    expect([failing.statusCode, failing.json()]).toEqual([500, { code: "ACTION_FAILED", message: "echo failed on purpose" }]);
    const missing = await app.inject({ method: "POST", url: "/rest/extensions/nothing/actions/echo", headers: owner, payload: {} });
    expect([missing.statusCode, missing.json().code]).toEqual([404, "EXTENSION_NOT_INSTALLED"]);
    const tooLong = await app.inject({
      method: "POST", url: "/rest/extensions/hello/actions/echo",
      headers: { ...owner, "content-type": "audio/wav" }, payload: Buffer.alloc(EXTENSION_ACTION_BODY_LIMIT_BYTES + 1),
    });
    expect([tooLong.statusCode, tooLong.json().code]).toEqual([413, "RECORDING_TOO_LONG"]);

    await gql("mutation { setExtensionEnabled(id: \"hello\", enabled: false) { enabled } }", owner);
    const off = await app.inject({ method: "POST", url: "/rest/extensions/hello/actions/echo", headers: owner, payload: {} });
    expect([off.statusCode, off.json().code]).toEqual([409, "EXTENSION_OFF"]);
    await gql("mutation { setExtensionEnabled(id: \"hello\", enabled: true) { enabled } }", owner);
  });

  it("serves the page and its files from ui/ with the sandbox CSP, and nothing outside ui/ (contract §2, §5)", async () => {
    const page = await app.inject({ method: "GET", url: "/rest/extensions/hello/ui/index.html", headers: { ...owner, host: "127.0.0.1:29695" } });
    expect(page.statusCode).toBe(200);
    expect(page.headers["content-type"]).toMatch(/^text\/html/);
    const ui = "http://127.0.0.1:29695/rest/extensions/hello/ui/";
    expect(page.headers["content-security-policy"]).toBe([
      "sandbox allow-scripts", "default-src 'none'", `script-src 'unsafe-inline' ${ui}`, `style-src 'unsafe-inline' ${ui}`,
      `img-src ${ui} data:`, "font-src data:", "connect-src 'none'", "form-action 'none'",
    ].join("; "));
    const script = await app.inject({ method: "GET", url: "/rest/extensions/hello/ui/page.js", headers: owner });
    expect([script.statusCode, script.body]).toEqual([200, "console.log(1)"]);
    for (const url of ["/rest/extensions/hello/ui/../server/index.mjs", "/rest/extensions/hello/ui/%2e%2e/server/index.mjs", "/rest/extensions/hello/ui/nothing.js"]) {
      expect((await app.inject({ method: "GET", url, headers: owner })).statusCode).toBe(404);
    }
  });
});
