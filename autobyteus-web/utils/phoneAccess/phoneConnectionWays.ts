import type { ConnectionWay, NodeNetwork } from '~/types/remoteAccess';

/** The order in which a ready way is recommended (REQ-002). */
export const CONNECTION_WAY_PRIORITY: readonly ConnectionWay[] = ['company_address', 'tailscale', 'vpn', 'local_network'];

/** The order of the tabs on the panel (UI/UX spec). */
export const CONNECTION_WAY_TABS: readonly ConnectionWay[] = ['local_network', 'tailscale', 'vpn', 'company_address'];

/**
 * - `embedded`: the desktop's own node; its facts are this computer's.
 * - `local_container`: a node in a container on this computer (it says it runs in a container and the desktop reaches it
 *   at a loopback address); this computer's facts come from the embedded node, the port from the node's address.
 * - `remote`: a node on another computer (or in a container there); its own facts plus the address the desktop uses.
 */
export type PhoneNodeKind = 'embedded' | 'local_container' | 'remote';

/** Who keeps the "allow phones on this network" answer: the target node, or this computer's embedded node. */
export type AllowAnswerKeeper = 'target' | 'embedded';

export type ComposedWays = {
  /** Base URLs to check per way, best first; a way is ready when one of them reaches the node. */
  candidates: Record<ConnectionWay, string[]>;
  /** The Tailscale `https://` name among the Tailscale candidates, when there is one. */
  tailscaleHttpsUrl: string | null;
  /** Whether the target's computer runs Tailscale at all (the Advanced command is offered only then). */
  tailscaleDetected: boolean;
  localNetwork: { networkId: string; allowed: boolean; keeper: AllowAnswerKeeper };
};

export type WayReadiness = Record<ConnectionWay, { ready: boolean; address: string | null }>;

export type BlockedReason = 'no_network' | 'docker_unpublished';

const THIS_COMPUTER_NETWORK_ID = 'this-computer';
const TAILSCALE_DNS_SUFFIX = '.ts.net';

const parseIpv4 = (host: string): number[] | null => {
  const parts = host.split('.');
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  return octets.every((octet) => octet <= 255) ? octets : null;
};

const isPrivateIpv4 = (octets: number[]): boolean =>
  octets[0] === 10
  || (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31)
  || (octets[0] === 192 && octets[1] === 168);

const isTailscaleRangeIpv4 = (octets: number[]): boolean => octets[0] === 100 && octets[1]! >= 64 && octets[1]! <= 127;

const isLoopbackHost = (host: string): boolean =>
  host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || host === '::1' || parseIpv4(host)?.[0] === 127;

const isTailscaleName = (host: string): boolean => host.endsWith(TAILSCALE_DNS_SUFFIX);

/** The port of a node's address in the desktop's registry (the port a phone uses with this computer's addresses). */
export const portOfBaseUrl = (baseUrl: string): number => {
  const url = new URL(baseUrl);
  return url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
};

const hostOfBaseUrl = (baseUrl: string): string => new URL(baseUrl).hostname.toLowerCase();

const httpUrl = (address: string, port: number): string => `http://${address}:${port}`;

/** Recognises the node's kind from its window entry and its own network report. */
export const recognizeNodeKind = (input: {
  isEmbeddedEntry: boolean;
  targetBaseUrl: string;
  targetNetwork: NodeNetwork;
}): PhoneNodeKind => {
  if (input.isEmbeddedEntry) return 'embedded';
  if (input.targetNetwork.runsInContainer && isLoopbackHost(hostOfBaseUrl(input.targetBaseUrl))) return 'local_container';
  return 'remote';
};

const unique = (values: string[]): string[] => [...new Set(values)];

/** Which way the address the desktop uses for a remote node belongs to, by its host. */
const wayOfDesktopAddress = (baseUrl: string, targetNetwork: NodeNetwork): ConnectionWay | null => {
  const url = new URL(baseUrl);
  const host = url.hostname.toLowerCase();
  if (isLoopbackHost(host)) return null;
  if (isTailscaleName(host) || host === targetNetwork.tailscale?.address) return 'tailscale';
  if (targetNetwork.vpnAddresses.includes(host)) return 'vpn';
  const octets = parseIpv4(host);
  if (octets) {
    return isPrivateIpv4(octets) || isTailscaleRangeIpv4(octets) ? 'local_network' : null;
  }
  if (host.includes(':') || host.startsWith('[')) return null; // IPv6 is never offered
  return url.protocol === 'https:' ? 'company_address' : 'local_network';
};

