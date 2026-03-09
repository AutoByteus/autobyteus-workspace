export class DiscordPeerDiscoveryNotEnabledError extends Error {
    code = "DISCORD_DISCOVERY_NOT_ENABLED";
    constructor() {
        super("Discord peer discovery is not enabled.");
        this.name = "DiscordPeerDiscoveryNotEnabledError";
    }
}
export class DiscordPeerDiscoveryService {
    index;
    config;
    constructor(index, config) {
        this.index = index;
        this.config = config;
    }
    async listPeerCandidates(options = {}) {
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
const resolveAccountId = (preferred, fallback) => {
    const preferredNormalized = typeof preferred === "string" && preferred.trim().length > 0 ? preferred.trim() : null;
    if (preferredNormalized) {
        return preferredNormalized;
    }
    if (typeof fallback === "string" && fallback.trim().length > 0) {
        return fallback.trim();
    }
    throw new Error("accountId is required for Discord peer discovery.");
};
//# sourceMappingURL=discord-peer-discovery-service.js.map