import { describe, expect, it, vi } from "vitest";
import { parseIpNetwork, type IpNetwork } from "../../../src/node-access/domain/ip-network.js";
import type { NetworkAdmissionFacts } from "../../../src/node-access/domain/network-admission-facts.js";
import { NetworkAdmission } from "../../../src/node-access/services/network-admission.js";

/** Node access model NA-3, NA-4; design M-6 (the compared address) and DS-007 (the snapshot). */

const HOME: NetworkAdmissionFacts = {
  runsInContainer: false,
  tailscaleAddresses: ["100.88.1.2", "fd7a:115c:a1e0::2"],
  localNetwork: { subnets: ["192.168.2.10/24"], allowed: true },
};

const admission = (facts: NetworkAdmissionFacts, configured: IpNetwork[] = [], now = () => 0) => {
  let current = facts;
  let listener: (() => void) | null = null;
  const source = {
    readAdmissionFacts: vi.fn(async () => current),
    onAdmissionFactsChanged: (changed: () => void) => { listener = changed; return () => { listener = null; }; },
  };
  return {
    admission: new NetworkAdmission(source, configured, now),
    source,
    set: (next: NetworkAdmissionFacts) => { current = next; },
    changed: () => listener?.(),
  };
};
const from = (clientAddress: string, localAddress = "192.168.2.10") => ({ clientAddress, localAddress });

describe("NetworkAdmission", () => {
  it("NAS-14 admits this computer (127.0.0.0/8, ::1, IPv4-mapped loopback)", async () => {
    const f = admission({ runsInContainer: false, tailscaleAddresses: [], localNetwork: null });
    for (const address of ["127.0.0.1", "127.8.9.10", "::1", "::ffff:127.0.0.1"]) {
      await expect(f.admission.admits(from(address, "127.0.0.1"))).resolves.toBe(true);
    }
  });

  it("NAS-05 admits a Tailscale client only when it arrived on one of this computer's Tailscale addresses", async () => {
    const f = admission(HOME);
    await expect(f.admission.admits(from("100.101.7.9", "100.88.1.2"))).resolves.toBe(true);
    await expect(f.admission.admits(from("fd7a:115c:a1e0::9", "fd7a:115c:a1e0::2"))).resolves.toBe(true);
    // A 100.64/10 address arriving on the Wi-Fi address (a local network using that range) is not Tailscale.
    const noLocal = admission({ ...HOME, localNetwork: null });
    await expect(noLocal.admission.admits(from("100.64.5.5", "192.168.2.10"))).resolves.toBe(false);
  });

  it("NAS-06 admits a client of the local network this computer is on while the owner allowed it; NAS-07, NAS-11 refuse it otherwise", async () => {
    const home = admission(HOME);
    await expect(home.admission.admits(from("192.168.2.40"))).resolves.toBe(true);
    await expect(home.admission.admits(from("192.168.3.40"))).resolves.toBe(false);
    const cafe = admission({ ...HOME, localNetwork: { subnets: ["10.20.0.5/16"], allowed: false } });
    await expect(cafe.admission.admits(from("10.20.1.1", "10.20.0.5"))).resolves.toBe(false);
  });

  it("NAS-28 admits a network listed in AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS", async () => {
    const f = admission({ ...HOME, localNetwork: null }, [parseIpNetwork("10.8.0.0/16")!]);
    await expect(f.admission.admits(from("10.8.3.4", "10.8.0.2"))).resolves.toBe(true);
    await expect(f.admission.admits(from("10.9.3.4", "10.8.0.2"))).resolves.toBe(false);
  });

  it("NA-4 admits every arrival in a container (the published port decides)", async () => {
    const f = admission({ runsInContainer: true, tailscaleAddresses: [], localNetwork: null });
    await expect(f.admission.admits(from("172.64.155.209", "172.17.0.2"))).resolves.toBe(true);
  });

  it("DS-007 reads the facts again when the owner allows a network, and when a refused address arrives (at most every 5 s)", async () => {
    let now = 0;
    const f = admission({ ...HOME, localNetwork: { subnets: ["192.168.2.10/24"], allowed: false } }, [], () => now);
    await expect(f.admission.admits(from("192.168.2.40"))).resolves.toBe(false);
    expect(f.source.readAdmissionFacts).toHaveBeenCalledTimes(1);
    f.set(HOME);
    now = 1_000;
    await expect(f.admission.admits(from("192.168.2.40"))).resolves.toBe(false);
    expect(f.source.readAdmissionFacts).toHaveBeenCalledTimes(1);
    now = 6_000;
    await expect(f.admission.admits(from("192.168.2.40"))).resolves.toBe(true);
    expect(f.source.readAdmissionFacts).toHaveBeenCalledTimes(2);
    f.set({ ...HOME, localNetwork: { subnets: ["192.168.2.10/24"], allowed: false } });
    f.changed();
    await vi.waitFor(() => expect(f.source.readAdmissionFacts).toHaveBeenCalledTimes(3));
    await expect(f.admission.admits(from("192.168.2.40"))).resolves.toBe(false);
  });

  it("fails closed when the facts cannot be read: only this computer and the configured networks", async () => {
    const source = { readAdmissionFacts: vi.fn(async () => { throw new Error("no interfaces"); }), onAdmissionFactsChanged: () => () => undefined };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const closed = new NetworkAdmission(source, [parseIpNetwork("10.8.0.0/16")!]);
    await expect(closed.admits(from("127.0.0.1"))).resolves.toBe(true);
    await expect(closed.admits(from("10.8.0.9"))).resolves.toBe(true);
    await expect(closed.admits(from("192.168.2.40"))).resolves.toBe(false);
    warn.mockRestore();
  });
});
