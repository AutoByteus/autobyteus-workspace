import type {
  SessionProviderAdapter,
  SessionQr,
  SessionStatus,
} from "../../domain/models/session-provider-adapter.js";
import type {
  ListSessionPeerCandidatesOptions,
  ListSessionPeerCandidatesResult,
} from "../../domain/models/session-peer-candidate.js";

export class PersonalSessionFeatureDisabledError extends Error {
  constructor() {
    super("WhatsApp personal session feature is disabled.");
    this.name = "PersonalSessionFeatureDisabledError";
  }
}

export type WhatsAppPersonalSessionServiceConfig = {
  enabled: boolean;
  qrTtlSeconds: number;
};

export class WhatsAppPersonalSessionService {
  private readonly adapter: SessionProviderAdapter;
  private readonly config: WhatsAppPersonalSessionServiceConfig;

  constructor(
    adapter: SessionProviderAdapter,
    config: WhatsAppPersonalSessionServiceConfig,
  ) {
    this.adapter = adapter;
    this.config = config;
  }

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
      throw new PersonalSessionFeatureDisabledError();
    }
  }
}
