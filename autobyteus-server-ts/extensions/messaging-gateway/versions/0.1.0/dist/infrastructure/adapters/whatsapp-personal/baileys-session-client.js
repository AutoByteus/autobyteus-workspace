import makeWASocket, { Browsers, downloadMediaMessage, fetchLatestBaileysVersion, useMultiFileAuthState, } from "@whiskeysockets/baileys";
export class BaileysSessionClient {
    createSocket;
    createAuthState;
    fetchVersion;
    downloadMediaMessage;
    nowIso;
    socket = null;
    cleanupListeners = [];
    connectionHandlers = new Set();
    inboundHandlers = new Set();
    constructor(deps = {}) {
        this.createSocket = deps.createSocket ?? makeWASocket;
        this.createAuthState = deps.createAuthState ?? useMultiFileAuthState;
        this.fetchVersion = deps.fetchVersion ?? fetchLatestBaileysVersion;
        this.downloadMediaMessage = deps.downloadMediaMessage ?? downloadMediaMessage;
        this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
    }
    async open(input) {
        await this.close();
        const auth = await this.createAuthState(input.authPath);
        const versionResult = await this.fetchVersion();
        const socket = this.createSocket({
            auth: auth.state,
            version: versionResult.version,
            printQRInTerminal: false,
            browser: Browsers.macOS("AutoByteus Gateway"),
            markOnlineOnConnect: false,
            syncFullHistory: false,
        });
        const credsListener = () => {
            void auth.saveCreds().catch(() => undefined);
        };
        const connectionListener = (update) => {
            this.emitConnection({
                connection: update.connection,
                qr: typeof update.qr === "string" ? update.qr : undefined,
                disconnectCode: extractDisconnectCode(update),
            });
        };
        const messageListener = async (event) => {
            for (const message of event.messages) {
                const mapped = await mapInboundMessage(message, {
                    downloadMediaMessage: this.downloadMediaMessage,
                    reuploadRequest: typeof socket.updateMediaMessage === "function"
                        ? socket.updateMediaMessage.bind(socket)
                        : undefined,
                });
                if (!mapped || mapped.fromMe) {
                    continue;
                }
                for (const handler of this.inboundHandlers) {
                    void Promise.resolve(handler(mapped)).catch(() => undefined);
                }
            }
        };
        socket.ev.on("creds.update", credsListener);
        socket.ev.on("connection.update", connectionListener);
        socket.ev.on("messages.upsert", messageListener);
        this.cleanupListeners = [
            () => socket.ev.off("creds.update", credsListener),
            () => socket.ev.off("connection.update", connectionListener),
            () => socket.ev.off("messages.upsert", messageListener),
        ];
        this.socket = socket;
    }
    async close(options) {
        const socket = this.socket;
        if (!socket) {
            return;
        }
        for (const cleanup of this.cleanupListeners) {
            cleanup();
        }
        this.cleanupListeners = [];
        this.socket = null;
        if (options?.logout) {
            try {
                await socket.logout();
            }
            catch {
                // Intentional: logout may fail when socket is already disconnected.
            }
        }
        socket.end(undefined);
    }
    async sendText(toJid, text) {
        const socket = this.socket;
        if (!socket) {
            throw new Error("WhatsApp session socket is not open.");
        }
        if (typeof toJid !== "string" || toJid.trim().length === 0) {
            throw new Error("toJid must be a non-empty string.");
        }
        if (typeof text !== "string" || text.trim().length === 0) {
            throw new Error("text must be a non-empty string.");
        }
        const result = await socket.sendMessage(toJid.trim(), { text: text.trim() });
        return {
            providerMessageId: result?.key?.id ?? null,
            deliveredAt: this.nowIso(),
        };
    }
    onConnectionUpdate(handler) {
        this.connectionHandlers.add(handler);
        return () => {
            this.connectionHandlers.delete(handler);
        };
    }
    onInboundMessage(handler) {
        this.inboundHandlers.add(handler);
        return () => {
            this.inboundHandlers.delete(handler);
        };
    }
    emitConnection(event) {
        for (const handler of this.connectionHandlers) {
            handler(event);
        }
    }
}
const mapInboundMessage = async (message, options) => {
    const key = message.key;
    const chatJid = typeof key?.remoteJid === "string" ? key.remoteJid : null;
    const messageId = typeof key?.id === "string" ? key.id : null;
    const messageNode = unwrapMessageNode(message.message);
    const text = extractMessageText(messageNode);
    if (!chatJid || !messageId) {
        return null;
    }
    const participantJid = typeof key?.participant === "string" ? key.participant : null;
    const senderJid = participantJid ?? chatJid;
    const attachments = await extractMessageAttachments(message, messageNode, messageId, options);
    return {
        chatJid,
        senderJid,
        participantJid,
        pushName: asTrimmedString(message.pushName),
        messageId,
        text,
        attachments,
        receivedAt: toIsoTimestamp(message.messageTimestamp),
        fromMe: Boolean(key?.fromMe),
    };
};
const unwrapMessageNode = (value) => {
    let node = asRecord(value);
    for (let depth = 0; depth < 6 && node; depth += 1) {
        const ephemeral = readNestedMessage(node, "ephemeralMessage");
        const viewOnce = readNestedMessage(node, "viewOnceMessage");
        const viewOnceV2 = readNestedMessage(node, "viewOnceMessageV2");
        const viewOnceV2Extension = readNestedMessage(node, "viewOnceMessageV2Extension");
        const documentWithCaption = readNestedMessage(node, "documentWithCaptionMessage");
        const nested = ephemeral ?? viewOnce ?? viewOnceV2 ?? viewOnceV2Extension ?? documentWithCaption;
        if (!nested) {
            break;
        }
        node = nested;
    }
    return node;
};
const extractMessageText = (node) => {
    if (node === null) {
        return null;
    }
    const candidates = [
        asTrimmedString(node.conversation),
        asTrimmedString(asRecord(node.extendedTextMessage)?.text),
        asTrimmedString(asRecord(node.imageMessage)?.caption),
        asTrimmedString(asRecord(node.videoMessage)?.caption),
        asTrimmedString(asRecord(node.documentMessage)?.caption),
    ];
    return candidates.find((candidate) => candidate !== null) ?? null;
};
const extractMessageAttachments = async (message, node, messageId, options) => {
    if (!node) {
        return [];
    }
    const attachments = [];
    const mediaItems = [
        { key: "audioMessage", kind: "audio", downloadType: "audio" },
        { key: "imageMessage", kind: "image", downloadType: "image" },
        { key: "videoMessage", kind: "video", downloadType: "video" },
        { key: "documentMessage", kind: "document", downloadType: "document" },
    ];
    for (const item of mediaItems) {
        const media = asRecord(node[item.key]);
        if (!media) {
            continue;
        }
        try {
            const data = await options.downloadMediaMessage(message, "buffer", {}, options.reuploadRequest
                ? { reuploadRequest: options.reuploadRequest }
                : undefined);
            if (!data || data.length === 0) {
                continue;
            }
            const mimeType = asPlainMimeType(asTrimmedString(media.mimetype)) ?? defaultMimeTypeForKind(item.kind);
            const extension = extensionFromMimeType(mimeType, item.kind);
            const fileName = asTrimmedString(media.fileName) ?? `${messageId}-${item.key}.${extension}`;
            attachments.push({
                kind: item.kind,
                url: `data:${mimeType};base64,${data.toString("base64")}`,
                mimeType,
                fileName,
                sizeBytes: data.length,
                metadata: {
                    whatsappMessageType: item.key,
                    whatsappMediaType: item.downloadType,
                    ...(item.kind === "audio" ? extractAudioMetadata(media) : {}),
                    ...(item.kind === "video" ? extractVideoMetadata(media) : {}),
                },
            });
        }
        catch (error) {
            console.warn(`Failed to download ${item.key} for message ${messageId}: ${String(error)}`);
        }
    }
    return attachments;
};
const readNestedMessage = (node, wrapperKey) => {
    const wrapper = asRecord(node[wrapperKey]);
    return asRecord(wrapper?.message);
};
const toIsoTimestamp = (value) => {
    const seconds = asFiniteNumber(value);
    if (seconds === null || seconds <= 0) {
        return new Date().toISOString();
    }
    return new Date(seconds * 1000).toISOString();
};
const asFiniteNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "bigint") {
        return Number(value);
    }
    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value === "object" && value !== null) {
        const asNumber = value;
        if (typeof asNumber.toNumber === "function") {
            const parsed = asNumber.toNumber();
            return Number.isFinite(parsed) ? parsed : null;
        }
        if (typeof asNumber.toString === "function") {
            const parsed = Number(asNumber.toString());
            return Number.isFinite(parsed) ? parsed : null;
        }
    }
    return null;
};
const extractDisconnectCode = (update) => {
    const error = asRecord(asRecord(update.lastDisconnect)?.error);
    const outputCode = asRecord(error?.output)?.statusCode;
    if (typeof outputCode === "number" && Number.isFinite(outputCode)) {
        return outputCode;
    }
    const directCode = error?.statusCode;
    if (typeof directCode === "number" && Number.isFinite(directCode)) {
        return directCode;
    }
    return undefined;
};
const asPlainMimeType = (value) => {
    if (!value) {
        return null;
    }
    const [mimeType] = value.split(";");
    const normalized = mimeType.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
};
const defaultMimeTypeForKind = (kind) => {
    switch (kind) {
        case "audio":
            return "audio/ogg";
        case "image":
            return "image/jpeg";
        case "video":
            return "video/mp4";
        default:
            return "application/octet-stream";
    }
};
const extensionFromMimeType = (mimeType, kind) => {
    const normalized = mimeType.toLowerCase();
    if (normalized === "audio/mpeg" || normalized === "audio/mp3") {
        return "mp3";
    }
    if (normalized === "audio/wav" || normalized === "audio/x-wav") {
        return "wav";
    }
    if (normalized === "audio/ogg") {
        return "ogg";
    }
    if (normalized === "image/png") {
        return "png";
    }
    if (normalized === "image/webp") {
        return "webp";
    }
    if (normalized === "image/gif") {
        return "gif";
    }
    if (normalized === "video/webm") {
        return "webm";
    }
    if (normalized === "video/quicktime") {
        return "mov";
    }
    if (normalized === "application/pdf") {
        return "pdf";
    }
    if (normalized === "image/jpeg") {
        return "jpg";
    }
    if (normalized === "video/mp4") {
        return "mp4";
    }
    return kind;
};
const extractAudioMetadata = (media) => ({
    ...(typeof media.ptt === "boolean" ? { ptt: media.ptt } : {}),
    ...(asFiniteNumber(media.seconds) !== null ? { durationSeconds: asFiniteNumber(media.seconds) } : {}),
});
const extractVideoMetadata = (media) => ({
    ...(asFiniteNumber(media.seconds) !== null ? { durationSeconds: asFiniteNumber(media.seconds) } : {}),
});
const asTrimmedString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};
const asRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : null;
//# sourceMappingURL=baileys-session-client.js.map