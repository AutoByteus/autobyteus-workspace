import { afterEach, describe, expect, it } from "vitest";
import { DiscoveryRegistryClientService } from "../../../../src/discovery/services/discovery-registry-client-service.js";
import { NodeDiscoveryRegistryService } from "../../../../src/discovery/services/node-discovery-registry-service.js";

type MockResponseInput = {
  status?: number;
  body?: unknown;
  textBody?: string;
};

const createMockResponse = (input: MockResponseInput = {}): Response => {
  const status = input.status ?? 200;
  const body = input.body;
  const textBody = input.textBody ?? (typeof body === "string" ? body : JSON.stringify(body ?? {}));
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body ?? {},
    text: async () => textBody,
  } as unknown as Response;
};

const wait = async (ms: number): Promise<void> =>
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe("DiscoveryRegistryClientService", () => {
  const runningServices: DiscoveryRegistryClientService[] = [];

  afterEach(() => {
    for (const service of runningServices) {
      service.stop();
    }
    runningServices.length = 0;
  });

  it("retries registration on heartbeat loop when startup register fails", async () => {
    let registerCalls = 0;
    let heartbeatCalls = 0;

    const fetchMock = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.endsWith("/rest/node-discovery/register")) {
        registerCalls += 1;
        if (registerCalls === 1) {
          return createMockResponse({
            status: 503,
            textBody: "registry unavailable",
          });
        }
        return createMockResponse({
          body: {
            accepted: true,
            peer: { nodeId: "node-client" },
          },
        });
      }

      if (url.endsWith("/rest/node-discovery/heartbeat")) {
        heartbeatCalls += 1;
        return createMockResponse({
          body: {
            accepted: true,
            code: "HEARTBEAT_UPDATED",
          },
        });
      }

      if (url.endsWith("/rest/node-discovery/peers") && init?.method === "GET") {
        return createMockResponse({ body: { peers: [] } });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    };

    const service = new DiscoveryRegistryClientService({
      selfIdentity: {
        nodeId: "node-client",
        nodeName: "Client Node",
        baseUrl: "http://127.0.0.1:8001",
      },
      registryService: new NodeDiscoveryRegistryService(),
      registryUrl: "http://127.0.0.1:9000",
      heartbeatIntervalMs: 25,
      syncIntervalMs: 25,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    runningServices.push(service);

    await service.start();
    await wait(120);

    expect(registerCalls).toBeGreaterThanOrEqual(2);
    expect(heartbeatCalls).toBeGreaterThan(0);
  });

  it("re-registers immediately when heartbeat reports unknown node", async () => {
    let registerCalls = 0;
    let heartbeatCalls = 0;

    const fetchMock = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.endsWith("/rest/node-discovery/register")) {
        registerCalls += 1;
        return createMockResponse({
          body: {
            accepted: true,
            peer: { nodeId: "node-client" },
          },
        });
      }

      if (url.endsWith("/rest/node-discovery/heartbeat")) {
        heartbeatCalls += 1;
        if (heartbeatCalls === 1) {
          return createMockResponse({
            body: {
              accepted: false,
              code: "HEARTBEAT_UNKNOWN_NODE",
            },
          });
        }

        return createMockResponse({
          body: {
            accepted: true,
            code: "HEARTBEAT_UPDATED",
          },
        });
      }

      if (url.endsWith("/rest/node-discovery/peers") && init?.method === "GET") {
        return createMockResponse({ body: { peers: [] } });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    };

    const service = new DiscoveryRegistryClientService({
      selfIdentity: {
        nodeId: "node-client",
        nodeName: "Client Node",
        baseUrl: "http://127.0.0.1:8001",
      },
      registryService: new NodeDiscoveryRegistryService(),
      registryUrl: "http://127.0.0.1:9000",
      heartbeatIntervalMs: 1000,
      syncIntervalMs: 1000,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    runningServices.push(service);

    await service.start();

    expect(registerCalls).toBe(2);
    expect(heartbeatCalls).toBe(2);
  });
});
