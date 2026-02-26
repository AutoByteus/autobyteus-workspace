import { DisconnectReason } from "@whiskeysockets/baileys";
import { describe, expect, it } from "vitest";
import { toSessionState } from "../../../../../src/infrastructure/adapters/whatsapp-personal/session-state-mapper.js";

describe("session-state-mapper", () => {
  it("maps open and connecting updates", () => {
    expect(toSessionState({ connection: "connecting" }, "DEGRADED")).toBe("PENDING_QR");
    expect(toSessionState({ connection: "open" }, "PENDING_QR")).toBe("ACTIVE");
  });

  it("maps fatal disconnects to STOPPED", () => {
    expect(
      toSessionState({ connection: "close", disconnectCode: DisconnectReason.loggedOut }, "ACTIVE"),
    ).toBe("STOPPED");
  });

  it("maps non-fatal disconnects to DEGRADED", () => {
    expect(
      toSessionState({ connection: "close", disconnectCode: DisconnectReason.connectionLost }, "ACTIVE"),
    ).toBe("DEGRADED");
  });
});
