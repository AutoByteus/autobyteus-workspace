import { describe, expect, it } from "vitest";
import {
  classifyInterfaces,
  flattenNetworkInterfaces,
  listTailscaleRangeTunnelAddresses,
  type InterfaceAddress,
} from "../../../src/remote-access/services/network-interface-classifier.js";

// Synthetic interface lists recorded in the shape `os.networkInterfaces()` reports on each system.
// Addresses and hardware addresses are invented; none belongs to a real machine.
const NO_MAC = "00:00:00:00:00:00";
const v4 = (interfaceName: string, address: string, mac = NO_MAC, internal = false, cidr: string | null = null): InterfaceAddress =>
  ({ interfaceName, address, family: "IPv4", internal, mac, cidr });
const v6 = (interfaceName: string, address: string, mac = NO_MAC): InterfaceAddress =>
  ({ interfaceName, address, family: "IPv6", internal: false, mac, cidr: null });

const macosLaptop: InterfaceAddress[] = [
  v4("lo0", "127.0.0.1", NO_MAC, true),
  v6("en0", "fe80::1c2b:3a4d:5e6f:7081", "02:00:00:00:00:01"),
  v4("en0", "192.168.1.20", "02:00:00:00:00:01", false, "192.168.1.20/24"),
  v6("awdl0", "fe80::aa:bb", "02:00:00:00:00:02"),
  v6("llw0", "fe80::aa:cc", "02:00:00:00:00:02"),
  v4("bridge100", "192.168.64.1", "02:00:00:00:00:03"),
  v4("anpi0", "169.254.10.10", "02:00:00:00:00:04"),
  v6("utun3", "fe80::ce81:b1c:bd2c:69e"),
  v4("utun5", "100.101.102.103"),
  v6("utun5", "fd7a:115c:a1e0::1"),
];

const linuxServer: InterfaceAddress[] = [
  v4("lo", "127.0.0.1", NO_MAC, true),
  v4("enp3s0", "192.168.10.5", "02:00:00:00:10:01"),
  v6("enp3s0", "fe80::10:1", "02:00:00:00:10:01"),
  v4("docker0", "172.17.0.1", "02:42:00:00:00:01"),
  v4("br-5f2a1b3c4d5e", "172.18.0.1", "02:42:00:00:00:02"),
  v6("veth1a2b3c4", "fe80::42:1", "02:42:00:00:00:03"),
  v4("virbr0", "192.168.122.1", "52:54:00:00:00:01"),
  v4("lxdbr0", "10.150.0.1", "00:16:3e:00:00:01"),
  v4("cni0", "10.42.0.1", "02:00:00:00:00:05"),
  v4("flannel.1", "10.42.0.0", "02:00:00:00:00:06"),
  v4("tailscale0", "100.88.1.2"),
  v4("wg0", "10.8.0.2"),
];

describe("network interface classifier", () => {
  it("macOS: Tailscale by its .ts.net reverse name, Wi-Fi as the local network, bridges and link-local excluded", () => {
    expect(listTailscaleRangeTunnelAddresses(macosLaptop)).toEqual(["100.101.102.103"]);
    const result = classifyInterfaces({
      entries: macosLaptop,
      reverseNames: new Map([["100.101.102.103", "laptop.example-tailnet.ts.net."]]),
      defaultRouteInterfaceName: "en0",
    });
    expect(result).toEqual({
      tailscale: { address: "100.101.102.103", dnsName: "laptop.example-tailnet.ts.net" },
      vpnAddresses: [],
      localAddresses: ["192.168.1.20"],
      localSubnets: ["192.168.1.20/24"],
    });
  });

  it("Linux: Tailscale by its interface name without a reverse name; WireGuard as a VPN; container and VM bridges excluded", () => {
    const result = classifyInterfaces({
      entries: linuxServer,
      reverseNames: new Map([["100.88.1.2", null]]),
      defaultRouteInterfaceName: "enp3s0",
    });
    expect(result).toEqual({
      tailscale: { address: "100.88.1.2", dnsName: null },
      vpnAddresses: ["10.8.0.2"],
      localAddresses: ["192.168.10.5"],
      localSubnets: [],
    });
  });

  it("an unconfirmed 100.64/10 tunnel address is a local-network address; one with a hardware address is carrier-grade NAT and excluded", () => {
    const result = classifyInterfaces({
      entries: [
        v4("eth0", "100.70.1.2", "02:00:00:00:20:01"),
        v4("tun0", "100.90.1.2"),
        v4("wlan0", "192.168.0.7", "02:00:00:00:20:02"),
      ],
      reverseNames: new Map([["100.90.1.2", "host.example.com"]]),
      defaultRouteInterfaceName: "wlan0",
    });
    expect(result).toEqual({
      tailscale: null,
      vpnAddresses: [],
      localAddresses: ["192.168.0.7", "100.90.1.2"],
      localSubnets: [],
    });
  });

  it("puts the default-route interface's address first, then the rest in OS order", () => {
    const result = classifyInterfaces({
      entries: [
        v4("eth0", "10.0.0.5", "02:00:00:00:30:01"),
        v4("wlan0", "192.168.1.9", "02:00:00:00:30:02"),
        v4("eth1", "172.20.0.5", "02:00:00:00:30:03"),
      ],
      reverseNames: new Map(),
      defaultRouteInterfaceName: "wlan0",
    });
    expect(result.localAddresses).toEqual(["192.168.1.9", "10.0.0.5", "172.20.0.5"]);
  });

  it("never offers loopback, link-local, public or IPv6 addresses (AC-003)", () => {
    const result = classifyInterfaces({
      entries: [
        v4("lo", "127.0.0.1", NO_MAC, true),
        v4("eth0", "169.254.3.4", "02:00:00:00:40:01"),
        v4("eth1", "203.0.113.10", "02:00:00:00:40:02"),
        v4("ppp0", "198.51.100.7"),
        v6("eth0", "fe80::1", "02:00:00:00:40:01"),
        v6("eth0", "2001:db8::10", "02:00:00:00:40:01"),
      ],
      reverseNames: new Map(),
      defaultRouteInterfaceName: "eth0",
    });
    expect(result).toEqual({ tailscale: null, vpnAddresses: [], localAddresses: [], localSubnets: [] });
  });

  it("a container's own interfaces give only container-internal addresses (E-04), which the node does not report", () => {
    // In a container the node service returns no addresses at all; the classifier alone would call eth0 a local address.
    const result = classifyInterfaces({
      entries: [v4("lo", "127.0.0.1", NO_MAC, true), v4("eth0", "172.17.0.2", "02:42:ac:11:00:02")],
      reverseNames: new Map(),
      defaultRouteInterfaceName: "eth0",
    });
    expect(result.localAddresses).toEqual(["172.17.0.2"]);
  });

  it("flattens os.networkInterfaces() in OS order, including numeric families", () => {
    expect(flattenNetworkInterfaces({
      en0: [{ address: "192.168.1.20", family: 4, internal: false, mac: "02:00:00:00:00:01", cidr: "192.168.1.20/24" }],
      utun5: [{ address: "100.101.102.103", family: "IPv4", internal: false, mac: NO_MAC, cidr: "100.101.102.103/32" }],
    })).toEqual([
      v4("en0", "192.168.1.20", "02:00:00:00:00:01", false, "192.168.1.20/24"),
      v4("utun5", "100.101.102.103", NO_MAC, false, "100.101.102.103/32"),
    ]);
  });
});
