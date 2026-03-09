import type { DiscordPeerCandidateIndex, ListDiscordPeerCandidatesResult } from "../../infrastructure/adapters/discord-business/discord-peer-candidate-index.js";
export declare class DiscordPeerDiscoveryNotEnabledError extends Error {
    readonly code = "DISCORD_DISCOVERY_NOT_ENABLED";
    constructor();
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
export declare class DiscordPeerDiscoveryService {
    private readonly index;
    private readonly config;
    constructor(index: DiscordPeerCandidateIndex | null, config: DiscordPeerDiscoveryServiceConfig);
    listPeerCandidates(options?: ListDiscordPeerDiscoveryCandidatesOptions): Promise<ListDiscordPeerCandidatesResult>;
}
//# sourceMappingURL=discord-peer-discovery-service.d.ts.map