import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerGraphql } from "../../../../src/api/graphql/index.js";
import {
  getDiscoveryRuntime,
  resetDiscoveryRuntimeForTests,
} from "../../../../src/discovery/runtime/discovery-runtime.js";

const DISCOVERY_ENV_KEYS = [
  "AUTOBYTEUS_SERVER_HOST",
  "AUTOBYTEUS_NODE_ID",
  "AUTOBYTEUS_NODE_NAME",
  "AUTOBYTEUS_NODE_DISCOVERY_ENABLED",
  "AUTOBYTEUS_NODE_DISCOVERY_ROLE",
] as const;

type DiscoveryEnvKey = (typeof DISCOVERY_ENV_KEYS)[number];

const previousEnv = new Map<DiscoveryEnvKey, string | undefined>();

const setDiscoveryEnv = (overrides: Partial<Record<DiscoveryEnvKey, string>>): void => {
  for (const key of DISCOVERY_ENV_KEYS) {
    previousEnv.set(key, process.env[key]);
    const nextValue = overrides[key];
    if (typeof nextValue === "string") {
      process.env[key] = nextValue;
    } else {
      delete process.env[key];
    }
  }
};

const restoreDiscoveryEnv = (): void => {
  for (const key of DISCOVERY_ENV_KEYS) {
    const value = previousEnv.get(key);
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
  previousEnv.clear();
};

const queryDiscoveredNodeCatalog = `
  query DiscoveredNodeCatalog {
    discoveredNodeCatalog {
      nodeId
      nodeName
      baseUrl
      status
      trustMode
    }
  }
`;

describe("GraphQL /graphql endpoint integration: discoveredNodeCatalog", () => {
  beforeEach(() => {
    resetDiscoveryRuntimeForTests();
  });

  afterEach(() => {
    resetDiscoveryRuntimeForTests();
    restoreDiscoveryEnv();
  });

  it("returns discovered peer catalog when discovery is enabled", async () => {
    setDiscoveryEnv({
      AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:8000",
      AUTOBYTEUS_NODE_ID: "registry-node",
      AUTOBYTEUS_NODE_NAME: "Registry Node",
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
      AUTOBYTEUS_NODE_DISCOVERY_ROLE: "registry",
    });

    const runtime = getDiscoveryRuntime();
    runtime.registryService.announce({
      nodeId: "worker-node",
      nodeName: "Worker Node",
      baseUrl: "http://192.168.1.42:8100",
      trustMode: "lan_open",
    });

    const app = fastify();
    await registerGraphql(app);

    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: queryDiscoveredNodeCatalog,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toMatchObject({
      discoveredNodeCatalog: expect.arrayContaining([
        expect.objectContaining({
          nodeId: "worker-node",
          nodeName: "Worker Node",
          baseUrl: "http://192.168.1.42:8100",
          status: "ready",
          trustMode: "lan_open",
        }),
      ]),
    });

    await app.close();
  });

  it("returns an empty catalog when discovery is disabled", async () => {
    setDiscoveryEnv({
      AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:8000",
      AUTOBYTEUS_NODE_ID: "node-disabled",
      AUTOBYTEUS_NODE_NAME: "Disabled Node",
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "false",
      AUTOBYTEUS_NODE_DISCOVERY_ROLE: "registry",
    });

    const app = fastify();
    await registerGraphql(app);

    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: queryDiscoveredNodeCatalog,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toMatchObject({
      discoveredNodeCatalog: [],
    });

    await app.close();
  });
});
