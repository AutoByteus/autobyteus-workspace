import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InterfaceAddress } from "../../../src/remote-access/services/network-interface-classifier.js";
import { NodeNetworkService, type NodeNetworkFactsSource } from "../../../src/remote-access/services/node-network-service.js";
import { AllowedLocalNetworkStore } from "../../../src/remote-access/stores/allowed-local-network-store.js";

let tempDir = "";

const NO_MAC = "00:00:00:00:00:00";
const v4 = (interfaceName: string, address: string, mac = NO_MAC): InterfaceAddress =>
  ({ interfaceName, address, family: "IPv4", internal: false, mac });

const facts = (overrides: Partial<NodeNetworkFactsSource> = {}): NodeNetworkFactsSource => ({
  runsInContainer: () => false,
  configuredBaseUrl: () => "http://localhost:29695",
  networkInterfaces: () => [
    v4("en0", "192.168.1.20", "02:00:00:00:00:01"),
    v4("utun5", "100.101.102.103"),
    v4("utun7", "10.8.0.2"),
  ],
  reverseLookup: async (address) => (address === "100.101.102.103" ? "laptop.example-tailnet.ts.net" : null),
  defaultRoute: async () => ({ interfaceName: "en0", gatewayHardwareAddress: "02:00:00:0a:0b:0c" }),
  computerName: async () => "Test Computer",
  ...overrides,
});

const build = (source: NodeNetworkFactsSource) => {
  const store = new AllowedLocalNetworkStore({ getAppDataDir: () => tempDir });
  return { service: new NodeNetworkService(source, store), store };
};

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-node-network-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("NodeNetworkService", () => {
  it("reports this computer's Tailscale, VPN and local network, and drops a loopback configured address", async () => {
    const { service } = build(facts());
    const network = await service.getNodeNetwork();
    expect(network).toEqual({
      computerName: "Test Computer",
      runsInContainer: false,
      configuredBaseUrl: null,
      tailscale: { address: "100.101.102.103", dnsName: "laptop.example-tailnet.ts.net" },
      vpnAddresses: ["10.8.0.2"],
      localNetwork: { networkId: expect.stringMatching(/^gw_[0-9a-f]{16}$/), addresses: ["192.168.1.20"], allowed: false },
    });
  });

  it("looks up reverse names only for 100.64/10 tunnel addresses", async () => {
    const reverseLookup = vi.fn(async () => null);
    const { service } = build(facts({ reverseLookup }));
    await service.getNodeNetwork();
    expect(reverseLookup.mock.calls).toEqual([["100.101.102.103"]]);
  });

  it("keeps a company configured address and remembers the allow answer for that network only", async () => {
    const { service } = build(facts({ configuredBaseUrl: () => "https://autobyteus.example.com/" }));
    const first = await service.getNodeNetwork();
    expect(first.configuredBaseUrl).toBe("https://autobyteus.example.com");
    const networkId = first.localNetwork!.networkId;

    await service.setLocalNetworkAllowed(networkId, true);
    expect((await service.getNodeNetwork()).localNetwork?.allowed).toBe(true);
    expect(JSON.parse(await readFile(path.join(tempDir, "remote-access", "allowed-local-networks.json"), "utf8")))
      .toEqual({ networkIds: [networkId] });

    const otherNetwork = build(facts({
      defaultRoute: async () => ({ interfaceName: "en0", gatewayHardwareAddress: "02:00:00:0d:0e:0f" }),
    }));
    expect((await otherNetwork.service.getNodeNetwork()).localNetwork?.allowed).toBe(false);

    await service.setLocalNetworkAllowed(networkId, false);
    expect((await service.getNodeNetwork()).localNetwork?.allowed).toBe(false);
  });

  it("uses this-computer when the router cannot be recognised", async () => {
    const { service } = build(facts({ defaultRoute: async () => ({ interfaceName: null, gatewayHardwareAddress: null }) }));
    expect((await service.getNodeNetwork()).localNetwork?.networkId).toBe("this-computer");
  });

  it("reports no local network when the computer has none", async () => {
    const { service } = build(facts({ networkInterfaces: () => [v4("utun5", "100.101.102.103")] }));
    expect((await service.getNodeNetwork()).localNetwork).toBeNull();
  });

  it("in a container reports no addresses (E-04) but keeps its configured address and its own this-computer answer", async () => {
    const networkInterfaces = vi.fn(() => [v4("eth0", "172.17.0.2", "02:42:ac:11:00:02")]);
    const { service } = build(facts({
      runsInContainer: () => true,
      networkInterfaces,
      configuredBaseUrl: () => "http://host.docker.internal:8001",
    }));
    await service.setLocalNetworkAllowed("this-computer", true);
    expect(await service.getNodeNetwork()).toEqual({
      computerName: "Test Computer",
      runsInContainer: true,
      configuredBaseUrl: null,
      tailscale: null,
      vpnAddresses: [],
      localNetwork: { networkId: "this-computer", addresses: [], allowed: true },
    });
    expect(networkInterfaces).not.toHaveBeenCalled();
  });

  it("refuses a network ID of another shape", async () => {
    const { service } = build(facts());
    await expect(service.setLocalNetworkAllowed("../settings", true))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_NETWORK_ID_INVALID", statusCode: 400 });
    await expect(service.setLocalNetworkAllowed("gw_XYZ", true))
      .rejects.toMatchObject({ code: "REMOTE_ACCESS_NETWORK_ID_INVALID" });
  });
});
