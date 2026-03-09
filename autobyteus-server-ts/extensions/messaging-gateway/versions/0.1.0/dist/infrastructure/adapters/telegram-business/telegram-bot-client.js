export class TelegramBotClientError extends Error {
    code;
    retryable;
    status;
    constructor(input) {
        super(input.detail);
        this.name = "TelegramBotClientError";
        this.code = input.code;
        this.retryable = input.retryable;
        this.status = input.status ?? null;
    }
}
export class TelegramBotClient {
    botToken;
    pollTimeoutSeconds;
    fetchImpl;
    updateHandlers = new Set();
    disconnectedHandlers = new Set();
    running = false;
    stoppedManually = false;
    pollingAbortController = null;
    pollingPromise = null;
    nextOffset = null;
    meCache = null;
    constructor(config) {
        this.botToken = normalizeRequiredString(config.botToken, "botToken");
        this.pollTimeoutSeconds = normalizePositiveInteger(config.pollTimeoutSeconds ?? 25, "pollTimeoutSeconds");
        this.fetchImpl = config.fetchImpl ?? fetch;
    }
    onUpdate(handler) {
        this.updateHandlers.add(handler);
        return () => {
            this.updateHandlers.delete(handler);
        };
    }
    onDisconnected(handler) {
        this.disconnectedHandlers.add(handler);
        return () => {
            this.disconnectedHandlers.delete(handler);
        };
    }
    async getMe() {
        if (this.meCache) {
            return this.meCache;
        }
        const response = await this.callApi("getMe", {});
        const me = normalizeTelegramUser(response);
        this.meCache = me;
        return me;
    }
    async startPolling() {
        if (this.running) {
            return;
        }
        await this.getMe();
        this.stoppedManually = false;
        this.running = true;
        this.pollingAbortController = new AbortController();
        this.pollingPromise = this.pollLoop(this.pollingAbortController.signal);
    }
    async stopPolling() {
        this.stoppedManually = true;
        this.running = false;
        this.pollingAbortController?.abort();
        this.pollingAbortController = null;
        try {
            await this.pollingPromise;
        }
        finally {
            this.pollingPromise = null;
        }
    }
    async sendMessage(input) {
        const chatId = normalizeRequiredString(input.chatId, "chatId");
        const text = normalizeRequiredString(input.text, "text");
        const requestPayload = {
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
    async pollLoop(signal) {
        while (this.running) {
            try {
                const payload = {
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
            }
            catch (error) {
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
    async callApi(method, payload, signal) {
        const response = await this.fetchImpl(buildTelegramBotApiUrl(this.botToken, method), {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            signal,
        });
        const body = (await response.json().catch(() => null));
        if (!response.ok) {
            throw new TelegramBotClientError({
                code: toTelegramErrorCode(body?.error_code, response.status),
                detail: typeof body?.description === "string" && body.description.trim().length > 0
                    ? body.description
                    : `Telegram API ${method} failed with status ${response.status}.`,
                retryable: isRetryableStatus(response.status),
                status: response.status,
            });
        }
        if (!body || body.ok !== true) {
            const code = toTelegramErrorCode(body?.error_code, response.status);
            const detail = typeof body?.description === "string" && body.description.trim().length > 0
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
const normalizeUpdates = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    const updates = [];
    for (const raw of value) {
        const normalized = normalizeSingleUpdate(raw);
        if (normalized) {
            updates.push(normalized);
        }
    }
    return updates;
};
const normalizeSingleUpdate = (value) => {
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
const selectMessageRecord = (update) => {
    const keys = ["message", "edited_message", "channel_post", "edited_channel_post"];
    for (const key of keys) {
        const candidate = update[key];
        if (isRecord(candidate)) {
            return candidate;
        }
    }
    return null;
};
const normalizeMessageRecord = (value) => {
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
const normalizeEntities = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    const entities = [];
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
const normalizeMessageText = (value) => {
    if (typeof value.text === "string") {
        return value.text;
    }
    if (typeof value.caption === "string") {
        return value.caption;
    }
    return "";
};
const normalizeTelegramDate = (raw) => {
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
const extractMessageId = (result) => {
    if (!isRecord(result)) {
        return null;
    }
    return normalizeIdentifier(result.message_id);
};
const normalizeTelegramUser = (value) => {
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
const toTelegramErrorCode = (errorCode, status) => {
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
const isRetryableStatus = (status) => status === 429 || status >= 500;
const extractRetryAfterSeconds = (parameters) => {
    if (!isRecord(parameters)) {
        return null;
    }
    return typeof parameters.retry_after === "number" ? parameters.retry_after : null;
};
const isAbortError = (error) => {
    if (!(error instanceof Error)) {
        return false;
    }
    return error.name === "AbortError";
};
const toDisconnectReason = (error) => {
    if (error instanceof TelegramBotClientError) {
        return `${error.code}: ${error.message}`;
    }
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return "Telegram polling disconnected.";
};
const composeSenderDisplayName = (value) => {
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
const buildTelegramBotApiUrl = (token, method) => `https://api.telegram.org/bot${token}/${method}`;
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const normalizeRequiredString = (value, field) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${field} must be a non-empty string.`);
    }
    return value.trim();
};
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
const normalizePositiveInteger = (value, field) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new Error(`${field} must be a positive integer.`);
    }
    return value;
};
const normalizeIdentifier = (value) => {
    if (typeof value === "string") {
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(Math.trunc(value));
    }
    return null;
};
const normalizeOptionalThreadId = (value) => {
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
//# sourceMappingURL=telegram-bot-client.js.map