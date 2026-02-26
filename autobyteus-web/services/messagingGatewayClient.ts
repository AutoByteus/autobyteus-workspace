import axios, { AxiosError, type AxiosInstance } from 'axios';
import type {
  GatewayCapabilitiesModel,
  GatewayDiscordPeerCandidatesModel,
  GatewayHealthModel,
  GatewayPeerCandidatesModel,
  GatewayTelegramPeerCandidatesModel,
  GatewayPersonalSessionModel,
  GatewayPersonalSessionQrModel,
  GatewayRuntimeReliabilityStatusModel,
  GatewayWeComAccountListModel,
} from '~/types/messaging';

export interface GatewayClientOptions {
  baseUrl?: string;
  adminToken?: string;
  timeoutMs?: number;
  httpClient?: AxiosInstance;
}

export interface GatewayCallOptions {
  adminToken?: string;
}

export interface GatewayPeerCandidateQueryOptions {
  limit?: number;
  includeGroups?: boolean;
}

interface GatewayErrorPayload {
  message?: string;
  error?: string;
  detail?: string;
  code?: string;
  sessionId?: string;
  details?: {
    sessionId?: string;
  };
}

export interface GatewayClientErrorDetails {
  sessionId?: string;
}

export class GatewayClientError extends Error {
  statusCode: number | null;

  code: string | null;

  details: GatewayClientErrorDetails | null;

  constructor(
    message: string,
    statusCode: number | null,
    code: string | null,
    details: GatewayClientErrorDetails | null = null,
  ) {
    super(message);
    this.name = 'GatewayClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    return stripTrailingSlash(url.toString());
  } catch {
    return stripTrailingSlash(trimmed);
  }
}

function normalizeGatewayError(error: unknown): GatewayClientError {
  if (!axios.isAxiosError(error)) {
    const message = error instanceof Error ? error.message : 'Gateway request failed';
    return new GatewayClientError(message, null, null, null);
  }

  const axiosError = error as AxiosError<GatewayErrorPayload>;
  const statusCode = axiosError.response?.status ?? null;
  const payload = axiosError.response?.data;
  const message =
    payload?.message ||
    payload?.error ||
    payload?.detail ||
    axiosError.message ||
    'Gateway request failed';
  const code = payload?.code || null;
  const details: GatewayClientErrorDetails | null =
    payload?.sessionId || payload?.details?.sessionId
      ? {
          sessionId: payload?.sessionId || payload?.details?.sessionId,
        }
      : null;

  return new GatewayClientError(message, statusCode, code, details);
}

export class MessagingGatewayClient {
  private readonly baseUrl: string;

  private readonly adminToken?: string;

  private readonly httpClient: AxiosInstance;

