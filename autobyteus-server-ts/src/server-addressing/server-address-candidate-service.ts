import os from "node:os";
import { appConfigProvider } from "../config/app-config-provider.js";
import { normalizeNodeBaseUrl } from "../remote-access/services/url-normalization.js";
import type { ServerAddressCandidate, ServerAddressCandidateKind } from "./server-address-candidate-types.js";

const isTailnetLikeIp = (address: string): boolean => {
  const parts = address.split(".").map((part) => Number(part));
  return parts.length === 4
    && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    && parts[0] === 100
    && parts[1] !== undefined
    && parts[1] >= 64
    && parts[1] <= 127;
};

const isLanIp = (address: string): boolean =>
  /^10\./.test(address)
  || /^192\.168\./.test(address)
  || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  || /^169\.254\./.test(address)
  || address.startsWith("fc")
  || address.startsWith("fd");

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

      for (const [interfaceName, addresses] of Object.entries(os.networkInterfaces())) {
        for (const addressInfo of addresses ?? []) {
          if (addressInfo.internal || !["IPv4", "IPv6"].includes(addressInfo.family)) {
            continue;
          }
          const kind: ServerAddressCandidateKind = isTailnetLikeIp(addressInfo.address)
            ? "tailnet_like"
            : isLanIp(addressInfo.address)
              ? "lan"
              : "lan";
          candidates.push({
            id: `${kind}-${addressInfo.address}`,
            kind,
            label: kind === "tailnet_like"
              ? `Tailnet-like address (${interfaceName})`
              : `Private/LAN address (${interfaceName})`,
            baseUrl: `${protocol}://${hostForUrl(addressInfo.address)}:${port}`,
            source: interfaceName,
          });
        }
      }
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
