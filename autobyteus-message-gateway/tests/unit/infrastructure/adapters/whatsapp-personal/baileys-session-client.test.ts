import { describe, expect, it, vi } from "vitest";
import { BaileysSessionClient } from "../../../../../src/infrastructure/adapters/whatsapp-personal/baileys-session-client.js";

type Listener = (value: any) => void;

class FakeEventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): void {
    const existing = this.listeners.get(event) ?? new Set<Listener>();
    existing.add(listener);
    this.listeners.set(event, existing);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, value: any): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(value);
    }
  }
}

describe("BaileysSessionClient", () => {
  it("maps connection and inbound message events", async () => {
    const bus = new FakeEventBus();
    const saveCreds = vi.fn(async () => undefined);
    const logout = vi.fn(async () => undefined);
    const end = vi.fn(() => undefined);
    const sendMessage = vi.fn(async () => ({ key: { id: "provider-msg-1" } }));
    const downloadMedia = vi
      .fn()
      .mockResolvedValueOnce(Buffer.from("fake-audio"))
      .mockResolvedValueOnce(Buffer.from("fake-image"));

    const socket = {
      ev: {
        on: (event: string, listener: Listener) => bus.on(event, listener),
        off: (event: string, listener: Listener) => bus.off(event, listener),
      },
      sendMessage,
      logout,
      end,
    } as any;

    const client = new BaileysSessionClient({
      createSocket: (_config) => socket,
      createAuthState: async (_authPath) => ({
        state: {} as any,
        saveCreds,
      }),
      fetchVersion: async () => ({
        version: [2, 3000, 1025091846] as [number, number, number],
        isLatest: true,
      }),
      downloadMediaMessage: downloadMedia as any,
      nowIso: () => "2026-02-09T00:00:00.000Z",
    });

    const receivedConnections: unknown[] = [];
    const receivedMessages: unknown[] = [];
    client.onConnectionUpdate((event) => {
      receivedConnections.push(event);
    });
    client.onInboundMessage((event) => {
      receivedMessages.push(event);
    });

    await client.open({ authPath: "/tmp/fake-auth" });

    bus.emit("creds.update", {});
    bus.emit("connection.update", {
      connection: "connecting",
      qr: "QR-1",
    });
    bus.emit("messages.upsert", {
      messages: [
        {
          key: {
            remoteJid: "12345@s.whatsapp.net",
            id: "msg-1",
            fromMe: false,
          },
          pushName: "Alice",
          message: {
            conversation: "hello",
          },
          messageTimestamp: 1_738_690_000,
        },
        {
          key: {
            remoteJid: "12345@s.whatsapp.net",
            id: "msg-2",
            fromMe: true,
          },
          message: {
            conversation: "ignored",
          },
          messageTimestamp: 1_738_690_000,
        },
        {
          key: {
            remoteJid: "67890@s.whatsapp.net",
            id: "msg-3",
            fromMe: false,
          },
          pushName: "Bob",
          message: {
            audioMessage: {
              mimetype: "audio/ogg",
            },
          },
          messageTimestamp: 1_738_690_010,
        },
        {
          key: {
            remoteJid: "67890@s.whatsapp.net",
            id: "msg-4",
            fromMe: false,
          },
          pushName: "Bob",
          message: {
            imageMessage: {
              mimetype: "image/jpeg",
              caption: "look",
            },
          },
          messageTimestamp: 1_738_690_011,
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const sendResult = await client.sendText("12345@s.whatsapp.net", "hello");
    await client.close({ logout: true });

    expect(saveCreds).toHaveBeenCalledOnce();
    expect(receivedConnections).toHaveLength(1);
    expect(receivedMessages).toHaveLength(3);
    expect(receivedMessages[0]).toMatchObject({
      chatJid: "12345@s.whatsapp.net",
      senderJid: "12345@s.whatsapp.net",
      messageId: "msg-1",
      text: "hello",
      pushName: "Alice",
      fromMe: false,
    });
    expect(receivedMessages[1]).toMatchObject({
      chatJid: "67890@s.whatsapp.net",
      senderJid: "67890@s.whatsapp.net",
      messageId: "msg-3",
      text: null,
      attachments: [
        expect.objectContaining({
          kind: "audio",
          mimeType: "audio/ogg",
          fileName: "msg-3-audioMessage.ogg",
        }),
      ],
      pushName: "Bob",
      fromMe: false,
    });
    expect(receivedMessages[2]).toMatchObject({
      chatJid: "67890@s.whatsapp.net",
      senderJid: "67890@s.whatsapp.net",
      messageId: "msg-4",
      text: "look",
      attachments: [
        expect.objectContaining({
          kind: "image",
          mimeType: "image/jpeg",
          fileName: "msg-4-imageMessage.jpg",
        }),
      ],
      pushName: "Bob",
      fromMe: false,
    });
    expect(downloadMedia).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith("12345@s.whatsapp.net", { text: "hello" });
    expect(sendResult).toEqual({
      providerMessageId: "provider-msg-1",
      deliveredAt: "2026-02-09T00:00:00.000Z",
    });
    expect(logout).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });
});