/**
 * Builds each way's candidate addresses for one node (design: way composition per node kind).
 * The port is always the port of the node's address in the desktop's registry.
 */
export const composeConnectionWays = (input: {
  kind: PhoneNodeKind;
  targetBaseUrl: string;
  targetNetwork: NodeNetwork;
  /** This computer's facts from the embedded node; required for `local_container`. */
  hostNetwork?: NodeNetwork | null;
  /** The node's Tailscale Serve HTTPS port when it is a `local_container` (8443…8542). */
  tailscaleServePort?: number | null;
}): ComposedWays => {
  const port = portOfBaseUrl(input.targetBaseUrl);
  const facts = input.kind === 'local_container' ? input.hostNetwork ?? null : input.targetNetwork;
  const candidates: Record<ConnectionWay, string[]> = {
    company_address: [],
    tailscale: [],
    vpn: [],
    local_network: [],
  };

  if (input.targetNetwork.configuredBaseUrl) {
    candidates.company_address.push(input.targetNetwork.configuredBaseUrl);
  }

  let tailscaleHttpsUrl: string | null = null;
  if (facts?.tailscale) {
    if (facts.tailscale.dnsName) {
      tailscaleHttpsUrl = input.kind === 'local_container' && input.tailscaleServePort
        ? `https://${facts.tailscale.dnsName}:${input.tailscaleServePort}`
        : `https://${facts.tailscale.dnsName}`;
      candidates.tailscale.push(tailscaleHttpsUrl);
    }
    candidates.tailscale.push(httpUrl(facts.tailscale.address, port));
  }
  for (const address of facts?.vpnAddresses ?? []) {
    candidates.vpn.push(httpUrl(address, port));
  }
  for (const address of facts?.localNetwork?.addresses ?? []) {
    candidates.local_network.push(httpUrl(address, port));
  }

  if (input.kind === 'remote') {
    const way = wayOfDesktopAddress(input.targetBaseUrl, input.targetNetwork);
    if (way) {
      candidates[way].push(input.targetBaseUrl.replace(/\/+$/, ''));
    }
  }

  const localFacts = facts?.localNetwork ?? null;
  return {
    candidates: {
      company_address: unique(candidates.company_address),
      tailscale: unique(candidates.tailscale),
      vpn: unique(candidates.vpn),
      local_network: unique(candidates.local_network),
    },
    tailscaleHttpsUrl,
    tailscaleDetected: Boolean(facts?.tailscale),
    localNetwork: {
      networkId: localFacts?.networkId ?? THIS_COMPUTER_NETWORK_ID,
      allowed: localFacts?.allowed ?? false,
      keeper: input.kind === 'remote' ? 'target' : 'embedded',
    },
  };
};

/** Each way's first candidate that reached the node. */
export const readinessFromChecks = (
  candidates: Record<ConnectionWay, string[]>,
  reached: ReadonlySet<string>,
): WayReadiness => {
  const entry = (way: ConnectionWay) => {
    const address = candidates[way].find((candidate) => reached.has(candidate)) ?? null;
    return { ready: address !== null, address };
  };
  return {
    company_address: entry('company_address'),
    tailscale: entry('tailscale'),
    vpn: entry('vpn'),
    local_network: entry('local_network'),
  };
};

/** The best ready way, or none. */
export const recommendedWay = (readiness: WayReadiness): ConnectionWay | null =>
  CONNECTION_WAY_PRIORITY.find((way) => readiness[way].ready) ?? null;

/** Why no way works, when none does. */
export const blockedReason = (kind: PhoneNodeKind, composed: ComposedWays, readiness: WayReadiness): BlockedReason | null => {
  if (recommendedWay(readiness)) return null;
  const hasCandidates = CONNECTION_WAY_PRIORITY.some((way) => composed.candidates[way].length > 0);
  if (kind === 'local_container' && hasCandidates) return 'docker_unpublished';
  return hasCandidates ? null : 'no_network';
};

/**
 * Whether a code for this way carries the HTTP acknowledgement: Tailscale, VPN and a company address do (an encrypted
 * tunnel, or an address an admin or the user chose); the local network only once the owner allowed it.
 */
export const httpAcknowledgedFor = (way: ConnectionWay, localNetworkAllowed: boolean): boolean =>
  way === 'local_network' ? localNetworkAllowed : true;
