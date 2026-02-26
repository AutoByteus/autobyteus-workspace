import makeWASocket, {
  Browsers,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type BaileysEventMap,
  type ConnectionState,
  type WASocket,
  type WAMessage,
} from "@whiskeysockets/baileys";

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
  close(options?: { logout?: boolean }): Promise<void>;
  sendText(toJid: string, text: string): Promise<{ providerMessageId: string | null; deliveredAt: string }>;
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

export class BaileysSessionClient implements WhatsAppSessionClient {
  private readonly createSocket: (config: Parameters<typeof makeWASocket>[0]) => WASocket;
  private readonly createAuthState: typeof useMultiFileAuthState;
  private readonly fetchVersion: typeof fetchLatestBaileysVersion;
  private readonly downloadMediaMessage: typeof downloadMediaMessage;
  private readonly nowIso: () => string;

  private socket: WASocket | null = null;
  private cleanupListeners: Array<() => void> = [];
  private readonly connectionHandlers = new Set<(event: PersonalConnectionUpdateEvent) => void>();
  private readonly inboundHandlers = new Set<
    (event: PersonalInboundMessageEvent) => Promise<void> | void
  >();

  constructor(deps: BaileysSessionClientDeps = {}) {
    this.createSocket = deps.createSocket ?? makeWASocket;
    this.createAuthState = deps.createAuthState ?? useMultiFileAuthState;
    this.fetchVersion = deps.fetchVersion ?? fetchLatestBaileysVersion;
    this.downloadMediaMessage = deps.downloadMediaMessage ?? downloadMediaMessage;
    this.nowIso = deps.nowIso ?? (() => new Date().toISOString());
  }

  async open(input: OpenPersonalSessionInput): Promise<void> {
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

    const connectionListener = (update: Partial<ConnectionState>) => {
      this.emitConnection({
        connection: update.connection,
        qr: typeof update.qr === "string" ? update.qr : undefined,
        disconnectCode: extractDisconnectCode(update),
      });
    };

    const messageListener = async (event: BaileysEventMap["messages.upsert"]) => {
      for (const message of event.messages) {
        const mapped = await mapInboundMessage(message, {
          downloadMediaMessage: this.downloadMediaMessage,
          reuploadRequest:
            typeof socket.updateMediaMessage === "function"
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

  async close(options?: { logout?: boolean }): Promise<void> {
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
      } catch {
        // Intentional: logout may fail when socket is already disconnected.
      }
    }

    socket.end(undefined);
  }

  async sendText(
    toJid: string,
    text: string,
  ): Promise<{ providerMessageId: string | null; deliveredAt: string }> {
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

  onConnectionUpdate(handler: (event: PersonalConnectionUpdateEvent) => void): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  onInboundMessage(
    handler: (event: PersonalInboundMessageEvent) => Promise<void> | void,
  ): () => void {
    this.inboundHandlers.add(handler);
    return () => {
      this.inboundHandlers.delete(handler);
    };
  }

  private emitConnection(event: PersonalConnectionUpdateEvent): void {
    for (const handler of this.connectionHandlers) {
      handler(event);
    }
  }
}

type MapInboundMessageOptions = {
  downloadMediaMessage: typeof downloadMediaMessage;
  reuploadRequest?: (message: WAMessage) => Promise<unknown>;
};

type AttachmentKind = PersonalInboundAttachment["kind"];

const mapInboundMessage = async (
  message: WAMessage,
  options: MapInboundMessageOptions,
): Promise<PersonalInboundMessageEvent | null> => {
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
    pushName: asTrimmedString((message as unknown as Record<string, unknown>).pushName),
    messageId,
    text,
    attachments,
    receivedAt: toIsoTimestamp(message.messageTimestamp),
    fromMe: Boolean(key?.fromMe),
  };
};

const unwrapMessageNode = (value: unknown): Record<string, unknown> | null => {
  let node = asRecord(value);
  for (let depth = 0; depth < 6 && node; depth += 1) {
    const ephemeral = readNestedMessage(node, "ephemeralMessage");
    const viewOnce = readNestedMessage(node, "viewOnceMessage");
    const viewOnceV2 = readNestedMessage(node, "viewOnceMessageV2");
    const viewOnceV2Extension = readNestedMessage(node, "viewOnceMessageV2Extension");
    const documentWithCaption = readNestedMessage(node, "documentWithCaptionMessage");

    const nested =
      ephemeral ?? viewOnce ?? viewOnceV2 ?? viewOnceV2Extension ?? documentWithCaption;
    if (!nested) {
      break;
    }
    node = nested;
  }
  return node;
};

const extractMessageText = (node: Record<string, unknown> | null): string | null => {
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

const extractMessageAttachments = async (
  message: WAMessage,
  node: Record<string, unknown> | null,
  messageId: string,
  options: MapInboundMessageOptions,
): Promise<PersonalInboundAttachment[]> => {
  if (!node) {
    return [];
  }

  const attachments: PersonalInboundAttachment[] = [];
  const mediaItems: Array<{ key: string; kind: AttachmentKind; downloadType: "audio" | "image" | "video" | "document" }> = [
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
      const data = await options.downloadMediaMessage(
        message,
        "buffer",
        {},
        options.reuploadRequest
          ? ({ reuploadRequest: options.reuploadRequest } as any)
          : undefined,
      );

      if (!data || data.length === 0) {
        continue;
      }

      const mimeType = asPlainMimeType(asTrimmedString(media.mimetype)) ?? defaultMimeTypeForKind(item.kind);
      const extension = extensionFromMimeType(mimeType, item.kind);
      const fileName =
        asTrimmedString(media.fileName) ?? `${messageId}-${item.key}.${extension}`;

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
    } catch (error) {
      console.warn(
        `Failed to download ${item.key} for message ${messageId}: ${String(error)}`,
      );
    }
  }

  return attachments;
};

const readNestedMessage = (
  node: Record<string, unknown>,
  wrapperKey: string,
): Record<string, unknown> | null => {
  const wrapper = asRecord(node[wrapperKey]);
  return asRecord(wrapper?.message);
};

const toIsoTimestamp = (value: unknown): string => {
  const seconds = asFiniteNumber(value);
  if (seconds === null || seconds <= 0) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
};

const asFiniteNumber = (value: unknown): number | null => {
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
    const asNumber = value as { toNumber?: () => number; toString?: () => string };
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

const extractDisconnectCode = (update: Partial<ConnectionState>): number | undefined => {
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

const asPlainMimeType = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const [mimeType] = value.split(";");
  const normalized = mimeType.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const defaultMimeTypeForKind = (kind: AttachmentKind): string => {
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

const extensionFromMimeType = (mimeType: string, kind: AttachmentKind): string => {
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

const extractAudioMetadata = (media: Record<string, unknown>): Record<string, unknown> => ({
  ...(typeof media.ptt === "boolean" ? { ptt: media.ptt } : {}),
  ...(asFiniteNumber(media.seconds) !== null ? { durationSeconds: asFiniteNumber(media.seconds) } : {}),
});

const extractVideoMetadata = (media: Record<string, unknown>): Record<string, unknown> => ({
  ...(asFiniteNumber(media.seconds) !== null ? { durationSeconds: asFiniteNumber(media.seconds) } : {}),
});

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
