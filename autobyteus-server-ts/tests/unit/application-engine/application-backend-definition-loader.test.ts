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

const inputFor = (
  entryModulePath: string,
  webSockets = true,
  declaredAgentToolNames: string[] = [],
) => ({
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
  declaredAgentToolNames,
});

describe("ApplicationBackendDefinitionLoader WebSocket validation", () => {
  it("derives the current WebSocket exposure summary from exact valid routes", async () => {
    const entry = await writeDefinition(`export default {
      definitionContractVersion: "7",
      webSocketRoutes: [{ path: "/rooms/:roomId", open() {} }],
    };`);
    const loaded = await new ApplicationBackendDefinitionLoader().load(inputFor(entry));
    expect(loaded.applicationId).toBe("app-1");
    expect(loaded.exposures.webSocketRoutes).toEqual([{ path: "/rooms/:roomId" }]);
    expect(loaded.exposures.supportedExposures.webSockets).toBe(true);
  });

  it("rejects retired v6 definitions and routes disabled by the bundle authority", async () => {
    const stale = await writeDefinition(`export default { definitionContractVersion: "6" };`);
    await expect(new ApplicationBackendDefinitionLoader().load(inputFor(stale))).rejects.toThrow(
      "exports definitionContractVersion '6', but '7' is required",
    );
    const disabled = await writeDefinition(`export default {
      definitionContractVersion: "7",
      webSocketRoutes: [{ path: "/rooms", open() {} }],
    };`);
    await expect(new ApplicationBackendDefinitionLoader().load(inputFor(disabled, false))).rejects.toThrow(
      "Backend manifest disables webSockets",
    );
  });

  it("rejects malformed, duplicate-parameter, and ambiguous route declarations", async () => {
    const sources = [
      `export default { definitionContractVersion: "7", webSocketRoutes: [{ path: "/rooms" }] };`,
      `export default { definitionContractVersion: "7", webSocketRoutes: [{ path: "/:room/:room", open() {} }] };`,
      `export default { definitionContractVersion: "7", webSocketRoutes: [
        { path: "/rooms/:room", open() {} },
        { path: "/rooms/public", open() {} },
      ] };`,
    ];
    for (const source of sources) {
      await expect(new ApplicationBackendDefinitionLoader().load(inputFor(await writeDefinition(source)))).rejects.toThrow();
    }
  });

  it("loads the exact current application agent-tool handler set", async () => {
    const entry = await writeDefinition(`export default {
      definitionContractVersion: "7",
      agentToolHandlers: {
        get_context: async () => ({ content: [{ type: "text", text: "ok" }] }),
      },
    };`);

    const loaded = await new ApplicationBackendDefinitionLoader().load(
      inputFor(entry, true, ["get_context"]),
    );

    expect(loaded.exposures.agentTools).toEqual(["get_context"]);
    expect(loaded.definition.agentToolHandlers?.get_context).toBeTypeOf("function");
  });

  it.each([
    {
      label: "missing",
      source: `export default { definitionContractVersion: "7", agentToolHandlers: {} };`,
      declared: ["get_context"],
      message: "handler 'get_context' was not found",
    },
    {
      label: "extra",
      source: `export default {
        definitionContractVersion: "7",
        agentToolHandlers: { get_context: async () => ({ content: [] }) },
      };`,
      declared: [],
      message: "undeclared agent tool handler 'get_context'",
    },
    {
      label: "non-function",
      source: `export default {
        definitionContractVersion: "7",
        agentToolHandlers: { get_context: "not-a-handler" },
      };`,
      declared: ["get_context"],
      message: "handler 'get_context' must be a function",
    },
  ])("rejects a $label application agent-tool handler map", async ({ source, declared, message }) => {
    const entry = await writeDefinition(source);
    await expect(
      new ApplicationBackendDefinitionLoader().load(inputFor(entry, true, declared)),
    ).rejects.toThrow(message);
  });
});
