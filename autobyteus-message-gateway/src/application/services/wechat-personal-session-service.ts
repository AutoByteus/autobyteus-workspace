import type {
  ListSessionPeerCandidatesOptions,
  ListSessionPeerCandidatesResult,
} from "../../domain/models/session-peer-candidate.js";
import type {
  SessionProviderAdapter,
  SessionQr,
  SessionStatus,
} from "../../domain/models/session-provider-adapter.js";

export class WechatPersonalFeatureDisabledError extends Error {
  constructor() {
    super("WeChat personal session feature is disabled.");
    this.name = "WechatPersonalFeatureDisabledError";
  }
}

export type WechatPersonalSessionServiceConfig = {
  enabled: boolean;
  qrTtlSeconds: number;
};

export class WechatPersonalSessionService {
  constructor(
    private readonly adapter: SessionProviderAdapter,
    private readonly config: WechatPersonalSessionServiceConfig,
  ) {}

  async startPersonalSession(accountLabel: string): Promise<{ sessionId: string }> {
    this.assertEnabled();
    return this.adapter.startSession({
      accountLabel,
      qrTtlSeconds: this.config.qrTtlSeconds,
    });
  }

  async getPersonalSessionQr(sessionId: string): Promise<SessionQr> {
    this.assertEnabled();
    return this.adapter.getSessionQr(sessionId);
  }

  async getPersonalSessionStatus(sessionId: string): Promise<SessionStatus> {
    this.assertEnabled();
    return this.adapter.getSessionStatus(sessionId);
  }

  async listPersonalSessionPeerCandidates(
    sessionId: string,
    options?: ListSessionPeerCandidatesOptions,
  ): Promise<ListSessionPeerCandidatesResult> {
    this.assertEnabled();
    return this.adapter.listSessionPeerCandidates(sessionId, options);
  }

  async stopPersonalSession(sessionId: string): Promise<void> {
    this.assertEnabled();
    await this.adapter.stopSession(sessionId);
  }

  private assertEnabled(): void {
    if (!this.config.enabled) {
      throw new WechatPersonalFeatureDisabledError();
    }
  }
}
