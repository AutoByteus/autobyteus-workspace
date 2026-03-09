import makeWASocket, { downloadMediaMessage, fetchLatestBaileysVersion, useMultiFileAuthState, type WASocket } from "@whiskeysockets/baileys";
export type PersonalConnectionUpdateEvent = {
    connection?: "open" | "connecting" | "close";
    qr?: string;
    disconnectCode?: number;
};
export type PersonalInboundAttachment = {
    kind: "audio" | "image" | "video" | "document";
    url: string;
    mimeType: string | null;
    fileName: string | null;
    sizeBytes: number | null;
    metadata: Record<string, unknown>;
};
export type PersonalInboundMessageEvent = {
    chatJid: string;
    senderJid: string;
    participantJid: string | null;
    pushName: string | null;
    messageId: string;
    text: string | null;
    attachments: PersonalInboundAttachment[];
    receivedAt: string;
    fromMe: boolean;
};
export type OpenPersonalSessionInput = {
    authPath: string;
};
export interface WhatsAppSessionClient {
    open(input: OpenPersonalSessionInput): Promise<void>;
    close(options?: {
        logout?: boolean;
    }): Promise<void>;
    sendText(toJid: string, text: string): Promise<{
        providerMessageId: string | null;
        deliveredAt: string;
    }>;
    onConnectionUpdate(handler: (event: PersonalConnectionUpdateEvent) => void): () => void;
    onInboundMessage(handler: (event: PersonalInboundMessageEvent) => Promise<void> | void): () => void;
}
type BaileysSessionClientDeps = {
    createSocket?: (config: Parameters<typeof makeWASocket>[0]) => WASocket;
    createAuthState?: typeof useMultiFileAuthState;
    fetchVersion?: typeof fetchLatestBaileysVersion;
    downloadMediaMessage?: typeof downloadMediaMessage;
    nowIso?: () => string;
};
export declare class BaileysSessionClient implements WhatsAppSessionClient {
    private readonly createSocket;
    private readonly createAuthState;
    private readonly fetchVersion;
    private readonly downloadMediaMessage;
    private readonly nowIso;
    private socket;
    private cleanupListeners;
    private readonly connectionHandlers;
    private readonly inboundHandlers;
    constructor(deps?: BaileysSessionClientDeps);
    open(input: OpenPersonalSessionInput): Promise<void>;
    close(options?: {
        logout?: boolean;
    }): Promise<void>;
    sendText(toJid: string, text: string): Promise<{
        providerMessageId: string | null;
        deliveredAt: string;
    }>;
    onConnectionUpdate(handler: (event: PersonalConnectionUpdateEvent) => void): () => void;
    onInboundMessage(handler: (event: PersonalInboundMessageEvent) => Promise<void> | void): () => void;
    private emitConnection;
}
export {};
//# sourceMappingURL=baileys-session-client.d.ts.map