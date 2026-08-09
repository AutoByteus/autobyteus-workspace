import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ApplicationBackendDefinitionLoader } from "../../../src/application-engine/worker/application-backend-definition-loader.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

const writeDefinition = async (source: string): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "application-definition-loader-"));
  roots.push(root);
  const entryModulePath = path.join(root, "entry.mjs");
  await fs.writeFile(entryModulePath, source, "utf8");
  return entryModulePath;
};

const inputFor = (entryModulePath: string, webSockets = true) => ({
  applicationId: "app-1",
  entryModulePath,
  supportedExposures: {
    queries: false,
    commands: false,
    routes: false,
    graphql: false,
    notifications: false,
    eventHandlers: false,
    webSockets,
  },
  storage: {
    rootPath: "/tmp/app",
    runtimePath: "/tmp/app/runtime",
    logsPath: "/tmp/app/logs",
    appDatabasePath: "/tmp/app/app.sqlite",
    appDatabaseUrl: "file:/tmp/app/app.sqlite",
    assetsPath: null,
  },
});

describe("ApplicationBackendDefinitionLoader WebSocket validation", () => {
  it("derives the v4 WebSocket exposure summary from exact valid routes", async () => {
    const entry = await writeDefinition(`export default {
      definitionContractVersion: "5",
      webSocketRoutes: [{ path: "/rooms/:roomId", open() {} }],
    };`);
    const loaded = await new ApplicationBackendDefinitionLoader().load(inputFor(entry));
    expect(loaded.applicationId).toBe("app-1");
    expect(loaded.exposures.webSocketRoutes).toEqual([{ path: "/rooms/:roomId" }]);
    expect(loaded.exposures.supportedExposures.webSockets).toBe(true);
  });

  it("rejects stale v3 definitions and routes disabled by the bundle authority", async () => {
    const stale = await writeDefinition(`export default { definitionContractVersion: "3" };`);
    await expect(new ApplicationBackendDefinitionLoader().load(inputFor(stale))).rejects.toThrow(
      "exports definitionContractVersion '3', but '5' is required",
    );
    const disabled = await writeDefinition(`export default {
      definitionContractVersion: "5",
      webSocketRoutes: [{ path: "/rooms", open() {} }],
    };`);
    await expect(new ApplicationBackendDefinitionLoader().load(inputFor(disabled, false))).rejects.toThrow(
      "Backend manifest disables webSockets",
    );
  });

  it("rejects malformed, duplicate-parameter, and ambiguous route declarations", async () => {
    const sources = [
      `export default { definitionContractVersion: "5", webSocketRoutes: [{ path: "/rooms" }] };`,
      `export default { definitionContractVersion: "5", webSocketRoutes: [{ path: "/:room/:room", open() {} }] };`,
      `export default { definitionContractVersion: "5", webSocketRoutes: [
        { path: "/rooms/:room", open() {} },
        { path: "/rooms/public", open() {} },
      ] };`,
    ];
    for (const source of sources) {
      await expect(new ApplicationBackendDefinitionLoader().load(inputFor(await writeDefinition(source)))).rejects.toThrow();
    }
  });
});
