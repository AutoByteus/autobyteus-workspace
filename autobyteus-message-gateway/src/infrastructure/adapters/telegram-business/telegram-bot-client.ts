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

export class TelegramBotClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(input: { code: string; detail: string; retryable: boolean; status?: number | null }) {
    super(input.detail);
    this.name = "TelegramBotClientError";
    this.code = input.code;
    this.retryable = input.retryable;
    this.status = input.status ?? null;
  }
}

export class TelegramBotClient {
  private readonly botToken: string;
  private readonly pollTimeoutSeconds: number;
  private readonly fetchImpl: typeof fetch;
  private readonly updateHandlers = new Set<(update: TelegramUpdate) => Promise<void>>();
  private readonly disconnectedHandlers = new Set<(reason: string) => void>();
  private running = false;
  private stoppedManually = false;
  private pollingAbortController: AbortController | null = null;
  private pollingPromise: Promise<void> | null = null;
  private nextOffset: number | null = null;
  private meCache: TelegramUser | null = null;

  constructor(config: TelegramBotClientConfig) {
    this.botToken = normalizeRequiredString(config.botToken, "botToken");
    this.pollTimeoutSeconds = normalizePositiveInteger(config.pollTimeoutSeconds ?? 25, "pollTimeoutSeconds");
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  onUpdate(handler: (update: TelegramUpdate) => Promise<void>): () => void {
    this.updateHandlers.add(handler);
    return () => {
      this.updateHandlers.delete(handler);
    };
  }

  onDisconnected(handler: (reason: string) => void): () => void {
    this.disconnectedHandlers.add(handler);
    return () => {
      this.disconnectedHandlers.delete(handler);
    };
  }

  async getMe(): Promise<TelegramUser> {
    if (this.meCache) {
      return this.meCache;
    }
    const response = await this.callApi("getMe", {});
    const me = normalizeTelegramUser(response);
    this.meCache = me;
    return me;
  }

  async startPolling(): Promise<void> {
    if (this.running) {
      return;
    }
    await this.getMe();

    this.stoppedManually = false;
    this.running = true;
    this.pollingAbortController = new AbortController();
    this.pollingPromise = this.pollLoop(this.pollingAbortController.signal);
  }

  async stopPolling(): Promise<void> {
    this.stoppedManually = true;
    this.running = false;
    this.pollingAbortController?.abort();
    this.pollingAbortController = null;

    try {
      await this.pollingPromise;
    } finally {
      this.pollingPromise = null;
    }
  }

  async sendMessage(input: TelegramSendMessageInput): Promise<TelegramSendMessageResult> {
    const chatId = normalizeRequiredString(input.chatId, "chatId");
    const text = normalizeRequiredString(input.text, "text");

    const requestPayload: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };
    const threadId = normalizeOptionalThreadId(input.threadId);
    if (threadId !== null) {
      requestPayload.message_thread_id = threadId;
    }

    const result = await this.callApi("sendMessage", requestPayload);
    const messageId = extractMessageId(result);
    return {
      providerMessageId: messageId,
      deliveredAt: new Date().toISOString(),
      metadata: {},
    };
  }

  private async pollLoop(signal: AbortSignal): Promise<void> {
    while (this.running) {
      try {
        const payload: Record<string, unknown> = {
          timeout: this.pollTimeoutSeconds,
        };
        if (this.nextOffset !== null) {
          payload.offset = this.nextOffset;
        }
        const result = await this.callApi("getUpdates", payload, signal);
        const updates = normalizeUpdates(result);
        for (const update of updates) {
          const numericUpdateId = Number(update.updateId);
          if (Number.isFinite(numericUpdateId)) {
            this.nextOffset = Math.trunc(numericUpdateId) + 1;
          }
          for (const handler of this.updateHandlers) {
            await handler(update);
          }
        }
      } catch (error) {
        if (!this.running || this.stoppedManually || isAbortError(error)) {
          return;
        }
        this.running = false;
        const reason = toDisconnectReason(error);
        for (const handler of this.disconnectedHandlers) {
          handler(reason);
        }
        return;
      }
    }
  }

