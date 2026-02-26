import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
import type {
  ListSessionPeerCandidatesOptions,
  PersonalSessionPeerCandidate,
} from "../../../domain/models/session-peer-candidate.js";
import type { SessionQr, SessionState } from "../../../domain/models/session-provider-adapter.js";

export type WechatyOpenSessionInput = {
  sessionId: string;
  accountLabel: string;
  qrTtlSeconds: number;
};

export type WechatySessionStatus = {
  status: SessionState;
  updatedAt: string;
};

export type WechatyInboundEvent = {
  sessionId: string;
  accountLabel: string;
  peerId: string;
  peerType: "USER" | "GROUP";
  threadId: string | null;
  messageId?: string | null;
  content: string;
  receivedAt: string;
  metadata?: Record<string, unknown>;
};

export interface WechatySidecarClient {
  openSession(input: WechatyOpenSessionInput): Promise<{
    status: SessionState;
    qr: SessionQr | null;
  }>;
  closeSession(sessionId: string): Promise<void>;
  getSessionStatus(sessionId: string): Promise<WechatySessionStatus>;
  getSessionQr(sessionId: string): Promise<SessionQr | null>;
  listPeerCandidates(
    sessionId: string,
    options?: ListSessionPeerCandidatesOptions,
  ): Promise<PersonalSessionPeerCandidate[]>;
  sendText(input: {
    sessionId: string;
    peerId: string;
    threadId: string | null;
    text: string;
  }): Promise<ProviderSendResult>;
}

export type HttpWechatySidecarClientConfig = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

export class HttpWechatySidecarClient implements WechatySidecarClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HttpWechatySidecarClientConfig) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async openSession(input: WechatyOpenSessionInput): Promise<{
    status: SessionState;
    qr: SessionQr | null;
  }> {
    const response = await this.request<{
      status: SessionState;
      qr?: SessionQr | null;
    }>("POST", "/api/wechaty/v1/sessions/open", input);
    return {
      status: response.status,
      qr: response.qr ?? null,
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}`,
    );
  }

  async getSessionStatus(sessionId: string): Promise<WechatySessionStatus> {
    return this.request<WechatySessionStatus>(
      "GET",
      `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}/status`,
    );
  }

  async getSessionQr(sessionId: string): Promise<SessionQr | null> {
    const response = await this.request<{ qr?: SessionQr | null }>(
      "GET",
      `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}/qr`,
    );
    return response.qr ?? null;
  }

  async listPeerCandidates(
    sessionId: string,
    options?: ListSessionPeerCandidatesOptions,
  ): Promise<PersonalSessionPeerCandidate[]> {
    const query = new URLSearchParams();
    if (typeof options?.limit === "number") {
      query.set("limit", String(options.limit));
    }
    if (typeof options?.includeGroups === "boolean") {
      query.set("includeGroups", options.includeGroups ? "true" : "false");
    }
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const response = await this.request<{ items: PersonalSessionPeerCandidate[] }>(
      "GET",
      `/api/wechaty/v1/sessions/${encodeURIComponent(sessionId)}/peer-candidates${suffix}`,
    );
    return response.items ?? [];
  }

  async sendText(input: {
    sessionId: string;
    peerId: string;
    threadId: string | null;
    text: string;
  }): Promise<ProviderSendResult> {
    return this.request<ProviderSendResult>(
      "POST",
      `/api/wechaty/v1/sessions/${encodeURIComponent(input.sessionId)}/messages`,
      {
        peerId: input.peerId,
        threadId: input.threadId,
        text: input.text,
      },
    );
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payloadText = await response.text();
    const payload = payloadText.length > 0 ? safeJsonParse(payloadText) : null;
    if (!response.ok) {
      const detail =
        typeof payload === "object" &&
        payload !== null &&
        "detail" in payload &&
        typeof (payload as { detail?: unknown }).detail === "string"
          ? (payload as { detail: string }).detail
          : `Wechaty sidecar request failed (${response.status}).`;
      throw new Error(detail);
    }
    return payload as T;
  }
}

const normalizeBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Wechaty sidecar base URL cannot be empty.");
  }
  return trimmed.replace(/\/+$/, "");
};

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return {
      detail: value,
    };
  }
};
