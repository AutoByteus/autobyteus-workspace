export type DiscordGatewayAttachment = {
    id: string | null;
    url: string;
    contentType: string | null;
    fileName: string | null;
    sizeBytes: number | null;
};
export type DiscordGatewayMessageCreateEvent = {
    id: string;
    authorId: string;
    authorDisplayName: string | null;
    authorIsBot: boolean;
    channelId: string;
    guildId: string | null;
    threadId: string | null;
    content: string;
    timestamp: string;
    mentionsAgent: boolean;
    mentioned: boolean;
    attachments: DiscordGatewayAttachment[];
    raw: Record<string, unknown>;
};
export type DiscordGatewayConnectorInput = {
    botToken: string;
    intents: number;
    dispatchMessageCreate: (event: DiscordGatewayMessageCreateEvent) => Promise<void>;
    onSocketClosed?: (reason: string) => void;
    fetchImpl: typeof fetch;
};
type DiscordGatewaySession = {
    disconnect: () => Promise<void>;
};
export type DiscordGatewayClientConfig = {
    botToken: string;
    intents?: number;
    fetchImpl?: typeof fetch;
    connector?: (input: DiscordGatewayConnectorInput) => Promise<DiscordGatewaySession>;
};
export declare class DiscordGatewayClient {
    private readonly botToken;
    private readonly intents;
    private readonly fetchImpl;
    private readonly connector;
    private readonly handlers;
    private readonly disconnectedHandlers;
    private session;
    private manualDisconnect;
    constructor(config: DiscordGatewayClientConfig);
    onMessageCreate(handler: (event: DiscordGatewayMessageCreateEvent) => Promise<void>): () => void;
    onDisconnected(handler: (reason: string) => void): () => void;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
export {};
//# sourceMappingURL=discord-gateway-client.d.ts.map