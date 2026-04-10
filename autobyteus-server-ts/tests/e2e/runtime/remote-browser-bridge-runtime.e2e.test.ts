import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
  BROWSER_TOOL_NAME_LIST,
} from "../../../src/agent-tools/browser/browser-tool-contract.js";
import { getRuntimeBrowserBridgeRegistrationService } from "../../../src/agent-tools/browser/runtime-browser-bridge-registration-service.js";
import { unregisterBrowserTools } from "../../../src/agent-tools/browser/register-browser-tools.js";
import { getBrowserToolService } from "../../../src/agent-tools/browser/browser-tool-service.js";
import { BrowserBridgeLiveTestServer } from "../../integration/agent-execution/browser-bridge-live-test-server.js";

describe("Remote browser bridge runtime GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let browserBridgeServer: BrowserBridgeLiveTestServer | null = null;

  const originalBrowserBridgeBaseUrl = process.env[BROWSER_BRIDGE_BASE_URL_ENV];
  const originalBrowserBridgeToken = process.env[BROWSER_BRIDGE_TOKEN_ENV];

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    if (browserBridgeServer) {
      await browserBridgeServer.stop();
      browserBridgeServer = null;
    }
    getRuntimeBrowserBridgeRegistrationService().clearBinding("manual_revoke");
    unregisterBrowserTools();
    restoreBrowserBridgeEnv();
  });

  it("registers browser tools through the runtime GraphQL mutation without requiring restart and removes them on clear", async () => {
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
    getRuntimeBrowserBridgeRegistrationService().clearBinding("manual_revoke");
    unregisterBrowserTools();

    expect(await queryRegisteredBrowserToolNames()).toEqual([]);

    browserBridgeServer = new BrowserBridgeLiveTestServer();
    await browserBridgeServer.start();
    const runtimeEnv = browserBridgeServer.getRuntimeEnv();
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const registerResult = await graphql({
      schema,
      source: `
        mutation RegisterRemoteBrowserBridge($input: RemoteBrowserBridgeInput!) {
          registerRemoteBrowserBridge(input: $input) {
            success
            message
          }
        }
      `,
      variableValues: {
        input: {
          baseUrl: runtimeEnv[BROWSER_BRIDGE_BASE_URL_ENV],
          authToken: runtimeEnv[BROWSER_BRIDGE_TOKEN_ENV],
          expiresAt,
        },
      },
    });

    if (registerResult.errors?.length) {
      throw registerResult.errors[0];
    }

    expect((registerResult.data as any)?.registerRemoteBrowserBridge?.success).toBe(true);
    expect(await queryRegisteredBrowserToolNames()).toEqual([...BROWSER_TOOL_NAME_LIST].sort());

    const clearResult = await graphql({
      schema,
      source: `
        mutation ClearRemoteBrowserBridge {
          clearRemoteBrowserBridge {
            success
            message
          }
        }
      `,
    });

    if (clearResult.errors?.length) {
      throw clearResult.errors[0];
    }

    expect((clearResult.data as any)?.clearRemoteBrowserBridge?.success).toBe(true);
    expect(await queryRegisteredBrowserToolNames()).toEqual([]);
  });

  it("uses the runtime GraphQL registration for browser execution and fails safely again after revocation", async () => {
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
    getRuntimeBrowserBridgeRegistrationService().clearBinding("manual_revoke");
    unregisterBrowserTools();

    await expect(
      getBrowserToolService().openTab({
        url: "http://127.0.0.1:4173/runtime-browser-before-register",
        wait_until: "load",
      }),
    ).rejects.toMatchObject({
      code: "browser_unsupported_in_current_environment",
    });

    browserBridgeServer = new BrowserBridgeLiveTestServer();
    await browserBridgeServer.start();
    const runtimeEnv = browserBridgeServer.getRuntimeEnv();
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const registerResult = await graphql({
      schema,
      source: `
        mutation RegisterRemoteBrowserBridge($input: RemoteBrowserBridgeInput!) {
          registerRemoteBrowserBridge(input: $input) {
            success
          }
        }
      `,
      variableValues: {
        input: {
          baseUrl: runtimeEnv[BROWSER_BRIDGE_BASE_URL_ENV],
          authToken: runtimeEnv[BROWSER_BRIDGE_TOKEN_ENV],
          expiresAt,
        },
      },
    });

    if (registerResult.errors?.length) {
      throw registerResult.errors[0];
    }

    const result = await getBrowserToolService().openTab({
      url: "http://127.0.0.1:4173/runtime-browser-after-register",
      title: "Runtime browser test",
      wait_until: "load",
    });

    expect(result).toMatchObject({
      tab_id: "browser-session-1",
      status: "opened",
      url: "http://127.0.0.1:4173/runtime-browser-after-register",
      title: "Runtime browser test",
    });
    expect(browserBridgeServer.requests).toHaveLength(1);
    expect(browserBridgeServer.requests[0]).toMatchObject({
      method: "POST",
      path: "/browser/open",
    });

    const clearResult = await graphql({
      schema,
      source: `
        mutation ClearRemoteBrowserBridge {
          clearRemoteBrowserBridge {
            success
          }
        }
      `,
    });

    if (clearResult.errors?.length) {
      throw clearResult.errors[0];
    }

    await expect(
      getBrowserToolService().openTab({
        url: "http://127.0.0.1:4173/runtime-browser-after-clear",
        wait_until: "load",
      }),
    ).rejects.toMatchObject({
      code: "browser_unsupported_in_current_environment",
    });
  });

  async function queryRegisteredBrowserToolNames(): Promise<string[]> {
    const result = await graphql({
      schema,
      source: `
        query LocalTools {
          tools(origin: LOCAL) {
            name
          }
        }
      `,
    });

    if (result.errors?.length) {
      throw result.errors[0];
    }

    const toolNames = ((result.data as any)?.tools ?? [])
      .map((tool: { name: string }) => tool.name)
      .filter((name: string) => BROWSER_TOOL_NAME_LIST.includes(name as (typeof BROWSER_TOOL_NAME_LIST)[number]))
      .sort();

    return toolNames;
  }

  function restoreBrowserBridgeEnv(): void {
    if (typeof originalBrowserBridgeBaseUrl === "string") {
      process.env[BROWSER_BRIDGE_BASE_URL_ENV] = originalBrowserBridgeBaseUrl;
    } else {
      delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    }

    if (typeof originalBrowserBridgeToken === "string") {
      process.env[BROWSER_BRIDGE_TOKEN_ENV] = originalBrowserBridgeToken;
    } else {
      delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
    }
  }
});
