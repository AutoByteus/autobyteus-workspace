import os from "node:os";
import { appConfigProvider } from "../config/app-config-provider.js";
import {
  isIpv4LinkLocal,
  isIpv4Private,
  isIpv4TailscaleRange,
  isIpv6LinkLocal,
  isIpv6UniqueLocal,
  parseIpv4Address,
} from "../remote-access/services/ip-address-ranges.js";
import { normalizeNodeBaseUrl } from "../remote-access/services/url-normalization.js";
import type { ServerAddressCandidate, ServerAddressCandidateKind } from "./server-address-candidate-types.js";

type InterfaceAddressKind = Extract<ServerAddressCandidateKind, "lan" | "tailnet_like" | "public">;

/** How an interface address is listed; `null` for link-local and unparseable addresses, which are not listed. */
const classifyInterfaceAddress = (address: string): InterfaceAddressKind | null => {
  const octets = parseIpv4Address(address);
  if (octets) {
    if (isIpv4LinkLocal(octets)) {
      return null;
    }
    if (isIpv4TailscaleRange(octets)) {
      return "tailnet_like";
    }
    return isIpv4Private(octets) ? "lan" : "public";
  }
  if (!address.includes(":") || isIpv6LinkLocal(address)) {
    return null;
  }
  return isIpv6UniqueLocal(address) ? "lan" : "public";
};

const INTERFACE_ADDRESS_LABELS: Record<InterfaceAddressKind, string> = {
  tailnet_like: "Tailnet-like address",
  lan: "Private/LAN address",
  public: "Public address",
};

const hostForUrl = (address: string): string => address.includes(":") ? `[${address}]` : address;

const uniqueCandidates = (candidates: ServerAddressCandidate[]): ServerAddressCandidate[] => {
  const seen = new Set<string>();
  const result: ServerAddressCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.baseUrl.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(candidate);
  }
  return result;
};

const tryNormalize = (value: string | null | undefined): string | null => {
  if (!value?.trim()) {
    return null;
  }
  try {
    return normalizeNodeBaseUrl(value);
  } catch {
    return null;
  }
};

const hasLoopbackHost = (baseUrl: string): boolean => {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
};

export class ServerAddressCandidateService {
  listCandidates(input: {
    currentNodeBaseUrl?: string | null;
    manualBaseUrl?: string | null;
  } = {}): ServerAddressCandidate[] {
    const configuredBase = tryNormalize(appConfigProvider.config.getBaseUrl());
    const candidates: ServerAddressCandidate[] = [];

    if (configuredBase) {
      candidates.push({
        id: "configured-public-url",
        kind: "configured",
        label: "Configured public URL",
        baseUrl: configuredBase,
        source: "AUTOBYTEUS_SERVER_HOST",
      });
    }

    const currentBase = tryNormalize(input.currentNodeBaseUrl);
    if (currentBase) {
      candidates.push({
        id: "current-node-url",
        kind: "current_node",
        label: "Current bound node URL",
        baseUrl: currentBase,
        source: "node-profile",
      });
    }

    const seedBase = configuredBase ?? currentBase;
    if (seedBase) {
      const parsed = new URL(seedBase);
      const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
      const protocol = parsed.protocol.replace(":", "");
      if (hasLoopbackHost(seedBase)) {
        candidates.push({
          id: "docker-host",
          kind: "docker_host",
          label: "Docker host alias",
          baseUrl: `${protocol}://host.docker.internal:${port}`,
          source: "docker-host-alias",
        });
      }

      const publicCandidates: ServerAddressCandidate[] = [];
      for (const [interfaceName, addresses] of Object.entries(os.networkInterfaces())) {
        for (const addressInfo of addresses ?? []) {
          if (addressInfo.internal || !["IPv4", "IPv6"].includes(addressInfo.family)) {
            continue;
          }
          const kind = classifyInterfaceAddress(addressInfo.address);
          if (!kind) {
            continue;
          }
          const candidate: ServerAddressCandidate = {
            id: `${kind}-${addressInfo.address}`,
            kind,
            label: `${INTERFACE_ADDRESS_LABELS[kind]} (${interfaceName})`,
            baseUrl: `${protocol}://${hostForUrl(addressInfo.address)}:${port}`,
            source: interfaceName,
          };
          (kind === "public" ? publicCandidates : candidates).push(candidate);
        }
      }
      candidates.push(...publicCandidates);
    }

    const manualBase = tryNormalize(input.manualBaseUrl);
    if (manualBase) {
      candidates.push({
        id: "manual",
        kind: "manual",
        label: "Manual URL",
        baseUrl: manualBase,
        source: "manual",
      });
    }

    return uniqueCandidates(candidates);
  }
}

let singleton: ServerAddressCandidateService | null = null;

export const getServerAddressCandidateService = (): ServerAddressCandidateService => {
  singleton ??= new ServerAddressCandidateService();
  return singleton;
};

export const resetServerAddressCandidateServiceForTests = (): void => {
  singleton = null;
};