  private async callApi(
    method: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const response = await this.fetchImpl(buildTelegramBotApiUrl(this.botToken, method), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    const body = (await response.json().catch(() => null)) as
      | { ok?: unknown; result?: unknown; error_code?: unknown; description?: unknown; parameters?: unknown }
      | null;

    if (!response.ok) {
      throw new TelegramBotClientError({
        code: toTelegramErrorCode(body?.error_code, response.status),
        detail:
          typeof body?.description === "string" && body.description.trim().length > 0
            ? body.description
            : `Telegram API ${method} failed with status ${response.status}.`,
        retryable: isRetryableStatus(response.status),
        status: response.status,
      });
    }

    if (!body || body.ok !== true) {
      const code = toTelegramErrorCode(body?.error_code, response.status);
      const detail =
        typeof body?.description === "string" && body.description.trim().length > 0
          ? body.description
          : `Telegram API ${method} returned a non-ok response.`;
      const retryAfter = extractRetryAfterSeconds(body?.parameters);
      throw new TelegramBotClientError({
        code,
        detail,
        retryable: code === "RATE_LIMITED" || isRetryableStatus(response.status) || retryAfter !== null,
        status: response.status,
      });
    }

    return body.result;
  }
}

const normalizeUpdates = (value: unknown): TelegramUpdate[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const updates: TelegramUpdate[] = [];
  for (const raw of value) {
    const normalized = normalizeSingleUpdate(raw);
    if (normalized) {
      updates.push(normalized);
    }
  }
  return updates;
};

const normalizeSingleUpdate = (value: unknown): TelegramUpdate | null => {
  if (!isRecord(value)) {
    return null;
  }
  const updateId = normalizeIdentifier(value.update_id);
  if (updateId === null) {
    return null;
  }

  const messageRecord = selectMessageRecord(value);
  if (!messageRecord) {
    return null;
  }

  const message = normalizeMessageRecord(messageRecord);
  if (!message) {
    return null;
  }

  return {
    updateId,
    message,
    raw: value,
  };
};

const selectMessageRecord = (update: Record<string, unknown>): Record<string, unknown> | null => {
  const keys = ["message", "edited_message", "channel_post", "edited_channel_post"];
  for (const key of keys) {
    const candidate = update[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }
  return null;
};

const normalizeMessageRecord = (value: Record<string, unknown>): TelegramUpdateMessage | null => {
  const messageId = normalizeIdentifier(value.message_id);
  const chat = isRecord(value.chat) ? value.chat : null;
  const chatId = normalizeIdentifier(chat?.id);
  const chatType = normalizeRequiredString(chat?.type, "chat.type");

  if (!messageId || !chatId) {
    return null;
  }

  const dateIso = normalizeTelegramDate(value.date);
  const entities = normalizeEntities(value.entities).concat(normalizeEntities(value.caption_entities));
  const from = isRecord(value.from) ? value.from : null;
  const replyTo = isRecord(value.reply_to_message) ? value.reply_to_message : null;
  const replyToFrom = replyTo && isRecord(replyTo.from) ? replyTo.from : null;

  return {
    messageId,
    chatId,
    chatType,
    chatTitle: normalizeOptionalString(chat?.title),
    senderId: normalizeIdentifier(from?.id),
    senderIsBot: from?.is_bot === true,
    senderDisplayName: composeSenderDisplayName(from),
    threadId: normalizeIdentifier(value.message_thread_id),
    dateIso,
    text: normalizeMessageText(value),
    entities,
    replyToSenderId: normalizeIdentifier(replyToFrom?.id),
    replyToSenderIsBot: replyToFrom?.is_bot === true,
    raw: value,
  };
};

const normalizeEntities = (value: unknown): TelegramUpdateEntity[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const entities: TelegramUpdateEntity[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const type = normalizeOptionalString(item.type);
    if (!type) {
      continue;
    }

    const user = isRecord(item.user) ? item.user : null;
    entities.push({
      type,
      offset: typeof item.offset === "number" ? item.offset : null,
      length: typeof item.length === "number" ? item.length : null,
      userId: normalizeIdentifier(user?.id),
    });
  }

  return entities;
};

const normalizeMessageText = (value: Record<string, unknown>): string => {
  if (typeof value.text === "string") {
    return value.text;
  }
  if (typeof value.caption === "string") {
    return value.caption;
  }
  return "";
};

const normalizeTelegramDate = (raw: unknown): string => {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Date(Math.trunc(raw) * 1000).toISOString();
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
};

const extractMessageId = (result: unknown): string | null => {
  if (!isRecord(result)) {
    return null;
  }
  return normalizeIdentifier(result.message_id);
};

const normalizeTelegramUser = (value: unknown): TelegramUser => {
  if (!isRecord(value)) {
    throw new TelegramBotClientError({
      code: "INVALID_RESPONSE",
      detail: "Telegram getMe result is invalid.",
      retryable: true,
    });
  }

  const id = normalizeIdentifier(value.id);
  if (!id) {
    throw new TelegramBotClientError({
      code: "INVALID_RESPONSE",
      detail: "Telegram getMe response is missing id.",
      retryable: true,
    });
  }

  return {
    id,
    username: normalizeOptionalString(value.username),
    isBot: value.is_bot === true,
  };
};

const toTelegramErrorCode = (errorCode: unknown, status: number): string => {
  const numericCode = typeof errorCode === "number" ? errorCode : status;
  if (numericCode === 429) {
    return "RATE_LIMITED";
  }
  if (numericCode === 401 || numericCode === 403) {
    return "UNAUTHORIZED";
  }
  if (numericCode === 400) {
    return "INVALID_REQUEST";
  }
  if (numericCode >= 500) {
    return "TELEGRAM_API_UNAVAILABLE";
  }
  return "TELEGRAM_API_ERROR";
};

const isRetryableStatus = (status: number): boolean => status === 429 || status >= 500;

const extractRetryAfterSeconds = (parameters: unknown): number | null => {
  if (!isRecord(parameters)) {
    return null;
  }
  return typeof parameters.retry_after === "number" ? parameters.retry_after : null;
};

const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "AbortError";
};

const toDisconnectReason = (error: unknown): string => {
  if (error instanceof TelegramBotClientError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Telegram polling disconnected.";
};

const composeSenderDisplayName = (value: Record<string, unknown> | null): string | null => {
  if (!value) {
    return null;
  }
  const firstName = normalizeOptionalString(value.first_name);
  const lastName = normalizeOptionalString(value.last_name);
  const username = normalizeOptionalString(value.username);
  const fullName = [firstName, lastName].filter((part) => Boolean(part)).join(" ").trim();
  if (fullName.length > 0) {
    return fullName;
  }
  return username;
};

const buildTelegramBotApiUrl = (token: string, method: string): string =>
  `https://api.telegram.org/bot${token}/${method}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizePositiveInteger = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return value;
};

const normalizeIdentifier = (value: unknown): string | null => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return null;
};

const normalizeOptionalThreadId = (value: unknown): number | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }
  const numeric = Number(normalized);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};
