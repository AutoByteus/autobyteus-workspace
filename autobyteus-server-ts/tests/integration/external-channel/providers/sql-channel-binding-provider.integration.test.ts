import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { SqlChannelBindingProvider } from "../../../../src/external-channel/providers/sql-channel-binding-provider.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

describe("SqlChannelBindingProvider", () => {
  it("upserts and resolves Discord channel-thread bindings", async () => {
    const provider = new SqlChannelBindingProvider();
    const accountId = "discord-app-123456";
    const peerId = "channel:111222333444555";
    const threadId = "999888777666555";

    const binding = await provider.upsertBinding({
      provider: ExternalChannelProvider.DISCORD,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      targetType: "AGENT",
      agentRunId: "discord-agent-1",
      teamRunId: null,
      targetMemberName: null,
    });

    const resolved = await provider.findBinding({
      provider: ExternalChannelProvider.DISCORD,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
    });

    expect(binding.id).toBeTruthy();
    expect(resolved?.id).toBe(binding.id);
    expect(resolved?.threadId).toBe(threadId);
    expect(resolved?.agentRunId).toBe("discord-agent-1");
  });

  it("checks whether a route is bound to specific agent/team targets", async () => {
    const provider = new SqlChannelBindingProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-1",
      teamRunId: null,
      targetMemberName: null,
    });

    const route = {
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    } as const;

    const boundToAgent = await provider.isRouteBoundToTarget(route, {
      agentRunId: "agent-1",
      teamRunId: null,
    });
    const boundToOtherAgent = await provider.isRouteBoundToTarget(route, {
      agentRunId: "agent-2",
      teamRunId: null,
    });

    expect(boundToAgent).toBe(true);
    expect(boundToOtherAgent).toBe(false);
  });

  it("updates an existing route record on repeated upsert", async () => {
    const provider = new SqlChannelBindingProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const first = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: "thread-1",
      targetType: "AGENT",
      agentRunId: "agent-1",
      teamRunId: null,
      targetMemberName: null,
    });
    const second = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: "thread-1",
      targetType: "AGENT",
      agentRunId: "agent-2",
      teamRunId: null,
      targetMemberName: null,
    });

    expect(second.id).toBe(first.id);
    expect(second.agentRunId).toBe("agent-2");
  });

  it("stores and resolves TEAM target bindings", async () => {
    const provider = new SqlChannelBindingProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentRunId: null,
      teamRunId: "team-1",
      targetMemberName: "coordinator",
    });

    const route = {
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    } as const;

    expect(
      await provider.isRouteBoundToTarget(route, {
        agentRunId: null,
        teamRunId: "team-1",
      }),
    ).toBe(true);
    expect(
      await provider.isRouteBoundToTarget(route, {
        agentRunId: "agent-x",
        teamRunId: null,
      }),
    ).toBe(false);

    const resolved = await provider.findBinding(route);
    expect(resolved?.targetType).toBe("TEAM");
    expect(resolved?.teamRunId).toBe("team-1");
    expect(resolved?.targetMemberName).toBe("coordinator");
  });

  it("lists bindings in descending updatedAt order", async () => {
    const provider = new SqlChannelBindingProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const first = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-1",
      teamRunId: null,
      targetMemberName: null,
    });

    const second = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-2",
      teamRunId: null,
      targetMemberName: null,
    });

    const listed = await provider.listBindings();
    const ids = listed.map((item) => item.id);

    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });

  it("deletes bindings by id and reports false for missing ids", async () => {
    const provider = new SqlChannelBindingProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const binding = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-delete",
      teamRunId: null,
      targetMemberName: null,
    });

    const deleted = await provider.deleteBinding(binding.id);
    const deletedAgain = await provider.deleteBinding(binding.id);
    const found = await provider.findBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });

    expect(deleted).toBe(true);
    expect(deletedAgain).toBe(false);
    expect(found).toBeNull();
  });
});
