type DiscordGatewayDispatchPayload = {
  op: number;
  s: number | null;
  t: string | null;
  d: unknown;
};

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

const DEFAULT_DISCORD_GATEWAY_INTENTS = 37377;

export class DiscordGatewayClient {
  private readonly botToken: string;
  private readonly intents: number;
  private readonly fetchImpl: typeof fetch;
  private readonly connector: (input: DiscordGatewayConnectorInput) => Promise<DiscordGatewaySession>;
  private readonly handlers = new Set<(event: DiscordGatewayMessageCreateEvent) => Promise<void>>();
  private readonly disconnectedHandlers = new Set<(reason: string) => void>();
  private session: DiscordGatewaySession | null = null;
  private manualDisconnect = false;

  constructor(config: DiscordGatewayClientConfig) {
    this.botToken = normalizeRequiredString(config.botToken, "botToken");
    this.intents = config.intents ?? DEFAULT_DISCORD_GATEWAY_INTENTS;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.connector = config.connector ?? connectDiscordGateway;
  }

  onMessageCreate(
    handler: (event: DiscordGatewayMessageCreateEvent) => Promise<void>,
  ): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onDisconnected(handler: (reason: string) => void): () => void {
    this.disconnectedHandlers.add(handler);
    return () => {
      this.disconnectedHandlers.delete(handler);
    };
  }

