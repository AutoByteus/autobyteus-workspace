import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";

export type DiscordRestSendTarget =
  | {
      targetType: "USER";
      userId: string;
      threadId: string | null;
    }
  | {
      targetType: "CHANNEL";
      channelId: string;
      threadId: string | null;
    };

export type DiscordRestSendInput = {
  target: DiscordRestSendTarget;
  chunks: string[];
};

export type DiscordRestClientConfig = {
  botToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class DiscordRestClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(input: {
    code: string;
    detail: string;
    retryable: boolean;
    status?: number | null;
    retryAfterMs?: number | null;
  }) {
    super(input.detail);
    this.name = "DiscordRestClientError";
    this.code = input.code;
    this.retryable = input.retryable;
    this.status = input.status ?? null;
    this.retryAfterMs = input.retryAfterMs ?? null;
  }
}

export class DiscordRestClient {
  private readonly botToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly dmChannelCache = new Map<string, string>();

  constructor(config: DiscordRestClientConfig) {
    this.botToken = normalizeRequiredString(config.botToken, "botToken");
    this.baseUrl = (config.baseUrl ?? "https://discord.com/api/v10").replace(/\/$/, "");
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async sendMessage(input: DiscordRestSendInput): Promise<ProviderSendResult> {
    if (input.chunks.length === 0) {
      throw new DiscordRestClientError({
        code: "INVALID_OUTBOUND_PAYLOAD",
        detail: "Discord outbound chunks cannot be empty.",
        retryable: false,
      });
    }

    const channelId =
      input.target.targetType === "USER"
        ? await this.resolveDmChannelId(input.target.userId)
        : input.target.channelId;
    const query =
      input.target.threadId && input.target.threadId.trim().length > 0
        ? `?thread_id=${encodeURIComponent(input.target.threadId)}`
        : "";

    let providerMessageId: string | null = null;
    for (const chunk of input.chunks) {
      const content = chunk.trim();
      if (content.length === 0) {
        continue;
      }
      const responseBody = await this.requestJson(
        `${this.baseUrl}/channels/${encodeURIComponent(channelId)}/messages${query}`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
          }),
        },
      );
      providerMessageId =
        isRecord(responseBody) && typeof responseBody.id === "string" ? responseBody.id : null;
    }

    return {
      providerMessageId,
      deliveredAt: new Date().toISOString(),
      metadata: {},
    };
  }

  private async resolveDmChannelId(userId: string): Promise<string> {
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

  private async requestJson(
    url: string,
    init: {
      method: string;
      body?: string;
    },
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: init.method,
        headers: {
          Authorization: `Bot ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: init.body,
      });
    } catch (error) {
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

const toDiscordRestClientError = (
  status: number,
  parsedBody: unknown,
  rawBody: string,
): DiscordRestClientError => {
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

const resolveRetryAfterMs = (value: unknown): number | null => {
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

const extractDiscordErrorMessage = (
  parsedBody: unknown,
  rawBody: string,
  status: number,
): string => {
  if (isRecord(parsedBody) && typeof parsedBody.message === "string") {
    return `Discord REST ${status}: ${parsedBody.message}`;
  }
  if (rawBody.trim().length > 0) {
    return `Discord REST ${status}: ${rawBody}`;
  }
  return `Discord REST ${status} request failed.`;
};

const parseJsonSafely = (rawBody: string): unknown => {
  if (rawBody.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
};
