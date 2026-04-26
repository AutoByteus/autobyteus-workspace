import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryRequest } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext, type RuntimeTeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType, type TeamRunEventListener } from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { registerChannelIngressRoutes } from "../../../src/api/rest/channel-ingress.js";
import { FileChannelBindingProvider } from "../../../src/external-channel/providers/file-channel-binding-provider.js";
import { FileChannelMessageReceiptProvider } from "../../../src/external-channel/providers/file-channel-message-receipt-provider.js";
import { FileChannelRunOutputDeliveryProvider } from "../../../src/external-channel/providers/file-channel-run-output-delivery-provider.js";
import { ChannelRunFacade } from "../../../src/external-channel/runtime/channel-run-facade.js";
import { ChannelTeamRunFacade } from "../../../src/external-channel/runtime/channel-team-run-facade.js";
import { ChannelRunOutputDeliveryRuntime } from "../../../src/external-channel/runtime/channel-run-output-delivery-runtime.js";
import { ChannelBindingService } from "../../../src/external-channel/services/channel-binding-service.js";
import { ChannelIngressService } from "../../../src/external-channel/services/channel-ingress-service.js";
import { ChannelMessageReceiptService } from "../../../src/external-channel/services/channel-message-receipt-service.js";
import { ChannelRunOutputDeliveryService } from "../../../src/external-channel/services/channel-run-output-delivery-service.js";
import { ReplyCallbackService } from "../../../src/external-channel/services/reply-callback-service.js";

const tempFiles = new Set<string>();

afterEach(async () => {
  await Promise.all([...tempFiles].map((file) => rm(file, { force: true })));
  tempFiles.clear();
});

