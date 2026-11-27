import { describe, expect, it, vi } from "vitest";
import { LocalNetworkAnnouncer } from "../../../src/private-network/local-network-announcer.js";
import { LocalNetworkBrowser } from "../../../src/private-network/local-network-browser.js";
import type { Mdns, MdnsFactory, MdnsService } from "../../../src/private-network/local-network-mdns.js";
import { LOCAL_NETWORK_VISIBLE_SETTING, NodeVisibility } from "../../../src/private-network/node-visibility.js";

/**
 * autobyteus-661 contract §4b, REQ-018, AC-013 (design DS-8): the announcement follows "Visible on my local network",
 * and browsing lists the nodes announced as `_autobyteus._tcp` with TXT `id`. The multicast network is in memory here;
 * the gated integration test runs the real stack.
 */

const SELF = "srv_self_node_000000000000000000000000";
const OTHER = "srv_node_b_00000000000000000000000000";

type Published = { name: string; type: string; port: number; txt: Record<string, string>; host: string; addresses: string[]; live: boolean };

/** An in-memory multicast network: what each stack publishes, every other stack's browser sees. */
const memoryNetwork = () => {
  const published: Published[] = [];
  const stacks: Array<{ destroyed: boolean; fail(error: Error): void }> = [];
  const factory: MdnsFactory = (failed) => {
    const stack = { destroyed: false, fail: failed };
    stacks.push(stack);
    const mdns: Mdns = {
      publish: (config) => {
        const entry: Published = { ...config, txt: { ...config.txt }, host: "home-mac.local", addresses: ["fe80::1", "192.168.2.10"], live: true };
        published.push(entry);
        return { stop: (callback) => { entry.live = false; callback?.(); } };
      },
      find: (config) => ({
        get services(): MdnsService[] { return published.filter((entry) => entry.live && entry.type === config.type); },
        update: vi.fn(), expire: vi.fn(), stop: vi.fn(),
      }),
      destroy: (callback) => { stack.destroyed = true; callback?.(); },
    };
    return mdns;
  };
  return { published, stacks, factory, live: () => published.filter((entry) => entry.live) };
};

const settingsStore = (initial: Record<string, boolean> = {}) => {
  const values = new Map(Object.entries(initial));
  return { getBooleanSetting: (key: string) => values.get(key) ?? null, setBooleanSetting: (key: string, on: boolean) => { values.set(key, on); } };
};

describe("LocalNetworkAnnouncer", () => {
  it("AC-013 announces this node (`_autobyteus._tcp`, its name, port, TXT id) while the switch is on and the node accepts its local network; off withdraws it", async () => {
    const network = memoryNetwork();
    let allowed = true;
    let announcer: LocalNetworkAnnouncer | null = null;
    const visibility = new NodeVisibility({ settings: settingsStore(), localNetworkAllowed: async () => allowed, changed: () => void announcer?.sync() });
    announcer = new LocalNetworkAnnouncer({ visibility, localNetworkAllowed: async () => allowed, ownNodeId: async () => SELF, ownName: async () => "home-mac",
      port: () => 29695, mdns: network.factory });
    await announcer.sync();
    expect(network.published).toEqual([]);

    await visibility.set({ localNetwork: true });
    await announcer.sync();
    expect(network.live()).toEqual([expect.objectContaining({ name: "home-mac", type: "autobyteus", port: 29695, txt: { id: SELF } })]);
    expect(announcer.isAnnounced()).toBe(true);
    await announcer.sync();
    expect(network.published).toHaveLength(1);

    await visibility.set({ localNetwork: false });
    await announcer.sync();
    expect(network.live()).toEqual([]);
    expect(network.stacks.every((stack) => stack.destroyed)).toBe(true);

    // The node stops accepting its local network while the switch stays on: nothing is announced.
    await visibility.set({ localNetwork: true });
    allowed = false;
    await announcer.sync();
    expect(network.live()).toEqual([]);
  });

  it("announces again under a new name or port, shortens a name to one DNS label, and withdraws on close", async () => {
    const network = memoryNetwork();
    let name = "home-mac";
    let port: number | null = null;
    const announcer = new LocalNetworkAnnouncer({ visibility: { state: () => ({ privateNetwork: false, localNetwork: true }) }, localNetworkAllowed: async () => true,
      ownNodeId: async () => SELF, ownName: async () => name, port: () => port, mdns: network.factory });
    await announcer.sync();
    expect(network.published).toEqual([]);
    port = 29695;
    await announcer.sync();
    name = "ä".repeat(40);
    await announcer.sync();
    expect(network.live()).toEqual([expect.objectContaining({ name: "ä".repeat(31), port: 29695 })]);
    port = 29700;
    await announcer.sync();
    expect(network.live().map((entry) => entry.port)).toEqual([29700]);
    await announcer.close();
    expect(network.live()).toEqual([]);
  });

  it("a failure of the network stack is reported and leaves the node unannounced; it never throws", async () => {
    const network = memoryNetwork();
    const warn = vi.fn();
    const announcer = new LocalNetworkAnnouncer({ visibility: { state: () => ({ privateNetwork: false, localNetwork: true }) }, localNetworkAllowed: async () => true,
      ownNodeId: async () => SELF, ownName: async () => "home-mac", port: () => 29695, mdns: network.factory, warn });
    await announcer.sync();
    network.stacks[0]!.fail(Object.assign(new Error("bind EADDRINUSE 0.0.0.0:5353"), { code: "EADDRINUSE" }));
    await vi.waitFor(() => expect(announcer.isAnnounced()).toBe(false));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("EADDRINUSE"));
    const broken = new LocalNetworkAnnouncer({ visibility: { state: () => ({ privateNetwork: false, localNetwork: true }) }, localNetworkAllowed: async () => true,
      ownNodeId: async () => SELF, ownName: async () => "home-mac", port: () => 29695, mdns: () => { throw new Error("no multicast here"); }, warn });
    await expect(broken.sync()).resolves.toBeUndefined();
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining("no multicast here"));
  });
});

