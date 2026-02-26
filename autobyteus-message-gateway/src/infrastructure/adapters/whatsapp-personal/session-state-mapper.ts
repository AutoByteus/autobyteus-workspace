import { DisconnectReason } from "@whiskeysockets/baileys";
import type { SessionState } from "../../../domain/models/session-provider-adapter.js";

export type PersonalConnectionUpdate = {
  connection?: "open" | "connecting" | "close";
  disconnectCode?: number;
};

const STOPPED_DISCONNECT_CODES = new Set<number>([
  DisconnectReason.loggedOut,
  DisconnectReason.badSession,
  DisconnectReason.connectionReplaced,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.forbidden,
]);

export function toSessionState(
  update: PersonalConnectionUpdate,
  previous: SessionState,
): SessionState {
  if (update.connection === "open") {
    return "ACTIVE";
  }

  if (update.connection === "connecting") {
    return "PENDING_QR";
  }

  if (update.connection === "close") {
    if (
      typeof update.disconnectCode === "number" &&
      STOPPED_DISCONNECT_CODES.has(update.disconnectCode)
    ) {
      return "STOPPED";
    }
    return "DEGRADED";
  }

  return previous;
}
