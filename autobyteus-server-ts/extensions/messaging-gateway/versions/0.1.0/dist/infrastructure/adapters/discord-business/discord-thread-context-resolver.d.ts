import type { DiscordGatewayMessageCreateEvent } from "./discord-gateway-client.js";
export declare class DiscordThreadContextResolverError extends Error {
    readonly code: string;
    constructor(code: string, detail: string);
}
export type DiscordResolvedThreadContext = {
    canonicalChannelId: string;
    canonicalThreadId: string | null;
};
export type DiscordThreadContextResolver = {
    resolveThreadContext: (event: DiscordGatewayMessageCreateEvent) => Promise<DiscordResolvedThreadContext>;
};
export declare class DefaultDiscordThreadContextResolver implements DiscordThreadContextResolver {
    resolveThreadContext(event: DiscordGatewayMessageCreateEvent): Promise<DiscordResolvedThreadContext>;
}
//# sourceMappingURL=discord-thread-context-resolver.d.ts.map