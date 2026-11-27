import { describe, expect, it } from "vitest";
import { LocalNetworkAnnouncer } from "../../../src/private-network/local-network-announcer.js";
import { LocalNetworkBrowser } from "../../../src/private-network/local-network-browser.js";

/**
 * autobyteus-661 AC-013 (design DS-8) on this computer's real multicast DNS: the announcer and the browser, each with
 * its own real stack (`bonjour-service`), announce, find and withdraw a node. Two computers are PoC 2a.
 *
 * Gate: RUN_LOCAL_NETWORK_MDNS=1 (it needs multicast on the local network, which CI runners may not give).
 * It uses the test-only type `_autobyteus-test._tcp`, so no AutoByteus node is announced on the network.
 * Command: RUN_LOCAL_NETWORK_MDNS=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/private-network/local-network-mdns.integration.test.ts --no-watch
 */

const TEST_TYPE = "autobyteus-test";
const NODE = "srv_mdns_test_node_000000000000000000000";

describe.skipIf(process.env.RUN_LOCAL_NETWORK_MDNS !== "1")("local network discovery on real multicast DNS", () => {
  it("AC-013 announced: found with its name, node ID and address; switched off: gone", async () => {
    const state = { privateNetwork: false, localNetwork: true };
    const announcer = new LocalNetworkAnnouncer({ visibility: { state: () => state }, localNetworkAllowed: async () => true,
      ownNodeId: async () => NODE, ownName: async () => "mdns-test-node", port: () => 39124, serviceType: TEST_TYPE });
    const browser = new LocalNetworkBrowser({ serviceType: TEST_TYPE });
    try {
      await announcer.sync();
      let found = await browser.found();
      for (let attempt = 0; attempt < 6 && !found.some((node) => node.nodeId === NODE); attempt += 1) found = await browser.found();
      expect(found.find((node) => node.nodeId === NODE)).toMatchObject({ name: "mdns-test-node", address: expect.stringMatching(/^http:\/\/.+:39124$/) });

      state.localNetwork = false;
      await announcer.sync();
      let after = await browser.found();
      for (let attempt = 0; attempt < 6 && after.some((node) => node.nodeId === NODE); attempt += 1) after = await browser.found();
      expect(after.some((node) => node.nodeId === NODE)).toBe(false);
    } finally {
      browser.close();
      await announcer.close();
    }
  }, 30_000);
});