  async connect(): Promise<void> {
    if (this.session) {
      return;
    }
    this.manualDisconnect = false;
    this.session = await this.connector({
      botToken: this.botToken,
      intents: this.intents,
      fetchImpl: this.fetchImpl,
      dispatchMessageCreate: async (event) => {
        for (const handler of this.handlers) {
          await handler(event);
        }
      },
      onSocketClosed: (reason) => {
        if (this.manualDisconnect) {
          return;
        }
        this.session = null;
        for (const handler of this.disconnectedHandlers) {
          handler(reason);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    if (!this.session) {
      return;
    }
    this.manualDisconnect = true;
    const session = this.session;
    this.session = null;
    await session.disconnect();
  }
}

class DiscordGatewayHandshakeError extends Error {
  readonly retryable = true;

  constructor(message: string) {
    super(message);
    this.name = "DiscordGatewayHandshakeError";
  }
}

async function connectDiscordGateway(
  input: DiscordGatewayConnectorInput,
): Promise<DiscordGatewaySession> {
  const gatewayUrl = await fetchGatewayUrl(input.fetchImpl, input.botToken);
  const socket = await openGatewaySocket(gatewayUrl);

  let sequence: number | null = null;
  let botUserId: string | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let disconnectRequested = false;

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const sendPayload = (payload: DiscordGatewayDispatchPayload) => {
    socket.send(JSON.stringify(payload));
  };

  const onMessage = async (event: MessageEvent): Promise<void> => {
    if (typeof event.data !== "string") {
      return;
    }
    let payload: DiscordGatewayDispatchPayload;
    try {
      payload = JSON.parse(event.data) as DiscordGatewayDispatchPayload;
    } catch {
      return;
    }

    if (typeof payload.s === "number") {
      sequence = payload.s;
    }

    if (payload.op === 10) {
      const heartbeatIntervalMs = readHeartbeatInterval(payload.d);
      stopHeartbeat();
      heartbeatTimer = setInterval(() => {
        sendPayload({
          op: 1,
          d: sequence,
          s: null,
          t: null,
        });
      }, heartbeatIntervalMs);

      sendPayload({
        op: 2,
        s: null,
        t: null,
        d: {
          token: input.botToken,
          intents: input.intents,
          properties: {
            os: process.platform,
            browser: "autobyteus-message-gateway",
            device: "autobyteus-message-gateway",
          },
        },
      });
      return;
    }

    if (payload.op !== 0) {
      return;
    }

    if (payload.t === "READY") {
      botUserId = extractReadyBotUserId(payload.d);
      return;
    }

    if (payload.t !== "MESSAGE_CREATE") {
      return;
    }

    const messageCreateEvent = normalizeMessageCreatePayload(payload.d, botUserId);
    if (!messageCreateEvent || messageCreateEvent.authorIsBot) {
      return;
    }
    await input.dispatchMessageCreate(messageCreateEvent);
  };

  const messageListener = (event: MessageEvent) => {
    void onMessage(event);
  };
  const closeListener = (event: CloseEvent) => {
    stopHeartbeat();
    if (!disconnectRequested) {
      const reason = event.reason?.trim() || `CLOSE_${event.code}`;
      input.onSocketClosed?.(reason);
    }
  };

  socket.addEventListener("message", messageListener);
  socket.addEventListener("close", closeListener);

  return {
    disconnect: async () => {
      if (disconnectRequested) {
        return;
      }
      disconnectRequested = true;
      stopHeartbeat();
      socket.removeEventListener("message", messageListener);
      socket.removeEventListener("close", closeListener);

      if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
        return;
      }

      await new Promise<void>((resolve) => {
        const done = () => {
          socket.removeEventListener("close", doneListener);
          resolve();
        };
        const doneListener = () => done();
        socket.addEventListener("close", doneListener, { once: true });
        socket.close(1000, "client disconnect");
      });
    },
  };
}

async function fetchGatewayUrl(fetchImpl: typeof fetch, botToken: string): Promise<string> {
  const response = await fetchImpl("https://discord.com/api/v10/gateway/bot", {
    method: "GET",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  if (!response.ok) {
    throw new DiscordGatewayHandshakeError(
      `Discord gateway discovery failed with status ${response.status}.`,
    );
  }

  const body = (await response.json()) as { url?: unknown };
  if (typeof body.url !== "string" || body.url.trim().length === 0) {
    throw new DiscordGatewayHandshakeError("Discord gateway discovery returned invalid url.");
  }
  return `${body.url}?v=10&encoding=json`;
}

async function openGatewaySocket(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("error", onError);
      socket.removeEventListener("close", onClose);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new DiscordGatewayHandshakeError("Discord gateway websocket connection failed."));
    };

    const onClose = () => {
      cleanup();
      reject(new DiscordGatewayHandshakeError("Discord gateway websocket closed before opening."));
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("error", onError);
    socket.addEventListener("close", onClose);
  });
  return socket;
}

function normalizeMessageCreatePayload(
  value: unknown,
  botUserId: string | null,
): DiscordGatewayMessageCreateEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = normalizeRequiredString(value.id, "id");
  const channelId = normalizeRequiredString(value.channel_id, "channel_id");
  const author = isRecord(value.author) ? value.author : null;
  if (!author) {
    return null;
  }
  const authorId = normalizeRequiredString(author.id, "author.id");
  const authorDisplayName =
    normalizeOptionalString(author.global_name) ?? normalizeOptionalString(author.username);
  const authorIsBot = author.bot === true;
  const guildId = normalizeOptionalString(value.guild_id);
  const threadId = normalizeOptionalString(value.thread_id);
  const content = typeof value.content === "string" ? value.content : "";
  const timestamp = parseIsoTimestamp(value.timestamp);
  const mentions = Array.isArray(value.mentions)
    ? value.mentions
        .map((item) => (isRecord(item) ? normalizeOptionalString(item.id) : null))
        .filter((id): id is string => id !== null)
    : [];
  const mentionEveryone = value.mention_everyone === true;
  const mentionsAgent =
    mentionEveryone || (botUserId !== null ? mentions.includes(botUserId) : false);
  const attachments = normalizeAttachments(value.attachments);

  return {
    id,
    authorId,
    authorDisplayName,
    authorIsBot,
    channelId,
    guildId,
    threadId,
    content,
    timestamp,
    mentionsAgent,
    mentioned: mentionsAgent,
    attachments,
    raw: value,
  };
}

function normalizeAttachments(value: unknown): DiscordGatewayAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const url = normalizeOptionalString(item.url);
      if (!url) {
        return null;
      }
      return {
        id: normalizeOptionalString(item.id),
        url,
        contentType: normalizeOptionalString(item.content_type),
        fileName: normalizeOptionalString(item.filename),
        sizeBytes:
          typeof item.size === "number" && Number.isFinite(item.size) ? item.size : null,
      };
    })
    .filter((item): item is DiscordGatewayAttachment => item !== null);
}

function readHeartbeatInterval(value: unknown): number {
  if (!isRecord(value) || typeof value.heartbeat_interval !== "number") {
    throw new DiscordGatewayHandshakeError("Discord gateway HELLO payload is missing heartbeat interval.");
  }
  const heartbeatInterval = value.heartbeat_interval;
  if (!Number.isFinite(heartbeatInterval) || heartbeatInterval <= 0) {
    throw new DiscordGatewayHandshakeError("Discord gateway heartbeat interval is invalid.");
  }
  return heartbeatInterval;
}

function extractReadyBotUserId(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.user)) {
    return null;
  }
  return normalizeOptionalString(value.user.id);
}

function parseIsoTimestamp(value: unknown): string {
  const normalized = normalizeRequiredString(value, "timestamp");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Discord gateway message timestamp is invalid.");
  }
  return parsed.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
