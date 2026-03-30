import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { FileChannelBindingProvider } from "../../../../src/external-channel/providers/file-channel-binding-provider.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

const bindingFilePaths = new Set<string>();

const createProvider = (): FileChannelBindingProvider => {
  const filePath = `/tmp/channel-bindings-${randomUUID()}.json`;
  bindingFilePaths.add(filePath);
  return new FileChannelBindingProvider(filePath);
};

afterEach(async () => {
  await Promise.all(
    [...bindingFilePaths].map((filePath) => rm(filePath, { force: true })),
  );
  bindingFilePaths.clear();
});

describe("FileChannelBindingProvider", () => {
  it("upserts and resolves Discord channel-thread bindings", async () => {
    const provider = createProvider();
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

  it("supports Discord provider-default fallback lookup and bound-target checks", async () => {
    const provider = createProvider();
    const accountId = "discord-app-654321";
    const peerId = "user:123123123123123";

    const binding = await provider.upsertBinding({
      provider: ExternalChannelProvider.DISCORD,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "discord-agent-fallback",
      allowTransportFallback: true,
    });

    const fallback = await provider.findProviderDefaultBinding({
      provider: ExternalChannelProvider.DISCORD,
      accountId,
      peerId,
      threadId: null,
    });

    const boundToAgent = await provider.isRouteBoundToTarget(
      {
        provider: ExternalChannelProvider.DISCORD,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
      },
      {
        agentRunId: "discord-agent-fallback",
        teamRunId: null,
      },
    );

    const boundToDifferentAgent = await provider.isRouteBoundToTarget(
      {
        provider: ExternalChannelProvider.DISCORD,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
      },
      {
        agentRunId: "discord-agent-mismatch",
        teamRunId: null,
      },
    );

    expect(fallback?.id).toBe(binding.id);
    expect(fallback?.allowTransportFallback).toBe(true);
    expect(boundToAgent).toBe(true);
    expect(boundToDifferentAgent).toBe(false);
  });

  it("upserts and resolves exact route binding", async () => {
    const provider = createProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const binding = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-1",
    });

    const resolved = await provider.findBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });

    expect(binding.id).toBeTruthy();
    expect(resolved?.id).toBe(binding.id);
    expect(resolved?.agentRunId).toBe("agent-1");
  });

  it("finds provider-default binding when transport fallback is allowed", async () => {
    const provider = createProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-fallback",
      allowTransportFallback: true,
    });

    const fallback = await provider.findProviderDefaultBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      accountId,
      peerId,
      threadId: null,
    });

    expect(fallback).not.toBeNull();
    expect(fallback?.agentRunId).toBe("agent-fallback");
  });

  it("updates existing route record on repeated upsert", async () => {
    const provider = createProvider();
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
    });
    const second = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: "thread-1",
      targetType: "AGENT",
      agentRunId: "agent-2",
      allowTransportFallback: true,
    });

    expect(second.id).toBe(first.id);
    expect(second.agentRunId).toBe("agent-2");
    expect(second.allowTransportFallback).toBe(true);
  });

  it("supports dispatch-target lookup and agent relink updates", async () => {
    const provider = createProvider();
    const accountId = unique("acct");
    const peerId = unique("peer");

    const created = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-before",
    });

    const byTarget = await provider.findBindingByDispatchTarget({
      agentRunId: "agent-before",
      teamRunId: null,
    });
    expect(byTarget?.id).toBe(created.id);

    const relinked = await provider.upsertBindingAgentRunId(created.id, "agent-after");
    expect(relinked.agentRunId).toBe("agent-after");

    const relinkedLookup = await provider.findBindingByDispatchTarget({
      agentRunId: "agent-after",
      teamRunId: null,
    });
    expect(relinkedLookup?.id).toBe(created.id);
  });

  it("prefers agent target and falls back to team target lookup", async () => {
    const provider = createProvider();

    await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: unique("acct"),
      peerId: unique("peer"),
      threadId: null,
      targetType: "TEAM",
      teamRunId: "team-1",
      targetNodeName: "coordinator",
    });

    const teamLookup = await provider.findBindingByDispatchTarget({
      agentRunId: null,
      teamRunId: "team-1",
    });
    expect(teamLookup?.teamRunId).toBe("team-1");
    expect(teamLookup?.targetType).toBe("TEAM");
  });

  it("lists bindings in descending updatedAt order", async () => {
    const provider = createProvider();
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
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = await provider.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentRunId: "agent-2",
    });

    const listed = await provider.listBindings();
    const ids = listed.map((item) => item.id);

    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });

  it("deletes bindings by id and reports false for missing ids", async () => {
    const provider = createProvider();
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
