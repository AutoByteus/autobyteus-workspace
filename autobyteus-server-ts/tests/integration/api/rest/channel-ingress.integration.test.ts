import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { registerChannelIngressRoutes } from "../../../../src/api/rest/channel-ingress.js";
import { FileChannelBindingProvider } from "../../../../src/external-channel/providers/file-channel-binding-provider.js";
import { FileChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/file-channel-message-receipt-provider.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import { ChannelIngressService } from "../../../../src/external-channel/services/channel-ingress-service.js";
import { ChannelMessageReceiptService } from "../../../../src/external-channel/services/channel-message-receipt-service.js";
import { ChannelThreadLockService } from "../../../../src/external-channel/services/channel-thread-lock-service.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import type { ChannelRunDispatchResult } from "../../../../src/external-channel/runtime/channel-run-dispatch-result.js";

const tempPaths = new Set<string>();

const createTempFilePath = (prefix: string): string => {
  const filePath = `/tmp/${prefix}-${randomUUID()}.json`;
  tempPaths.add(filePath);
  return filePath;
};

afterEach(async () => {
  await Promise.all([...tempPaths].map((filePath) => rm(filePath, { force: true })));
  tempPaths.clear();
});

const createEnvelope = (overrides: Partial<Record<string, unknown>> = {}) => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: ExternalPeerType.USER,
  threadId: "thread-1",
  externalMessageId: "msg-1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-03-27T07:00:00.000Z",
  metadata: { source: "integration-test" },
  routingKey: createChannelRoutingKey({
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
  }),
  ...overrides,
});

const createAgentBindingInput = () => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  targetType: "AGENT" as const,
  agentDefinitionId: "agent-def-1",
  launchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS" as const,
    autoExecuteTools: false,
    skillAccessMode: "PREFERRED" as const,
    llmConfig: null,
  },
  agentRunId: "agent-run-1",
});

const createTeamBindingInput = () => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  targetType: "TEAM" as const,
  teamDefinitionId: "team-def-1",
  teamLaunchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS" as const,
    autoExecuteTools: false,
    skillAccessMode: "PREFERRED" as const,
    llmConfig: null,
  },
  teamRunId: "team-run-1",
  targetNodeName: "Coordinator",
});

const createIngressHarness = async (options: {
  allowTransportFallback?: boolean;
  dispatchToBinding?: (binding: ChannelBinding) => Promise<ChannelRunDispatchResult>;
} = {}) => {
  const bindingService = new ChannelBindingService(
    new FileChannelBindingProvider(createTempFilePath("channel-bindings")),
    { allowTransportFallback: options.allowTransportFallback ?? false },
  );
  const messageReceiptService = new ChannelMessageReceiptService(
    new FileChannelMessageReceiptProvider(createTempFilePath("channel-receipts")),
  );
  const dispatchToBinding =
    options.dispatchToBinding ??
    (async (binding: ChannelBinding) =>
      binding.targetType === "TEAM"
        ? {
            dispatchTargetType: "TEAM" as const,
            teamRunId: binding.teamRunId ?? "team-run-1",
            memberRunId: null,
            memberName: binding.targetNodeName ?? null,
            turnId: null,
            dispatchedAt: new Date("2026-03-27T07:00:01.000Z"),
          }
        : {
            dispatchTargetType: "AGENT" as const,
            agentRunId: binding.agentRunId ?? "agent-run-1",
            turnId: "turn-1",
            dispatchedAt: new Date("2026-03-27T07:00:01.000Z"),
          });
  const dispatchSpy = vi.fn(dispatchToBinding);

  const ingressService = new ChannelIngressService({
    bindingService,
    threadLockService: new ChannelThreadLockService(),
    runFacade: {
      dispatchToBinding: dispatchSpy,
    } as any,
    messageReceiptService,
  });

  const app = fastify();
  await registerChannelIngressRoutes(app, {
    ingressService,
    deliveryEventService: {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordFailed: vi.fn(),
    },
  });

  return {
    app,
    bindingService,
    messageReceiptService,
    dispatchSpy,
  };
};

describe("channel-ingress route", () => {
  it("routes an agent binding and persists the ingress receipt", async () => {
    const harness = await createIngressHarness();
    await harness.bindingService.upsertBinding({
      ...createAgentBindingInput(),
      agentRunId: "agent-run-1",
    });

    const response = await harness.app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: createEnvelope(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ACCEPTED",
      bindingResolved: true,
      usedTransportFallback: false,
    });
    expect(harness.dispatchSpy).toHaveBeenCalledOnce();

    const source = await harness.messageReceiptService.getSourceByAgentRunTurn(
      "agent-run-1",
      "turn-1",
    );
    expect(source).toMatchObject({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: "thread-1",
      externalMessageId: "msg-1",
    });

    await harness.app.close();
  });

  it("routes a team binding and persists the team-target receipt", async () => {
    const harness = await createIngressHarness({
      dispatchToBinding: async () => ({
        dispatchTargetType: "TEAM",
        teamRunId: "team-run-1",
        memberRunId: "member-run-1",
        memberName: "Coordinator",
        turnId: "turn-team-1",
        dispatchedAt: new Date("2026-03-27T07:00:01.000Z"),
      }),
    });
    await harness.bindingService.upsertBinding({
      ...createTeamBindingInput(),
      teamRunId: "team-run-1",
    });

    const response = await harness.app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: createEnvelope(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ACCEPTED",
      bindingResolved: true,
    });
    expect(harness.dispatchSpy).toHaveBeenCalledOnce();

    const source = await harness.messageReceiptService.getSourceByAgentRunTurn(
      "member-run-1",
      "turn-team-1",
    );
    expect(source).toMatchObject({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      externalMessageId: "msg-1",
    });

    await harness.app.close();
  });

  it("returns ACCEPTED duplicate and reuses the unfinished accepted receipt on repeated externalMessageId", async () => {
    const harness = await createIngressHarness();
    await harness.bindingService.upsertBinding({
      ...createAgentBindingInput(),
      agentRunId: "agent-run-1",
    });

    const payload = createEnvelope();
    const first = await harness.app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload,
    });
    const second = await harness.app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload,
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(second.json()).toMatchObject({
      accepted: true,
      duplicate: true,
      disposition: "ACCEPTED",
      bindingResolved: false,
    });
    expect(harness.dispatchSpy).toHaveBeenCalledTimes(1);

    await harness.app.close();
  });

  it("returns UNBOUND when no binding matches the inbound route", async () => {
    const harness = await createIngressHarness();

    const response = await harness.app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: createEnvelope(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "UNBOUND",
      bindingResolved: false,
      bindingId: null,
      usedTransportFallback: false,
    });
    expect(harness.dispatchSpy).not.toHaveBeenCalled();

    await harness.app.close();
  });

  it("uses provider-default binding fallback when enabled", async () => {
    const harness = await createIngressHarness({
      allowTransportFallback: true,
    });
    await harness.bindingService.upsertBinding({
      ...createAgentBindingInput(),
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      allowTransportFallback: true,
      agentRunId: "agent-run-1",
    });

    const response = await harness.app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: createEnvelope(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ACCEPTED",
      bindingResolved: true,
      usedTransportFallback: true,
    });
    expect(harness.dispatchSpy).toHaveBeenCalledOnce();

    await harness.app.close();
  });
});
