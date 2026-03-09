import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
export type DiscordRestSendTarget = {
    targetType: "USER";
    userId: string;
    threadId: string | null;
} | {
    targetType: "CHANNEL";
    channelId: string;
    threadId: string | null;
};
export type DiscordRestSendInput = {
    target: DiscordRestSendTarget;
    chunks: string[];
};
export type DiscordRestClientConfig = {
    botToken: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
};
export declare class DiscordRestClientError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    readonly status: number | null;
    readonly retryAfterMs: number | null;
    constructor(input: {
        code: string;
        detail: string;
        retryable: boolean;
        status?: number | null;
        retryAfterMs?: number | null;
    });
}
export declare class DiscordRestClient {
    private readonly botToken;
    private readonly baseUrl;
    private readonly fetchImpl;
    private readonly dmChannelCache;
    constructor(config: DiscordRestClientConfig);
    sendMessage(input: DiscordRestSendInput): Promise<ProviderSendResult>;
    private resolveDmChannelId;
    private requestJson;
}
//# sourceMappingURL=discord-rest-client.d.ts.map