import type { ListTelegramPeerCandidatesResult, TelegramPeerCandidateIndex } from "../../infrastructure/adapters/telegram-business/telegram-peer-candidate-index.js";
export declare class TelegramPeerDiscoveryNotEnabledError extends Error {
    readonly code = "TELEGRAM_DISCOVERY_NOT_ENABLED";
    constructor();
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
export declare class TelegramPeerDiscoveryService {
    private readonly index;
    private readonly config;
    constructor(index: TelegramPeerCandidateIndex | null, config: TelegramPeerDiscoveryServiceConfig);
    listPeerCandidates(options?: ListTelegramPeerDiscoveryCandidatesOptions): Promise<ListTelegramPeerCandidatesResult>;
}
//# sourceMappingURL=telegram-peer-discovery-service.d.ts.map