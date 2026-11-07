import {
  isIpv4LinkLocal,
  isIpv4Private,
  isIpv4TailscaleRange,
  parseIpv4Address,
} from "./ip-address-ranges.js";

/** One IPv4 or IPv6 address of one interface, as `os.networkInterfaces()` reports it. */
export type InterfaceAddress = {
  interfaceName: string;
  address: string;
  family: string;
  internal: boolean;
  /** `00:00:00:00:00:00` when the interface has no hardware address (a tunnel). */
  mac: string;
};

export type ClassifiedInterfaces = {
  tailscale: { address: string; dnsName: string | null } | null;
  vpnAddresses: string[];
  /** Default-route interface's address first, then OS order. */
  localAddresses: string[];
};

/** Bridges, virtual machines, containers and Apple peer-to-peer links: never a way a phone reaches this computer. */
const EXCLUDED_INTERFACE_PREFIXES = [
  "docker",
  "br-",
  "veth",
  "virbr",
  "vmnet",
  "vmenet",
  "vboxnet",
  "vnic",
  "lxcbr",
  "lxdbr",
  "incusbr",
  "cni",
  "flannel",
  "bridge",
  "awdl",
  "llw",
  "anpi",
];

const TAILSCALE_DNS_SUFFIX = ".ts.net";
const NO_HARDWARE_ADDRESS = "00:00:00:00:00:00";

const hasHardwareAddress = (entry: InterfaceAddress): boolean =>
  Boolean(entry.mac) && entry.mac !== NO_HARDWARE_ADDRESS;

const isExcludedInterfaceName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return EXCLUDED_INTERFACE_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

const isTailscaleDnsName = (name: string | null | undefined): name is string =>
  Boolean(name) && name!.toLowerCase().replace(/\.$/, "").endsWith(TAILSCALE_DNS_SUFFIX);

/** IPv4 addresses that may be considered at all (rule 1 minus the range rules): not internal, link-local or on an excluded interface. */
const isConsidered = (entry: InterfaceAddress): boolean =>
  entry.family === "IPv4"
  && !entry.internal
  && !isExcludedInterfaceName(entry.interfaceName)
  && parseIpv4Address(entry.address) !== null
  && !isIpv4LinkLocal(parseIpv4Address(entry.address)!);

/**
 * The `100.64/10` addresses without a hardware address: the only ones whose reverse name decides Tailscale.
 * The caller looks them up and passes the names to `classifyInterfaces`.
 */
export const listTailscaleRangeTunnelAddresses = (entries: InterfaceAddress[]): string[] =>
  entries
    .filter((entry) => isConsidered(entry) && !hasHardwareAddress(entry))
    .filter((entry) => isIpv4TailscaleRange(parseIpv4Address(entry.address)!))
    .map((entry) => entry.address);

/**
 * Classifies this computer's IPv4 addresses (IPv6 is never offered):
 * 1. excluded: internal, link-local, public, excluded interface names, `100.64/10` with a hardware address (carrier-grade NAT);
 * 2. Tailscale: `100.64/10`, confirmed by a `.ts.net` reverse name or a `tailscale*` interface;
 * 3. VPN: private with no hardware address;
 * 4. local network: private with a hardware address, plus unconfirmed `100.64/10` tunnel addresses.
 */
export const classifyInterfaces = (input: {
  entries: InterfaceAddress[];
  reverseNames: ReadonlyMap<string, string | null>;
  defaultRouteInterfaceName: string | null;
}): ClassifiedInterfaces => {
  let tailscale: ClassifiedInterfaces["tailscale"] = null;
  const vpnAddresses: string[] = [];
  const localEntries: InterfaceAddress[] = [];

  for (const entry of input.entries) {
    if (!isConsidered(entry)) {
      continue;
    }
    const octets = parseIpv4Address(entry.address)!;
    if (isIpv4TailscaleRange(octets)) {
      if (hasHardwareAddress(entry)) {
        continue;
      }
      const reverseName = input.reverseNames.get(entry.address) ?? null;
      const confirmed = isTailscaleDnsName(reverseName) || entry.interfaceName.toLowerCase().startsWith("tailscale");
      if (confirmed) {
        tailscale ??= {
          address: entry.address,
          dnsName: isTailscaleDnsName(reverseName) ? reverseName.toLowerCase().replace(/\.$/, "") : null,
        };
      } else {
        localEntries.push(entry);
      }
      continue;
    }
    if (!isIpv4Private(octets)) {
      continue;
    }
    if (hasHardwareAddress(entry)) {
      localEntries.push(entry);
    } else {
      vpnAddresses.push(entry.address);
    }
  }

  const defaultRouteFirst = [
    ...localEntries.filter((entry) => entry.interfaceName === input.defaultRouteInterfaceName),
    ...localEntries.filter((entry) => entry.interfaceName !== input.defaultRouteInterfaceName),
  ];
  return {
    tailscale,
    vpnAddresses: unique(vpnAddresses),
    localAddresses: unique(defaultRouteFirst.map((entry) => entry.address)),
  };
};

const unique = (values: string[]): string[] => [...new Set(values)];

/** Flattens `os.networkInterfaces()` into one list, in OS order. */
export const flattenNetworkInterfaces = (
  interfaces: NodeJS.Dict<Array<{ address: string; family: string | number; internal: boolean; mac: string }>>,
): InterfaceAddress[] =>
  Object.entries(interfaces).flatMap(([interfaceName, addresses]) =>
    (addresses ?? []).map((info) => ({
      interfaceName,
      address: info.address,
      family: info.family === 4 ? "IPv4" : info.family === 6 ? "IPv6" : String(info.family),
      internal: info.internal,
      mac: info.mac,
    })),
  );