describe("external channel team open delivery e2e", () => {
  it("delivers direct and no-new-inbound coordinator outputs from one team run without leaking worker output", async () => {
    const bindingFilePath = tempJsonPath("channel-bindings");
    const receiptFilePath = tempJsonPath("channel-receipts");
    const outputDeliveryFilePath = tempJsonPath("channel-output-deliveries");

    const teamRunId = `team-open-${randomUUID()}`;
    const teamRun = createDeterministicTeamRun(teamRunId);
    const teamRunService = {
      resolveTeamRun: vi.fn().mockResolvedValue(teamRun),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
    };

    const bindingService = new ChannelBindingService(
      new FileChannelBindingProvider(bindingFilePath),
      {},
      { teamRunService },
    );
    const messageReceiptService = new ChannelMessageReceiptService(
      new FileChannelMessageReceiptProvider(receiptFilePath),
    );
    const deliveryService = new ChannelRunOutputDeliveryService(
      new FileChannelRunOutputDeliveryProvider(outputDeliveryFilePath),
    );
    const enqueuedOutbounds: ExternalOutboundEnvelope[] = [];
    const pendingDeliveryEvents: Array<Record<string, unknown>> = [];
    const replyCallbackService = new ReplyCallbackService({
      bindingService,
      deliveryEventService: {
        recordPending: vi.fn().mockImplementation(async (input: Record<string, unknown>) => {
          pendingDeliveryEvents.push(input);
        }),
        recordSent: vi.fn(),
        recordFailed: vi.fn(),
      } as any,
      callbackOutboxService: {
        enqueueOrGet: vi.fn().mockImplementation(async (_key: string, envelope: ExternalOutboundEnvelope) => {
          enqueuedOutbounds.push(envelope);
          return { duplicate: false };
        }),
      },
      callbackTargetResolver: {
        resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({ state: "AVAILABLE", reason: null }),
      },
    });
    const outputRuntime = new ChannelRunOutputDeliveryRuntime({
      bindingService,
      messageReceiptService,
      deliveryService,
      agentRunService: {} as any,
      teamRunService,
      turnReplyRecoveryService: { resolveReplyText: vi.fn().mockResolvedValue(null) } as any,
      replyCallbackServiceFactory: () => replyCallbackService,
    });
    const ingressService = new ChannelIngressService({
      bindingService,
      messageReceiptService,
      outputDeliveryRuntime: outputRuntime,
      runFacade: new ChannelRunFacade({
        teamRunFacade: new ChannelTeamRunFacade({
          runLauncher: { resolveOrStartTeamRun: vi.fn().mockResolvedValue(teamRunId) } as any,
          teamRunService: teamRunService as any,
          teamLiveMessagePublisher: { publishExternalUserMessage: vi.fn().mockReturnValue(1) } as any,
        }),
      }),
    });

    const route = {
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: `telegram-acct-${randomUUID()}`,
      peerId: `telegram-peer-${randomUUID()}`,
      threadId: null,
    };
    await bindingService.upsertBinding({
      ...route,
      targetType: "TEAM",
      teamDefinitionId: "team-definition-open-delivery",
      teamRunId,
      targetNodeName: "coordinator",
      allowTransportFallback: false,
    });

    outputRuntime.start();
    const app = fastify();
    try {
      await registerChannelIngressRoutes(app, {
        ingressService,
        deliveryEventService: { recordPending: vi.fn(), recordSent: vi.fn(), recordFailed: vi.fn() },
      });
      await app.ready();

      const response = await app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: {
          ...route,
          peerType: ExternalPeerType.USER,
          externalMessageId: "telegram-message-1",
          content: "Please coordinate a worker and then report back.",
          attachments: [],
          receivedAt: "2026-04-26T09:00:00.000Z",
          metadata: { test: "team-open-delivery" },
        },
      });

      expect(response.statusCode).toBe(202);
      const responseBody = response.json();
      expect(responseBody).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ACCEPTED",
        bindingResolved: true,
      });
      await waitFor(() => enqueuedOutbounds.length === 1);
      expect(enqueuedOutbounds[0]).toMatchObject({
        provider: route.provider,
        transport: route.transport,
        accountId: route.accountId,
        peerId: route.peerId,
        correlationMessageId: "telegram-message-1",
        replyText: "coordinator direct reply",
      });

      await teamRun.deliverInterAgentMessage({
        senderRunId: "run-worker",
        senderMemberName: "worker",
        teamRunId,
        recipientMemberName: "coordinator",
        content: "worker has completed the task",
        messageType: "validation",
      });

      await waitFor(() => enqueuedOutbounds.length === 3);
      expect(enqueuedOutbounds.map((envelope) => envelope.replyText)).toEqual([
        "coordinator direct reply",
        "coordinator follow-up one",
        "coordinator follow-up two",
      ]);
      expect(enqueuedOutbounds.some((envelope) => envelope.replyText.includes("worker internal only"))).toBe(false);
      expect(new Set(enqueuedOutbounds.map((envelope) => envelope.callbackIdempotencyKey)).size).toBe(3);
      expect(pendingDeliveryEvents).toHaveLength(3);

      let records = await deliveryService.listByBindingId(responseBody.bindingId as string);
      await waitFor(async () => {
        records = await deliveryService.listByBindingId(responseBody.bindingId as string);
        return records.filter((record) => record.status === "PUBLISHED").length === 3;
      });
      const publishedRecords = records.filter((record) => record.status === "PUBLISHED");
      expect(publishedRecords).toHaveLength(3);
      expect(publishedRecords.map((record) => record.replyTextFinal).sort()).toEqual([
        "coordinator direct reply",
        "coordinator follow-up one",
        "coordinator follow-up two",
      ].sort());
      expect(records.some((record) => record.replyTextFinal?.includes("worker internal only"))).toBe(false);
      expect(teamRunService.recordRunActivity).toHaveBeenCalledOnce();
    } finally {
      await app.close();
      await outputRuntime.stop();
    }
  }, 20_000);
});

class DeterministicTeamRunBackend implements TeamRunBackend {
  readonly teamBackendKind = TeamBackendKind.AUTOBYTEUS;
  private readonly listeners = new Set<TeamRunEventListener>();
  private active = true;

  constructor(readonly runId: string, private readonly runtimeContext: RuntimeTeamRunContext) {}

  getRuntimeContext(): RuntimeTeamRunContext {
    return this.runtimeContext;
  }

  isActive(): boolean {
    return this.active;
  }

  getStatus(): string | null {
    return this.active ? "ACTIVE" : "TERMINATED";
  }

