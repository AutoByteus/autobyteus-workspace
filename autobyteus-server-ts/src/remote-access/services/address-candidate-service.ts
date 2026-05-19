import os from "node:os";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { normalizeNodeBaseUrl } from "./url-normalization.js";
import type { RemoteAccessUrlCandidate, RemoteAccessUrlCandidateKind } from "../domain/models.js";

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

const uniqueCandidates = (candidates: RemoteAccessUrlCandidate[]): RemoteAccessUrlCandidate[] => {
  const seen = new Set<string>();
  const result: RemoteAccessUrlCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.serverBaseUrl.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(candidate);
  }
  return result;
};

export class AddressCandidateService {
  listCandidates(input?: { manualServerBaseUrl?: string | null }): RemoteAccessUrlCandidate[] {
    const configuredBase = normalizeNodeBaseUrl(appConfigProvider.config.getBaseUrl());
    const configuredUrl = new URL(configuredBase);
    const port = configuredUrl.port || (configuredUrl.protocol === "https:" ? "443" : "80");
    const protocol = configuredUrl.protocol.replace(":", "");
    const candidates: RemoteAccessUrlCandidate[] = [
      {
        id: "loopback",
        kind: "loopback",
        label: "This desktop only",
        serverBaseUrl: configuredBase,
        source: "configured-base-url",
      },
    ];

    for (const [interfaceName, addresses] of Object.entries(os.networkInterfaces())) {
      for (const addressInfo of addresses ?? []) {
        if (addressInfo.internal || !["IPv4", "IPv6"].includes(addressInfo.family)) {
          continue;
        }
        const kind: RemoteAccessUrlCandidateKind = isTailnetLikeIp(addressInfo.address)
          ? "tailnet_like"
          : isLanIp(addressInfo.address)
            ? "lan"
            : "lan";
        candidates.push({
          id: `${kind}-${addressInfo.address}`,
          kind,
          label: kind === "tailnet_like" ? `Tailnet-like address (${interfaceName})` : `Private/LAN address (${interfaceName})`,
          serverBaseUrl: `${protocol}://${hostForUrl(addressInfo.address)}:${port}`,
          source: interfaceName,
        });
      }
    }

    if (input?.manualServerBaseUrl?.trim()) {
      candidates.push({
        id: "manual",
        kind: "manual",
        label: "Manual URL",
        serverBaseUrl: normalizeNodeBaseUrl(input.manualServerBaseUrl),
        source: "manual",
      });
    }

    return uniqueCandidates(candidates);
  }
}

let singleton: AddressCandidateService | null = null;

export const getAddressCandidateService = (): AddressCandidateService => {
  singleton ??= new AddressCandidateService();
  return singleton;
};

export const resetAddressCandidateServiceForTests = (): void => {
  singleton = null;
};
