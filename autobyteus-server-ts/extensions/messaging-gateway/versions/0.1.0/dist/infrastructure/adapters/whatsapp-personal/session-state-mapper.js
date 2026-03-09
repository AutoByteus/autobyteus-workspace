import { DisconnectReason } from "@whiskeysockets/baileys";
const STOPPED_DISCONNECT_CODES = new Set([
    DisconnectReason.loggedOut,
    DisconnectReason.badSession,
    DisconnectReason.connectionReplaced,
    DisconnectReason.multideviceMismatch,
    DisconnectReason.forbidden,
]);
export function toSessionState(update, previous) {
    if (update.connection === "open") {
        return "ACTIVE";
    }
    if (update.connection === "connecting") {
        return "PENDING_QR";
    }
    if (update.connection === "close") {
        if (typeof update.disconnectCode === "number" &&
            STOPPED_DISCONNECT_CODES.has(update.disconnectCode)) {
            return "STOPPED";
        }
        return "DEGRADED";
    }
    return previous;
}
//# sourceMappingURL=session-state-mapper.js.map