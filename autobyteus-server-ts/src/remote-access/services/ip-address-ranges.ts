/**
 * IP address ranges: the one owner of these range facts. Used by Phone Access (the pairing URL policy and the
 * network interface classifier) and by the node address lists (`server-addressing`).
 */
export type Ipv4Octets = [number, number, number, number];

export const parseIpv4Address = (value: string): Ipv4Octets | null => {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return null;
  }
  if (!parts.every((part) => /^\d{1,3}$/.test(part))) {
    return null;
  }
  const octets = parts.map((part) => Number(part));
  if (!octets.every((part) => part >= 0 && part <= 255)) {
    return null;
  }
  return octets as Ipv4Octets;
};

export const isIpv4LoopbackOrUnspecified = (octets: Ipv4Octets): boolean =>
  octets[0] === 127 || octets[0] === 0;

/** RFC 1918 private ranges: 10/8, 172.16/12, 192.168/16. */
export const isIpv4Private = (octets: Ipv4Octets): boolean =>
  octets[0] === 10
  || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  || (octets[0] === 192 && octets[1] === 168);

/** 169.254/16. */
export const isIpv4LinkLocal = (octets: Ipv4Octets): boolean =>
  octets[0] === 169 && octets[1] === 254;

/** 100.64/10: the range Tailscale gives its addresses from (also carrier-grade NAT space). */
export const isIpv4TailscaleRange = (octets: Ipv4Octets): boolean =>
  octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;

/** The first 16 bits of an IPv6 address, or `null` when the value is not an IPv6 address. */
const parseIpv6FirstHextet = (value: string): number | null => {
  if (!value.includes(":")) {
    return null;
  }
  const first = value.split(":")[0] ?? "";
  if (!/^[0-9a-f]{0,4}$/i.test(first)) {
    return null;
  }
  return first === "" ? 0 : Number.parseInt(first, 16);
};

/** fc00::/7: IPv6 unique local addresses, the IPv6 counterpart of the private ranges. */
export const isIpv6UniqueLocal = (value: string): boolean => {
  const hextet = parseIpv6FirstHextet(value);
  return hextet !== null && (hextet & 0xfe00) === 0xfc00;
};

/** fe80::/10. */
export const isIpv6LinkLocal = (value: string): boolean => {
  const hextet = parseIpv6FirstHextet(value);
  return hextet !== null && (hextet & 0xffc0) === 0xfe80;
};
