export type TelegramUser = {
    id: string;
    username: string | null;
    isBot: boolean;
};
export type TelegramUpdateEntity = {
    type: string;
    offset: number | null;
    length: number | null;
    userId: string | null;
};
export type TelegramUpdateMessage = {
    messageId: string;
    chatId: string;
    chatType: string;
    chatTitle: string | null;
    senderId: string | null;
    senderIsBot: boolean;
    senderDisplayName: string | null;
    threadId: string | null;
    dateIso: string;
    text: string;
    entities: TelegramUpdateEntity[];
    replyToSenderId: string | null;
    replyToSenderIsBot: boolean;
    raw: Record<string, unknown>;
};
export type TelegramUpdate = {
    updateId: string;
    message: TelegramUpdateMessage;
    raw: Record<string, unknown>;
};
export type TelegramSendMessageInput = {
    chatId: string;
    threadId?: string | null;
    text: string;
};
export type TelegramSendMessageResult = {
    providerMessageId: string | null;
    deliveredAt: string;
    metadata: Record<string, unknown>;
};
export type TelegramBotClientConfig = {
    botToken: string;
    pollTimeoutSeconds?: number;
    fetchImpl?: typeof fetch;
};
export declare class TelegramBotClientError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    readonly status: number | null;
    constructor(input: {
        code: string;
        detail: string;
        retryable: boolean;
        status?: number | null;
    });
}
export declare class TelegramBotClient {
    private readonly botToken;
    private readonly pollTimeoutSeconds;
    private readonly fetchImpl;
    private readonly updateHandlers;
    private readonly disconnectedHandlers;
    private running;
    private stoppedManually;
    private pollingAbortController;
    private pollingPromise;
    private nextOffset;
    private meCache;
    constructor(config: TelegramBotClientConfig);
    onUpdate(handler: (update: TelegramUpdate) => Promise<void>): () => void;
    onDisconnected(handler: (reason: string) => void): () => void;
    getMe(): Promise<TelegramUser>;
    startPolling(): Promise<void>;
    stopPolling(): Promise<void>;
    sendMessage(input: TelegramSendMessageInput): Promise<TelegramSendMessageResult>;
    private pollLoop;
    private callApi;
}
//# sourceMappingURL=telegram-bot-client.d.ts.map