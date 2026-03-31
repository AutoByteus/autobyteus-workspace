import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { SqlChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/sql-channel-message-receipt-provider.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

const seedAcceptedReceipt = async (
  provider: SqlChannelMessageReceiptProvider,
  input: {
    provider: ExternalChannelProvider;
    transport: ExternalChannelTransport;
    accountId: string;
    peerId: string;
    threadId: string | null;
    externalMessageId: string;
    agentRunId: string | null;
    teamRunId: string | null;
    receivedAt: Date;
  },
): Promise<void> => {
  const claimed = await provider.claimIngressDispatch({
    ...input,
    claimedAt: new Date(input.receivedAt.getTime() + 1000),
    leaseDurationMs: 30_000,
  });
  await provider.recordAcceptedDispatch({
    ...input,
    dispatchLeaseToken: claimed.dispatchLeaseToken ?? "",
  });
};

describe("SqlChannelMessageReceiptProvider", () => {
  it("creates pending receipts and exposes their lifecycle state", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const receipt = await provider.createPendingIngressReceipt({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-1",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
    });

    expect(receipt.ingressState).toBe("PENDING");
    const fetched = await provider.getReceiptByExternalMessage({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-1",
    });
    expect(fetched?.ingressState).toBe("PENDING");
  });

  it("reclaims dispatching receipts with a fresh lease token", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const firstClaim = await provider.claimIngressDispatch({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-dup",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      claimedAt: new Date("2026-02-08T00:00:01.000Z"),
      leaseDurationMs: 30_000,
    });
    const secondClaim = await provider.claimIngressDispatch({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-dup",
      receivedAt: new Date("2026-02-08T00:05:00.000Z"),
      claimedAt: new Date("2026-02-08T00:05:01.000Z"),
      leaseDurationMs: 30_000,
    });

    expect(firstClaim.dispatchLeaseToken).not.toBe(secondClaim.dispatchLeaseToken);
    expect(secondClaim.ingressState).toBe("DISPATCHING");
    expect(secondClaim.receivedAt.toISOString()).toBe("2026-02-08T00:05:00.000Z");
  });

  it("records accepted-turn correlation and resolves source by (agentRunId, turnId)", async () => {
    const provider = new SqlChannelMessageReceiptProvider();
    const agentRunId = unique("agent");
    const accountId = unique("acct");
    const peerId = unique("peer");

    const claimed = await provider.claimIngressDispatch({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: "ext-turn-1",
      receivedAt: new Date("2026-02-09T00:00:00.000Z"),
      claimedAt: new Date("2026-02-09T00:00:01.000Z"),
      leaseDurationMs: 30_000,
    });

    await provider.recordAcceptedDispatch({
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
      dispatchLeaseToken: claimed.dispatchLeaseToken ?? "",
    });

    const source = await provider.getSourceByAgentRunTurn(agentRunId, "turn-1");
    expect(source).not.toBeNull();
    expect(source?.externalMessageId).toBe("ext-turn-1");
    expect(source?.turnId).toBe("turn-1");
  });
});
