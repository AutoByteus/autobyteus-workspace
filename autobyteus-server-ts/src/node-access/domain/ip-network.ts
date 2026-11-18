import { BlockList, isIP } from "node:net";

/** One IP network in CIDR form (`10.8.0.0/16`, `fd7a:115c:a1e0::/48`), parsed. */
export type IpNetwork = Readonly<{ address: string; prefix: number; family: "ipv4" | "ipv6" }>;

/** Parses `address/prefix`; `null` when it is not a valid IPv4 or IPv6 network. The address may be any host in it. */
export const parseIpNetwork = (value: string): IpNetwork | null => {
  const [address = "", prefixText = "", extra] = value.trim().split("/");
  if (extra !== undefined || !/^\d{1,3}$/.test(prefixText)) return null;
  const version = isIP(address);
  const prefix = Number(prefixText);
  if (version === 4 && prefix <= 32) return Object.freeze({ address, prefix, family: "ipv4" });
  if (version === 6 && prefix <= 128) return Object.freeze({ address: address.toLowerCase(), prefix, family: "ipv6" });
  return null;
};

/** A set of networks an address is matched against (an IPv4 address never matches an IPv6 network). */
export type IpNetworkSet = Readonly<{ contains(address: string, family: "ipv4" | "ipv6"): boolean }>;

export const createIpNetworkSet = (networks: readonly IpNetwork[]): IpNetworkSet => {
  const list = new BlockList();
  networks.forEach((network) => list.addSubnet(network.address, network.prefix, network.family));
  return Object.freeze({
    contains: (address: string, family: "ipv4" | "ipv6") => networks.length > 0 && list.check(address, family),
  });
};

/** The address ranges Tailscale gives its devices. */
export const TAILSCALE_NETWORKS: readonly IpNetwork[] = Object.freeze([
  parseIpNetwork("100.64.0.0/10")!,
  parseIpNetwork("fd7a:115c:a1e0::/48")!,
]);
