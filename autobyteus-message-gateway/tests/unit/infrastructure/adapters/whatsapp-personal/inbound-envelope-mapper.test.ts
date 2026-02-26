import { describe, expect, it } from "vitest";
import { toExternalMessageEnvelope } from "../../../../../src/infrastructure/adapters/whatsapp-personal/inbound-envelope-mapper.js";

describe("inbound-envelope-mapper", () => {
  it("maps direct-message inbound event", () => {
    const envelope = toExternalMessageEnvelope({
      sessionId: "session-1",
      accountLabel: "home",
      chatJid: "12345@s.whatsapp.net",
      senderJid: "12345@s.whatsapp.net",
      participantJid: null,
      messageId: "msg-1",
      text: "hello",
      receivedAt: "2026-02-09T00:00:00.000Z",
    });

    expect(envelope).toMatchObject({
      provider: "WHATSAPP",
      transport: "PERSONAL_SESSION",
      accountId: "home",
      peerId: "12345@s.whatsapp.net",
      peerType: "USER",
      threadId: null,
      externalMessageId: "msg-1",
      content: "hello",
    });
    expect(envelope.attachments).toEqual([]);
  });

  it("maps group inbound event with participant as peer", () => {
    const envelope = toExternalMessageEnvelope({
      sessionId: "session-1",
      accountLabel: "home",
      chatJid: "1203630@g.us",
      senderJid: "1203630@g.us",
      participantJid: "628111@s.whatsapp.net",
      messageId: "msg-2",
      text: "group message",
      receivedAt: "2026-02-09T00:00:00.000Z",
    });

    expect(envelope).toMatchObject({
      peerId: "628111@s.whatsapp.net",
      peerType: "GROUP",
      threadId: "1203630@g.us",
    });
  });

  it("maps attachment-only events with empty content and preserved attachments", () => {
    const envelope = toExternalMessageEnvelope({
      sessionId: "session-1",
      accountLabel: "home",
      chatJid: "62812345@s.whatsapp.net",
      senderJid: "62812345@s.whatsapp.net",
      participantJid: null,
      messageId: "msg-audio-1",
      text: null,
      attachments: [
        {
          kind: "audio",
          url: "data:audio/wav;base64,ZmFrZQ==",
          mimeType: "audio/wav",
          fileName: "voice.wav",
          sizeBytes: 4,
          metadata: { ptt: true },
        },
      ],
      receivedAt: "2026-02-09T00:00:00.000Z",
    });

    expect(envelope).toMatchObject({
      content: "",
      attachments: [
        {
          kind: "audio",
          mimeType: "audio/wav",
          fileName: "voice.wav",
          sizeBytes: 4,
        },
      ],
    });
  });
});
