import type os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  interfaces: {} as ReturnType<typeof os.networkInterfaces>,
  baseUrl: null as string | null,
}));

vi.mock("node:os", () => ({
  default: { networkInterfaces: () => mocks.interfaces },
}));

vi.mock("../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: { config: { getBaseUrl: () => mocks.baseUrl } },
}));

import { ServerAddressCandidateService } from "../../../src/server-addressing/server-address-candidate-service.js";

const entry = (address: string, family: "IPv4" | "IPv6", internal = false) => ({
  address,
  family,
  internal,
  netmask: family === "IPv4" ? "255.255.255.0" : "ffff:ffff:ffff:ffff::",
  mac: "aa:bb:cc:dd:ee:ff",
  cidr: null,
  ...(family === "IPv6" ? { scopeid: 0 } : {}),
}) as never;

describe("ServerAddressCandidateService interface addresses", () => {
  beforeEach(() => {
    mocks.baseUrl = null;
    mocks.interfaces = {
      lo0: [entry("127.0.0.1", "IPv4", true), entry("::1", "IPv6", true)],
      en0: [
        entry("203.0.113.7", "IPv4"),
        entry("192.168.1.20", "IPv4"),
        entry("169.254.10.2", "IPv4"),
        entry("fe80::1c2:3ff:fe4:5", "IPv6"),
        entry("fd12:3456::9", "IPv6"),
        entry("2001:db8::42", "IPv6"),
      ],
      utun4: [entry("100.101.102.103", "IPv4")],
      en5: [entry("10.0.0.4", "IPv4"), entry("172.20.1.1", "IPv4")],
    };
  });

  it("lists private as LAN and 100.64/10 as tailnet-like, public addresses after them, and no link-local address", () => {
    const candidates = new ServerAddressCandidateService().listCandidates({ currentNodeBaseUrl: "http://192.168.1.20:29695" });

    expect(candidates.map(({ kind, label, baseUrl }) => ({ kind, label, baseUrl }))).toEqual([
      { kind: "current_node", label: "Current bound node URL", baseUrl: "http://192.168.1.20:29695" },
      { kind: "lan", label: "Private/LAN address (en0)", baseUrl: "http://[fd12:3456::9]:29695" },
      { kind: "tailnet_like", label: "Tailnet-like address (utun4)", baseUrl: "http://100.101.102.103:29695" },
      { kind: "lan", label: "Private/LAN address (en5)", baseUrl: "http://10.0.0.4:29695" },
      { kind: "lan", label: "Private/LAN address (en5)", baseUrl: "http://172.20.1.1:29695" },
      { kind: "public", label: "Public address (en0)", baseUrl: "http://203.0.113.7:29695" },
      { kind: "public", label: "Public address (en0)", baseUrl: "http://[2001:db8::42]:29695" },
    ]);
    expect(candidates.some((candidate) => /169\.254|fe80/i.test(candidate.baseUrl))).toBe(false);
  });

  it("gives each interface candidate an ID from its kind and address", () => {
    const candidates = new ServerAddressCandidateService().listCandidates({ currentNodeBaseUrl: "http://127.0.0.1:8000" });

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "current-node-url",
      "docker-host",
      "lan-192.168.1.20",
      "lan-fd12:3456::9",
      "tailnet_like-100.101.102.103",
      "lan-10.0.0.4",
      "lan-172.20.1.1",
      "public-203.0.113.7",
      "public-2001:db8::42",
    ]);
  });
});
