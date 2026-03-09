export class DiscordRestClientError extends Error {
    code;
    retryable;
    status;
    retryAfterMs;
    constructor(input) {
        super(input.detail);
        this.name = "DiscordRestClientError";
        this.code = input.code;
        this.retryable = input.retryable;
        this.status = input.status ?? null;
        this.retryAfterMs = input.retryAfterMs ?? null;
    }
}
export class DiscordRestClient {
    botToken;
    baseUrl;
    fetchImpl;
    dmChannelCache = new Map();
    constructor(config) {
        this.botToken = normalizeRequiredString(config.botToken, "botToken");
        this.baseUrl = (config.baseUrl ?? "https://discord.com/api/v10").replace(/\/$/, "");
        this.fetchImpl = config.fetchImpl ?? fetch;
    }
    async sendMessage(input) {
        if (input.chunks.length === 0) {
            throw new DiscordRestClientError({
                code: "INVALID_OUTBOUND_PAYLOAD",
                detail: "Discord outbound chunks cannot be empty.",
                retryable: false,
            });
        }
        const channelId = input.target.targetType === "USER"
            ? await this.resolveDmChannelId(input.target.userId)
            : input.target.channelId;
        const query = input.target.threadId && input.target.threadId.trim().length > 0
            ? `?thread_id=${encodeURIComponent(input.target.threadId)}`
            : "";
        let providerMessageId = null;
        for (const chunk of input.chunks) {
            const content = chunk.trim();
            if (content.length === 0) {
                continue;
            }
            const responseBody = await this.requestJson(`${this.baseUrl}/channels/${encodeURIComponent(channelId)}/messages${query}`, {
                method: "POST",
                body: JSON.stringify({
                    content,
                }),
            });
            providerMessageId =
                isRecord(responseBody) && typeof responseBody.id === "string" ? responseBody.id : null;
        }
        return {
            providerMessageId,
            deliveredAt: new Date().toISOString(),
            metadata: {},
        };
    }
    async resolveDmChannelId(userId) {
        const normalizedUserId = normalizeRequiredString(userId, "userId");
        const cached = this.dmChannelCache.get(normalizedUserId);
        if (cached) {
            return cached;
        }
        const responseBody = await this.requestJson(`${this.baseUrl}/users/@me/channels`, {
            method: "POST",
            body: JSON.stringify({
                recipient_id: normalizedUserId,
            }),
        });
        if (!isRecord(responseBody) || typeof responseBody.id !== "string") {
            throw new DiscordRestClientError({
                code: "INVALID_DM_CHANNEL_RESPONSE",
                detail: "Discord DM channel response did not include an id.",
                retryable: true,
            });
        }
        this.dmChannelCache.set(normalizedUserId, responseBody.id);
        return responseBody.id;
    }
    async requestJson(url, init) {
        let response;
        try {
            response = await this.fetchImpl(url, {
                method: init.method,
                headers: {
                    Authorization: `Bot ${this.botToken}`,
                    "Content-Type": "application/json",
                },
                body: init.body,
            });
        }
        catch (error) {
            throw new DiscordRestClientError({
                code: "TRANSIENT_NETWORK",
                detail: error instanceof Error ? error.message : "Discord network request failed.",
                retryable: true,
            });
        }
        const rawBody = await response.text();
        const parsedBody = parseJsonSafely(rawBody);
        if (response.ok) {
            return parsedBody;
        }
        throw toDiscordRestClientError(response.status, parsedBody, rawBody);
    }
}
const toDiscordRestClientError = (status, parsedBody, rawBody) => {
    if (status === 429) {
        const retryAfterMs = resolveRetryAfterMs(parsedBody);
        return new DiscordRestClientError({
            code: "RATE_LIMITED",
            detail: "Discord REST rate limited request.",
            retryable: true,
            status,
            retryAfterMs,
        });
    }
    if (status >= 500) {
        return new DiscordRestClientError({
            code: "TRANSIENT_DISCORD_ERROR",
            detail: `Discord REST responded with ${status}.`,
            retryable: true,
            status,
        });
    }
    if (status === 403) {
        return new DiscordRestClientError({
            code: "MISSING_PERMISSION",
            detail: extractDiscordErrorMessage(parsedBody, rawBody, status),
            retryable: false,
            status,
        });
    }
    if (status === 404) {
        return new DiscordRestClientError({
            code: "INVALID_TARGET",
            detail: extractDiscordErrorMessage(parsedBody, rawBody, status),
            retryable: false,
            status,
        });
    }
    if (status === 400 || status === 401) {
        return new DiscordRestClientError({
            code: "INVALID_REQUEST",
            detail: extractDiscordErrorMessage(parsedBody, rawBody, status),
            retryable: false,
            status,
        });
    }
    return new DiscordRestClientError({
        code: "DISCORD_REST_ERROR",
        detail: extractDiscordErrorMessage(parsedBody, rawBody, status),
        retryable: false,
        status,
    });
};
const resolveRetryAfterMs = (value) => {
    if (!isRecord(value) || typeof value.retry_after !== "number") {
        return null;
    }
    const retryAfter = value.retry_after;
    if (!Number.isFinite(retryAfter) || retryAfter < 0) {
        return null;
    }
    if (retryAfter > 1000) {
        return retryAfter;
    }
    return retryAfter * 1000;
};
const extractDiscordErrorMessage = (parsedBody, rawBody, status) => {
    if (isRecord(parsedBody) && typeof parsedBody.message === "string") {
        return `Discord REST ${status}: ${parsedBody.message}`;
    }
    if (rawBody.trim().length > 0) {
        return `Discord REST ${status}: ${rawBody}`;
    }
    return `Discord REST ${status} request failed.`;
};
const parseJsonSafely = (rawBody) => {
    if (rawBody.trim().length === 0) {
        return {};
    }
    try {
        return JSON.parse(rawBody);
    }
    catch {
        return rawBody;
    }
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const normalizeRequiredString = (value, field) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${field} must be a non-empty string.`);
    }
    return value.trim();
};
//# sourceMappingURL=discord-rest-client.js.map