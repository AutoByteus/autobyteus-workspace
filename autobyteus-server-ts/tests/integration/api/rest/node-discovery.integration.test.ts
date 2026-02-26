import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerNodeDiscoveryRoutes } from "../../../../src/api/rest/node-discovery.js";
import { resetDiscoveryRuntimeForTests } from "../../../../src/discovery/runtime/discovery-runtime.js";

const DISCOVERY_ENV_KEYS = [
  "AUTOBYTEUS_SERVER_HOST",
  "AUTOBYTEUS_NODE_ID",
  "AUTOBYTEUS_NODE_NAME",
  "AUTOBYTEUS_NODE_DISCOVERY_ENABLED",
  "AUTOBYTEUS_NODE_DISCOVERY_ROLE",
  "AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL",
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

describe("REST node-discovery routes", () => {
  beforeEach(() => {
    resetDiscoveryRuntimeForTests();
  });

  afterEach(() => {
    resetDiscoveryRuntimeForTests();
    restoreDiscoveryEnv();
  });

  it("registers remote peers with loopback normalization and exposes peer list", async () => {
    setDiscoveryEnv({
      AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:8000",
      AUTOBYTEUS_NODE_ID: "registry-node",
      AUTOBYTEUS_NODE_NAME: "Registry Node",
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
      AUTOBYTEUS_NODE_DISCOVERY_ROLE: "registry",
    });

    const app = fastify();
    await registerNodeDiscoveryRoutes(app);

    const registerResponse = await app.inject({
      method: "POST",
      url: "/node-discovery/register",
      remoteAddress: "192.168.1.42",
      payload: {
        nodeId: "worker-node",
        nodeName: "Worker Node",
        baseUrl: "http://localhost:8100/",
      },
    });

    expect(registerResponse.statusCode).toBe(200);
    expect(registerResponse.json()).toMatchObject({
      accepted: true,
      peer: {
        nodeId: "worker-node",
        nodeName: "Worker Node",
        baseUrl: "http://192.168.1.42:8100",
        advertisedBaseUrl: "http://localhost:8100/",
      },
    });

    const peersResponse = await app.inject({
      method: "GET",
      url: "/node-discovery/peers",
    });

    expect(peersResponse.statusCode).toBe(200);
    expect(peersResponse.json()).toMatchObject({
      peers: expect.arrayContaining([
        expect.objectContaining({
          nodeId: "worker-node",
          baseUrl: "http://192.168.1.42:8100",
        }),
      ]),
    });

    const selfResponse = await app.inject({
      method: "GET",
      url: "/node-discovery/self",
    });

    expect(selfResponse.statusCode).toBe(200);
    expect(selfResponse.json()).toMatchObject({
      nodeId: "registry-node",
      nodeName: "Registry Node",
      discoveryEnabled: true,
      discoveryRole: "registry",
      discoveryRegistryUrl: null,
    });

    await app.close();
  });

  it("rejects register endpoint on client role nodes", async () => {
    setDiscoveryEnv({
      AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:8001",
      AUTOBYTEUS_NODE_ID: "client-node",
      AUTOBYTEUS_NODE_NAME: "Client Node",
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
      AUTOBYTEUS_NODE_DISCOVERY_ROLE: "client",
      AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL: "http://127.0.0.1:8000",
    });

    const app = fastify();
    await registerNodeDiscoveryRoutes(app);

    const registerResponse = await app.inject({
      method: "POST",
      url: "/node-discovery/register",
      payload: {
        nodeId: "worker-node",
        nodeName: "Worker Node",
        baseUrl: "http://127.0.0.1:8100",
      },
    });

    expect(registerResponse.statusCode).toBe(409);
    expect(registerResponse.json()).toMatchObject({
      code: "DISCOVERY_ROLE_MISMATCH",
    });

    await app.close();
  });

  it("returns discovery disabled when discovery feature is off", async () => {
    setDiscoveryEnv({
      AUTOBYTEUS_SERVER_HOST: "http://127.0.0.1:8002",
      AUTOBYTEUS_NODE_ID: "node-disabled",
      AUTOBYTEUS_NODE_NAME: "Disabled Node",
      AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "false",
      AUTOBYTEUS_NODE_DISCOVERY_ROLE: "registry",
    });

    const app = fastify();
    await registerNodeDiscoveryRoutes(app);

    const registerResponse = await app.inject({
      method: "POST",
      url: "/node-discovery/register",
      payload: {
        nodeId: "worker-node",
        nodeName: "Worker Node",
        baseUrl: "http://127.0.0.1:8100",
      },
    });

    expect(registerResponse.statusCode).toBe(503);
    expect(registerResponse.json()).toMatchObject({
      code: "DISCOVERY_DISABLED",
    });

    await app.close();
  });
});
