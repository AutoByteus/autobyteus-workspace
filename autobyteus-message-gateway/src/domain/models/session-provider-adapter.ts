import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { ProviderSendResult } from "./provider-adapter.js";
import type {
  ListSessionPeerCandidatesOptions,
  ListSessionPeerCandidatesResult,
} from "./session-peer-candidate.js";

export type SessionState = "PENDING_QR" | "ACTIVE" | "DEGRADED" | "STOPPED";

export type SessionStartInput = {
  accountLabel: string;
  qrTtlSeconds: number;
};

export type SessionStartResult = {
  sessionId: string;
  accountLabel: string;
  status: SessionState;
};

export type SessionStatus = {
  sessionId: string;
  accountLabel: string;
  status: SessionState;
  updatedAt: string;
};

export type SessionQr = {
  code: string;
  expiresAt: string;
  qr?: string;
};

export interface SessionProviderAdapter {
  readonly provider: ExternalChannelProvider;
  readonly transport: ExternalChannelTransport;
  startSession(input: SessionStartInput): Promise<SessionStartResult>;
  stopSession(sessionId: string): Promise<void>;
  getSessionStatus(sessionId: string): Promise<SessionStatus>;
  getSessionQr(sessionId: string): Promise<SessionQr>;
  listSessionPeerCandidates(
    sessionId: string,
    options?: ListSessionPeerCandidatesOptions,
  ): Promise<ListSessionPeerCandidatesResult>;
  subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void;
  sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
}
