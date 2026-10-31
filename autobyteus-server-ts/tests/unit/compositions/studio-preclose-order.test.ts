/**
 * autobyteus-339 AR-003: the client-connection close is the studio server's last `preClose` hook,
 * after the native command drain and the WebSocket plugin's client close, so its final
 * `closeAllConnections()` directly precedes `server.close()`. Builds the real studio server and labels
 * every `preClose` hook by the file that registered it; then closes the server and checks the run order.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  registered: [] as Array<{ owner: object; label: string }>,
  ran: [] as Array<{ owner: object; label: string }>,
}));

const labelFromStack = (stack: string): string => {
  if (stack.includes("client-connection-close")) return "client-connection-close";
  if (stack.includes("native-command-shutdown")) return "native-command-drain";
  if (stack.includes("@fastify/websocket") || stack.includes("@fastify+websocket")) return "websocket-plugin";
  return "other";
};

vi.mock("fastify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fastify")>();
  const create = (...args: Parameters<typeof actual.default>) => {
    const app = actual.default(...args);
    const addHook = app.addHook;
    // Unbound wrapper: encapsulated child contexts keep registering on themselves.
    (app as { addHook: unknown }).addHook = function (this: object, name: string, fn: (...a: unknown[]) => unknown) {
      if (name !== "preClose") return (addHook as (...a: unknown[]) => unknown).call(this, name, fn);
      const label = labelFromStack(new Error().stack ?? "");
      const owner = this;
      hooks.registered.push({ owner, label });
      // Keep the hook's style (async or callback) and arity: Fastify chooses how to call it by them.
      const labelled = fn.constructor.name === "AsyncFunction"
        ? async function (this: unknown, ...hookArgs: unknown[]) { hooks.ran.push({ owner, label }); return fn.apply(this, hookArgs); }
        : function (this: unknown, ...hookArgs: unknown[]) { hooks.ran.push({ owner, label }); return fn.apply(this, hookArgs); };
      Object.defineProperty(labelled, "length", { value: fn.length });
      return (addHook as (...a: unknown[]) => unknown).call(this, name, labelled);
    };
    return app;
  };
  return { ...actual, default: Object.assign(create, actual.default) };
});

import { buildStudioServer } from "../../../src/compositions/build-studio-server.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

let dataDir: string | null = null;
afterAll(() => { if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true }); });

describe("studio server preClose order", () => {
  it("runs the client-connection close last, after the native drain and the WebSocket plugin", async () => {
    dataDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "studio-preclose-order-")));
    fs.writeFileSync(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    if (!appConfigProvider.config.isInitialized()) appConfigProvider.config.initialize();
    const studio = await buildStudioServer({
      appConfig: appConfigProvider.config,
      loggingConfig: { pinoLogLevel: "silent", httpAccessLogMode: "off", includeNoisyHttpAccessRoutes: false, scopedLogLevelOverrides: [] },
    });
    const studioHooks = hooks.registered.filter((entry) => entry.owner === studio.fastify).map((entry) => entry.label);
    const otherContexts = hooks.registered.filter((entry) => entry.owner !== studio.fastify
      && Object.prototype.isPrototypeOf.call(studio.fastify, entry.owner));

    expect(studioHooks).toEqual(["native-command-drain", "websocket-plugin", "client-connection-close"]);
    expect(otherContexts).toEqual([]);

    await studio.fastify.close();
    expect(hooks.ran.filter((entry) => entry.owner === studio.fastify).map((entry) => entry.label))
      .toEqual(["native-command-drain", "websocket-plugin", "client-connection-close"]);
  }, 60_000);
});
