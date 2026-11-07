/**
 * IPv4 address ranges used by Phone Access: the pairing URL policy and the network interface classifier.
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