  constructor(options: GatewayClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl || '');
    this.adminToken = options.adminToken;
    this.httpClient =
      options.httpClient ||
      axios.create({
        timeout: options.timeoutMs ?? 10_000,
      });
  }

  private resolveBaseUrl(): string {
    if (!this.baseUrl) {
      throw new GatewayClientError(
        'Message gateway base URL is not configured.',
        null,
        'GATEWAY_BASE_URL_MISSING',
      );
    }
    return this.baseUrl;
  }

  private authHeader(callOptions?: GatewayCallOptions): Record<string, string> {
    const token = callOptions?.adminToken || this.adminToken;
    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
    callOptions?: GatewayCallOptions,
  ): Promise<T> {
    const url = `${this.resolveBaseUrl()}${path}`;

    try {
      const response = await this.httpClient.request<T>({
        method,
        url,
        data: body,
        headers: this.authHeader(callOptions),
      });

      return response.data;
    } catch (error) {
      throw normalizeGatewayError(error);
    }
  }

  async getHealth(callOptions?: GatewayCallOptions): Promise<GatewayHealthModel> {
    return this.request<GatewayHealthModel>('GET', '/health', undefined, callOptions);
  }

  async getCapabilities(callOptions?: GatewayCallOptions): Promise<GatewayCapabilitiesModel> {
    return this.request<GatewayCapabilitiesModel>(
      'GET',
      '/api/channel-admin/v1/capabilities',
      undefined,
      callOptions,
    );
  }

  async getRuntimeReliabilityStatus(
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayRuntimeReliabilityStatusModel> {
    return this.request<GatewayRuntimeReliabilityStatusModel>(
      'GET',
      '/api/runtime-reliability/v1/status',
      undefined,
      callOptions,
    );
  }

  async getWeComAccounts(callOptions?: GatewayCallOptions): Promise<GatewayWeComAccountListModel> {
    return this.request<GatewayWeComAccountListModel>(
      'GET',
      '/api/channel-admin/v1/wecom/accounts',
      undefined,
      callOptions,
    );
  }

  async startWhatsAppPersonalSession(
    accountLabel: string,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPersonalSessionModel> {
    return this.request<GatewayPersonalSessionModel>(
      'POST',
      '/api/channel-admin/v1/whatsapp/personal/sessions',
      { accountLabel },
      callOptions,
    );
  }

  async getWhatsAppPersonalQr(
    sessionId: string,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPersonalSessionQrModel> {
    return this.request<GatewayPersonalSessionQrModel>(
      'GET',
      `/api/channel-admin/v1/whatsapp/personal/sessions/${encodeURIComponent(sessionId)}/qr`,
      undefined,
      callOptions,
    );
  }

  async getWhatsAppPersonalStatus(
    sessionId: string,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPersonalSessionModel> {
    return this.request<GatewayPersonalSessionModel>(
      'GET',
      `/api/channel-admin/v1/whatsapp/personal/sessions/${encodeURIComponent(sessionId)}/status`,
      undefined,
      callOptions,
    );
  }

  async stopWhatsAppPersonalSession(
    sessionId: string,
    callOptions?: GatewayCallOptions,
  ): Promise<{ success: boolean }> {
    await this.request<unknown>(
      'DELETE',
      `/api/channel-admin/v1/whatsapp/personal/sessions/${encodeURIComponent(sessionId)}`,
      undefined,
      callOptions,
    );
    return { success: true };
  }

  async getWhatsAppPersonalPeerCandidates(
    sessionId: string,
    options?: GatewayPeerCandidateQueryOptions,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPeerCandidatesModel> {
    const query = new URLSearchParams();
    if (typeof options?.limit === 'number') {
      query.set('limit', String(options.limit));
    }
    if (typeof options?.includeGroups === 'boolean') {
      query.set('includeGroups', options.includeGroups ? 'true' : 'false');
    }
    const querySuffix = query.toString() ? `?${query.toString()}` : '';

    return this.request<GatewayPeerCandidatesModel>(
      'GET',
      `/api/channel-admin/v1/whatsapp/personal/sessions/${encodeURIComponent(sessionId)}/peer-candidates${querySuffix}`,
      undefined,
      callOptions,
    );
  }

  async startWeChatPersonalSession(
    accountLabel: string,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPersonalSessionModel> {
    return this.request<GatewayPersonalSessionModel>(
      'POST',
      '/api/channel-admin/v1/wechat/personal/sessions',
      { accountLabel },
      callOptions,
    );
  }

  async getWeChatPersonalQr(
    sessionId: string,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPersonalSessionQrModel> {
    return this.request<GatewayPersonalSessionQrModel>(
      'GET',
      `/api/channel-admin/v1/wechat/personal/sessions/${encodeURIComponent(sessionId)}/qr`,
      undefined,
      callOptions,
    );
  }

  async getWeChatPersonalStatus(
    sessionId: string,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPersonalSessionModel> {
    return this.request<GatewayPersonalSessionModel>(
      'GET',
      `/api/channel-admin/v1/wechat/personal/sessions/${encodeURIComponent(sessionId)}/status`,
      undefined,
      callOptions,
    );
  }

  async stopWeChatPersonalSession(
    sessionId: string,
    callOptions?: GatewayCallOptions,
  ): Promise<{ success: boolean }> {
    await this.request<unknown>(
      'DELETE',
      `/api/channel-admin/v1/wechat/personal/sessions/${encodeURIComponent(sessionId)}`,
      undefined,
      callOptions,
    );
    return { success: true };
  }

  async getWeChatPersonalPeerCandidates(
    sessionId: string,
    options?: GatewayPeerCandidateQueryOptions,
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayPeerCandidatesModel> {
    const query = new URLSearchParams();
    if (typeof options?.limit === 'number') {
      query.set('limit', String(options.limit));
    }
    if (typeof options?.includeGroups === 'boolean') {
      query.set('includeGroups', options.includeGroups ? 'true' : 'false');
    }
    const querySuffix = query.toString() ? `?${query.toString()}` : '';

    return this.request<GatewayPeerCandidatesModel>(
      'GET',
      `/api/channel-admin/v1/wechat/personal/sessions/${encodeURIComponent(sessionId)}/peer-candidates${querySuffix}`,
      undefined,
      callOptions,
    );
  }

  async getDiscordPeerCandidates(
    options?: GatewayPeerCandidateQueryOptions & { accountId?: string },
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayDiscordPeerCandidatesModel> {
    const query = new URLSearchParams();
    if (typeof options?.limit === 'number') {
      query.set('limit', String(options.limit));
    }
    if (typeof options?.includeGroups === 'boolean') {
      query.set('includeGroups', options.includeGroups ? 'true' : 'false');
    }
    if (typeof options?.accountId === 'string' && options.accountId.trim().length > 0) {
      query.set('accountId', options.accountId.trim());
    }
    const querySuffix = query.toString() ? `?${query.toString()}` : '';

    return this.request<GatewayDiscordPeerCandidatesModel>(
      'GET',
      `/api/channel-admin/v1/discord/peer-candidates${querySuffix}`,
      undefined,
      callOptions,
    );
  }

  async getTelegramPeerCandidates(
    options?: GatewayPeerCandidateQueryOptions & { accountId?: string },
    callOptions?: GatewayCallOptions,
  ): Promise<GatewayTelegramPeerCandidatesModel> {
    const query = new URLSearchParams();
    if (typeof options?.limit === 'number') {
      query.set('limit', String(options.limit));
    }
    if (typeof options?.includeGroups === 'boolean') {
      query.set('includeGroups', options.includeGroups ? 'true' : 'false');
    }
    if (typeof options?.accountId === 'string' && options.accountId.trim().length > 0) {
      query.set('accountId', options.accountId.trim());
    }
    const querySuffix = query.toString() ? `?${query.toString()}` : '';

    return this.request<GatewayTelegramPeerCandidatesModel>(
      'GET',
      `/api/channel-admin/v1/telegram/peer-candidates${querySuffix}`,
      undefined,
      callOptions,
    );
  }
}

export function createMessagingGatewayClient(
  options: GatewayClientOptions = {},
): MessagingGatewayClient {
  return new MessagingGatewayClient(options);
}

export function createGatewayClientFromRuntimeConfig(): MessagingGatewayClient {
  const runtimeConfig = useRuntimeConfig();
  return createMessagingGatewayClient({
    baseUrl: runtimeConfig.public.messageGatewayBaseUrl as string | undefined,
    adminToken: runtimeConfig.public.messageGatewayAdminToken as string | undefined,
  });
}
