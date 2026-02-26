import type {
  DiscordPeerCandidateIndex,
  ListDiscordPeerCandidatesResult,
} from "../../infrastructure/adapters/discord-business/discord-peer-candidate-index.js";

export class DiscordPeerDiscoveryNotEnabledError extends Error {
  readonly code = "DISCORD_DISCOVERY_NOT_ENABLED";

  constructor() {
    super("Discord peer discovery is not enabled.");
    this.name = "DiscordPeerDiscoveryNotEnabledError";
  }
}

export type DiscordPeerDiscoveryServiceConfig = {
  enabled: boolean;
  accountId: string | null;
};

export type ListDiscordPeerDiscoveryCandidatesOptions = {
  accountId?: string | null;
  includeGroups?: boolean;
  limit?: number;
};

export class DiscordPeerDiscoveryService {
  private readonly index: DiscordPeerCandidateIndex | null;
  private readonly config: DiscordPeerDiscoveryServiceConfig;

  constructor(
    index: DiscordPeerCandidateIndex | null,
    config: DiscordPeerDiscoveryServiceConfig,
  ) {
    this.index = index;
    this.config = config;
  }

  async listPeerCandidates(
    options: ListDiscordPeerDiscoveryCandidatesOptions = {},
  ): Promise<ListDiscordPeerCandidatesResult> {
    if (!this.config.enabled || !this.index) {
      throw new DiscordPeerDiscoveryNotEnabledError();
    }

    const accountId = resolveAccountId(options.accountId, this.config.accountId);
    return this.index.listCandidates({
      accountId,
      includeGroups: options.includeGroups,
      limit: options.limit,
    });
  }
}

const resolveAccountId = (
  preferred: string | null | undefined,
  fallback: string | null,
): string => {
  const preferredNormalized =
    typeof preferred === "string" && preferred.trim().length > 0 ? preferred.trim() : null;
  if (preferredNormalized) {
    return preferredNormalized;
  }
  if (typeof fallback === "string" && fallback.trim().length > 0) {
    return fallback.trim();
  }
  throw new Error("accountId is required for Discord peer discovery.");
};