describe("LocalNetworkBrowser", () => {
  const service = (overrides: Partial<Published> & { txt?: Record<string, string> }) => ({
    name: "office-pc", type: "autobyteus", port: 29695, txt: { id: OTHER }, host: "office-pc.local", addresses: ["192.168.2.40"], live: true, ...overrides });

  it("AC-013 lists each node announced on the local network as name, node ID and address; reads strictly", async () => {
    const network = memoryNetwork();
    network.published.push(
      service({}),
      service({ name: "same-node-again", addresses: ["192.168.2.41"] }),
      service({ name: "no-id", txt: {} }),
      service({ name: "bad-id", txt: { id: "not-a-node" } }),
      service({ name: "link-local-first", txt: { id: "srv_node_c_00000000000000000000000000" }, addresses: ["169.254.3.3", "fe80::2", "192.168.2.42"] }),
      service({ name: "ipv6-only", txt: { id: "srv_node_d_00000000000000000000000000" }, addresses: ["fe80::9", "2003:ca::5"], port: 8001 }),
      service({ name: "no-address", txt: { id: "srv_node_e_00000000000000000000000000" }, addresses: [] }),
      service({ name: "printer", type: "ipp", txt: { id: "srv_node_f_00000000000000000000000000" } }),
    );
    const waits: number[] = [];
    const browser = new LocalNetworkBrowser({ mdns: network.factory, wait: async (ms) => { waits.push(ms); } });
    await expect(browser.found()).resolves.toEqual([
      { nodeId: OTHER, name: "office-pc", address: "http://192.168.2.40:29695" },
      { nodeId: "srv_node_c_00000000000000000000000000", name: "link-local-first", address: "http://192.168.2.42:29695" },
      { nodeId: "srv_node_d_00000000000000000000000000", name: "ipv6-only", address: "http://[2003:ca::5]:8001" },
    ]);
    network.published[0]!.live = false;
    await expect(browser.found()).resolves.toHaveLength(3);
    expect(waits).toEqual([1_500, 800]);
    expect(network.stacks).toHaveLength(1);
    browser.close();
    expect(network.stacks[0]!.destroyed).toBe(true);
  });

  it("stops browsing when nobody looked for a while; a failure lists nothing and is reported", async () => {
    vi.useFakeTimers();
    try {
      const network = memoryNetwork();
      const browser = new LocalNetworkBrowser({ mdns: network.factory, wait: async () => undefined, idleMs: 1_000 });
      await browser.found();
      vi.advanceTimersByTime(1_001);
      expect(network.stacks[0]!.destroyed).toBe(true);
      await browser.found();
      expect(network.stacks).toHaveLength(2);
      browser.close();
    } finally {
      vi.useRealTimers();
    }
    const warn = vi.fn();
    const broken = new LocalNetworkBrowser({ mdns: () => { throw new Error("no multicast here"); }, wait: async () => undefined, warn });
    await expect(broken.found()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no multicast here"));
  });
});

describe("NodeVisibility", () => {
  it("REQ-018 tells its listener after each change", async () => {
    const changed = vi.fn();
    const visibility = new NodeVisibility({ settings: settingsStore({ [LOCAL_NETWORK_VISIBLE_SETTING]: false }), localNetworkAllowed: async () => true, changed });
    await visibility.set({ localNetwork: true });
    expect(changed).toHaveBeenCalledWith({ privateNetwork: false, localNetwork: true });
  });
});
