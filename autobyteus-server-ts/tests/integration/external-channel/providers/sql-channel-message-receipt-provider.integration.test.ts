import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { SqlChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/sql-channel-message-receipt-provider.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

describe("SqlChannelMessageReceiptProvider", () => {
  it("records ingress receipt and returns latest source by agentRunId", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const agentRunId = unique("agent");
    const accountId = unique("acct");
    const peerId = unique("peer");

    await provider.recordIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-1",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      agentRunId,
      teamRunId: null,
    });

    const source = await provider.getLatestSourceByAgentRunId(agentRunId);

    expect(source).not.toBeNull();
    expect(source?.provider).toBe(ExternalChannelProvider.WHATSAPP);
    expect(source?.transport).toBe(ExternalChannelTransport.BUSINESS_API);
    expect(source?.threadId).toBeNull();
    expect(source?.externalMessageId).toBe("ext-1");
  });

  it("returns the most recent source context by receivedAt", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const agentRunId = unique("agent");
    const accountId = unique("acct");
    const peerId = unique("peer");

    await provider.recordIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: "thread-1",
      externalMessageId: "ext-old",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      agentRunId,
      teamRunId: null,
    });
    await provider.recordIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: "thread-1",
      externalMessageId: "ext-new",
      receivedAt: new Date("2026-02-08T00:01:00.000Z"),
      agentRunId,
      teamRunId: null,
    });

    const source = await provider.getLatestSourceByAgentRunId(agentRunId);

    expect(source?.externalMessageId).toBe("ext-new");
    expect(source?.threadId).toBe("thread-1");
  });

  it("upserts duplicate route+message receipt key instead of creating duplicates", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const agentRunId = unique("agent");
    const accountId = unique("acct");
    const peerId = unique("peer");

    await provider.recordIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-dup",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      agentRunId,
      teamRunId: null,
    });
    await provider.recordIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-dup",
      receivedAt: new Date("2026-02-08T00:05:00.000Z"),
      agentRunId,
      teamRunId: null,
    });

    const source = await provider.getLatestSourceByAgentRunId(agentRunId);
    expect(source?.externalMessageId).toBe("ext-dup");
    expect(source?.receivedAt.toISOString()).toBe("2026-02-08T00:05:00.000Z");
  });

  it("returns null for unknown agent and rejects blank lookup keys", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const missing = await provider.getLatestSourceByAgentRunId(unique("missing-agent"));
    expect(missing).toBeNull();

    await expect(provider.getLatestSourceByAgentRunId("   ")).rejects.toThrow(
      "agentRunId must be a non-empty string.",
    );
  });

  it("resolves latest source by dispatch target (agent first, then team)", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");
    const teamRunId = unique("team");
    const agentRunId = unique("agent");

    await provider.recordIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "team-msg",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      agentRunId: null,
      teamRunId,
    });

    const teamSource = await provider.getLatestSourceByDispatchTarget({
      agentRunId: null,
      teamRunId,
    });
    expect(teamSource?.externalMessageId).toBe("team-msg");

    await provider.recordIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "agent-msg",
      receivedAt: new Date("2026-02-08T00:01:00.000Z"),
      agentRunId,
      teamRunId,
    });

    const preferred = await provider.getLatestSourceByDispatchTarget({
      agentRunId,
      teamRunId,
    });
    expect(preferred?.externalMessageId).toBe("agent-msg");
  });

  it("binds turn to receipt and resolves source by (agentRunId, turnId)", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const agentRunId = unique("agent");
    const accountId = unique("acct");
    const peerId = unique("peer");

    await provider.bindTurnToReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-turn-1",
      turnId: "turn-1",
      agentRunId,
      teamRunId: null,
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
    });

    const source = await provider.getSourceByAgentRunTurn(agentRunId, "turn-1");
    expect(source).not.toBeNull();
    expect(source?.externalMessageId).toBe("ext-turn-1");
    expect(source?.turnId).toBe("turn-1");
  });
});
