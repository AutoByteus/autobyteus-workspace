import { describe, expect, it } from "vitest";
import {
  localNetworkIdFor,
  normalizeHardwareAddress,
  parseLinuxProcArp,
  parseLinuxProcRoute,
  parseMacosArp,
  parseMacosRouteGetDefault,
} from "../../../src/remote-access/services/default-route.js";

// Synthetic outputs in the exact formats of macOS `route`/`arp` and Linux `/proc/net/{route,arp}`; invented values.
const MACOS_ROUTE_OUTPUT = `   route to: default
destination: default
       mask: default
    gateway: 192.168.1.1
  interface: en0
      flags: <UP,GATEWAY,DONE,STATIC,PRCLONING,GLOBAL>
 recvpipe  sendpipe  ssthresh  rtt,msec    rttvar  hopcount      mtu     expire
       0         0         0         0         0         0      1500         0
`;

const MACOS_ARP_OUTPUT = "? (192.168.1.1) at 2:0:0:a:b:c on en0 ifscope [ethernet]\n";
const MACOS_ARP_INCOMPLETE = "? (192.168.1.1) at (incomplete) on en0 ifscope [ethernet]\n";

const LINUX_PROC_ROUTE = `Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask\t\tMTU\tWindow\tIRTT
wg0\t00000000\t00000000\t0001\t0\t0\t50\t00000000\t0\t0\t0
enp3s0\t00000000\t010AA8C0\t0003\t0\t0\t100\t00000000\t0\t0\t0
wlan0\t00000000\t0101A8C0\t0003\t0\t0\t600\t00000000\t0\t0\t0
enp3s0\t000AA8C0\t00000000\t0001\t0\t0\t100\t00FFFFFF\t0\t0\t0
`;

const LINUX_PROC_ARP = `IP address       HW type     Flags       HW address            Mask     Device
192.168.10.1     0x1         0x2         02:00:00:0a:0b:0c     *        enp3s0
192.168.10.7     0x1         0x0         00:00:00:00:00:00     *        enp3s0
`;

describe("default route", () => {
  it("parses macOS route and arp output", () => {
    expect(parseMacosRouteGetDefault(MACOS_ROUTE_OUTPUT)).toEqual({ gateway: "192.168.1.1", interfaceName: "en0" });
    expect(parseMacosArp(MACOS_ARP_OUTPUT)).toBe("02:00:00:0a:0b:0c");
    expect(parseMacosArp(MACOS_ARP_INCOMPLETE)).toBeNull();
    expect(parseMacosRouteGetDefault("route: writing to routing socket: not in table\n"))
      .toEqual({ gateway: null, interfaceName: null });
  });

  it("parses Linux /proc/net/route (lowest-metric up gateway route) and /proc/net/arp (complete entries only)", () => {
    expect(parseLinuxProcRoute(LINUX_PROC_ROUTE)).toEqual({ gateway: "192.168.10.1", interfaceName: "enp3s0" });
    expect(parseLinuxProcArp(LINUX_PROC_ARP, "192.168.10.1")).toBe("02:00:00:0a:0b:0c");
    expect(parseLinuxProcArp(LINUX_PROC_ARP, "192.168.10.7")).toBeNull();
    expect(parseLinuxProcArp(LINUX_PROC_ARP, "192.168.10.9")).toBeNull();
    expect(parseLinuxProcRoute("Iface\tDestination\tGateway\n")).toEqual({ gateway: null, interfaceName: null });
  });

  it("derives a stable network ID from the router's hardware address, or this-computer", () => {
    const id = localNetworkIdFor("02:00:00:0a:0b:0c");
    expect(id).toMatch(/^gw_[0-9a-f]{16}$/);
    expect(localNetworkIdFor(normalizeHardwareAddress("2:0:0:A:B:C"))).toBe(id);
    expect(localNetworkIdFor("02:00:00:0a:0b:0d")).not.toBe(id);
    expect(localNetworkIdFor(null)).toBe("this-computer");
    expect(normalizeHardwareAddress("00:00:00:00:00:00")).toBeNull();
    expect(normalizeHardwareAddress("not-a-mac")).toBeNull();
  });
});
