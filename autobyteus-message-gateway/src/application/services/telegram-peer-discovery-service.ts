import type {
  ListTelegramPeerCandidatesResult,
  TelegramPeerCandidateIndex,
} from "../../infrastructure/adapters/telegram-business/telegram-peer-candidate-index.js";

export class TelegramPeerDiscoveryNotEnabledError extends Error {
  readonly code = "TELEGRAM_DISCOVERY_NOT_ENABLED";

  constructor() {
    super("Telegram peer discovery is not enabled.");
    this.name = "TelegramPeerDiscoveryNotEnabledError";
  }
}

export type TelegramPeerDiscoveryServiceConfig = {
  enabled: boolean;
  accountId: string | null;
};

export type ListTelegramPeerDiscoveryCandidatesOptions = {
  accountId?: string | null;
  includeGroups?: boolean;
  limit?: number;
};

export class TelegramPeerDiscoveryService {
  private readonly index: TelegramPeerCandidateIndex | null;
  private readonly config: TelegramPeerDiscoveryServiceConfig;

  constructor(
    index: TelegramPeerCandidateIndex | null,
    config: TelegramPeerDiscoveryServiceConfig,
  ) {
    this.index = index;
    this.config = config;
  }

  async listPeerCandidates(
    options: ListTelegramPeerDiscoveryCandidatesOptions = {},
  ): Promise<ListTelegramPeerCandidatesResult> {
    if (!this.config.enabled || !this.index) {
      throw new TelegramPeerDiscoveryNotEnabledError();
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
  throw new Error("accountId is required for Telegram peer discovery.");
};
