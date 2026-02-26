import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { describe, expect, it } from "vitest";
import type {
  SessionProviderAdapter,
  SessionQr,
  SessionStartInput,
  SessionStartResult,
  SessionStatus,
} from "../../../../src/domain/models/session-provider-adapter.js";
import type {
  ListSessionPeerCandidatesOptions,
  ListSessionPeerCandidatesResult,
} from "../../../../src/domain/models/session-peer-candidate.js";
import {
  PersonalSessionFeatureDisabledError,
  WhatsAppPersonalSessionService,
} from "../../../../src/application/services/whatsapp-personal-session-service.js";

class StubSessionAdapter implements SessionProviderAdapter {
  readonly provider = ExternalChannelProvider.WHATSAPP;
  readonly transport = ExternalChannelTransport.PERSONAL_SESSION;
  private readonly sessions = new Map<string, SessionStatus>();
  private counter = 0;

  async startSession(input: SessionStartInput): Promise<SessionStartResult> {
    this.counter += 1;
    const sessionId = `session-${this.counter}`;
    const status: SessionStatus = {
      sessionId,
      accountLabel: input.accountLabel,
      status: "PENDING_QR",
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, status);
    return {
      sessionId,
      accountLabel: input.accountLabel,
      status: "PENDING_QR",
    };
  }

  async stopSession(sessionId: string): Promise<void> {
    const status = this.sessions.get(sessionId);
    if (!status) {
      throw new Error("missing session");
    }
    this.sessions.set(sessionId, {
      ...status,
      status: "STOPPED",
      updatedAt: new Date().toISOString(),
    });
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const status = this.sessions.get(sessionId);
    if (!status) {
      throw new Error("missing session");
    }
    return status;
  }

  async getSessionQr(sessionId: string): Promise<SessionQr> {
    const status = this.sessions.get(sessionId);
    if (!status) {
      throw new Error("missing session");
    }
    return {
      code: `QR-${status.sessionId}`,
      qr: `QR-${status.sessionId}`,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }

  async listSessionPeerCandidates(
    sessionId: string,
    _options?: ListSessionPeerCandidatesOptions,
  ): Promise<ListSessionPeerCandidatesResult> {
    const status = this.sessions.get(sessionId);
    if (!status) {
      throw new Error("missing session");
    }
    return {
      sessionId: status.sessionId,
      accountLabel: status.accountLabel,
      status: status.status,
      updatedAt: status.updatedAt,
      items: [
        {
          peerId: "491701111111@s.whatsapp.net",
          peerType: "USER",
          threadId: null,
          displayName: "Alice",
          lastMessageAt: status.updatedAt,
        },
      ],
    };
  }

  subscribeInbound(_handler: (envelope: any) => Promise<void>): () => void {
    return () => undefined;
  }

  async sendOutbound(_payload: unknown): Promise<{
    providerMessageId: string | null;
    deliveredAt: string;
    metadata: Record<string, unknown>;
  }> {
    return {
      providerMessageId: null,
      deliveredAt: new Date().toISOString(),
      metadata: {},
    };
  }
}

describe("WhatsAppPersonalSessionService", () => {
  it("creates session and resolves status when feature is enabled", async () => {
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });

    const created = await service.startPersonalSession("home");
    const status = await service.getPersonalSessionStatus(created.sessionId);

    expect(created).toMatchObject({
      sessionId: created.sessionId,
      accountLabel: "home",
      status: "PENDING_QR",
    });
    expect(status.sessionId).toBe(created.sessionId);
    expect(status.status).toBe("PENDING_QR");
  });

  it("rejects requests when feature is disabled", async () => {
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: false,
      qrTtlSeconds: 120,
    });

    await expect(service.startPersonalSession("home")).rejects.toBeInstanceOf(
      PersonalSessionFeatureDisabledError,
    );
  });

  it("returns peer candidates when feature is enabled", async () => {
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });

    const created = await service.startPersonalSession("home");
    const result = await service.listPersonalSessionPeerCandidates(created.sessionId, {
      limit: 10,
      includeGroups: true,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      peerId: "491701111111@s.whatsapp.net",
      peerType: "USER",
    });
  });
});