  subscribeToEvents(listener: TeamRunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async postMessage(_message: AgentInputUserMessage, targetMemberName?: string | null): Promise<AgentOperationResult> {
    expect(targetMemberName).toBe("coordinator");
    setTimeout(() => this.emitTextTurn("coordinator", "run-coordinator", "turn-direct", "coordinator direct reply"), 5).unref?.();
    return { accepted: true, turnId: "turn-direct", memberRunId: "run-coordinator", memberName: "coordinator" };
  }

  async deliverInterAgentMessage(request: InterAgentMessageDeliveryRequest): Promise<AgentOperationResult> {
    expect(request.senderMemberName).toBe("worker");
    expect(request.recipientMemberName).toBe("coordinator");
    setTimeout(() => {
      this.emitTextTurn("worker", "run-worker", "turn-worker-internal", "worker internal only");
      this.emitTextTurn("coordinator", "run-coordinator", "turn-follow-up-1", "coordinator follow-up one");
      this.emitTextTurn("coordinator", "run-coordinator", "turn-follow-up-2", "coordinator follow-up two");
    }, 5).unref?.();
    return { accepted: true };
  }

  async approveToolInvocation(): Promise<AgentOperationResult> { return { accepted: true }; }
  async interrupt(): Promise<AgentOperationResult> { return { accepted: true }; }
  async terminate(): Promise<AgentOperationResult> { this.active = false; return { accepted: true }; }

  private emitTextTurn(memberName: string, memberRunId: string, turnId: string, text: string): void {
    const events = [
      { eventType: AgentRunEventType.TURN_STARTED, payload: { turnId } },
      { eventType: AgentRunEventType.SEGMENT_CONTENT, payload: { turnId, segment_type: "text", delta: text } },
      { eventType: AgentRunEventType.SEGMENT_END, payload: { turnId, segment_type: "text", text } },
      { eventType: AgentRunEventType.TURN_COMPLETED, payload: { turnId } },
    ];
    for (const event of events) {
      for (const listener of this.listeners) {
        listener({
          eventSourceType: TeamRunEventSourceType.AGENT,
          teamRunId: this.runId,
          data: {
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            memberName,
            memberRunId,
            agentEvent: {
              eventType: event.eventType,
              runId: memberRunId,
              statusHint: event.eventType === AgentRunEventType.TURN_COMPLETED ? "IDLE" : "ACTIVE",
              payload: event.payload,
            },
          },
        });
      }
    }
  }
}

const createDeterministicTeamRun = (teamRunId: string): TeamRun => {
  const config = new TeamRunConfig({
    teamDefinitionId: "team-definition-open-delivery",
    teamBackendKind: TeamBackendKind.AUTOBYTEUS,
    coordinatorMemberName: "coordinator",
    memberConfigs: [createMemberConfig("coordinator", "run-coordinator"), createMemberConfig("worker", "run-worker")],
  });
  const runtimeContext = {
    memberContexts: [createRuntimeMemberContext("coordinator", "run-coordinator"), createRuntimeMemberContext("worker", "run-worker")],
  } as RuntimeTeamRunContext;
  return new TeamRun({
    context: new TeamRunContext({
      runId: teamRunId,
      teamBackendKind: TeamBackendKind.AUTOBYTEUS,
      coordinatorMemberName: "coordinator",
      config,
      runtimeContext,
    }),
    backend: new DeterministicTeamRunBackend(teamRunId, runtimeContext),
  });
};

const createMemberConfig = (memberName: string, memberRunId: string) => ({
  memberName,
  memberRouteKey: memberName,
  memberRunId,
  agentDefinitionId: `agent-definition-${memberName}`,
  llmModelIdentifier: "deterministic-test-model",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  workspaceRootPath: "/tmp/autobyteus-external-channel-team-open-delivery",
  llmConfig: null,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
});

const createRuntimeMemberContext = (memberName: string, memberRunId: string) => ({
  memberName,
  memberRouteKey: memberName,
  memberRunId,
  getPlatformAgentRunId: () => null,
});

const tempJsonPath = (prefix: string): string => {
  const filePath = `/tmp/${prefix}-${randomUUID()}.json`;
  tempFiles.add(filePath);
  return filePath;
};

const waitFor = async (predicate: () => boolean | Promise<boolean>, timeoutMs = 3_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for condition.");
};
