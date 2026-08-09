import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { createMemberLogicalAddressContext } from "../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext, type RuntimeTeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { TeamRunEventSourceType, type TeamRunEvent, type TeamRunEventListener } from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRecipientResolver } from "../../../src/agent-team-execution/services/team-recipient-resolver.js";
import { TeamRunTreeIndex } from "../../../src/agent-team-execution/services/team-run-tree-index.js";
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
import { address, testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const tempFiles = new Set<string>();
const cleanOverlapReply = "Sent the student a hard cyclic inequality problem to solve.";
const cleanFinalFollowUp = "clean final coordinator follow-up";
const secondFollowUp = "coordinator follow-up two";

afterEach(async () => {
  await Promise.all([...tempFiles].map((file) => rm(file, { force: true })));
  tempFiles.clear();
});

describe("external channel team open delivery e2e", () => {
  it("delivers deduped direct and no-new-inbound coordinator outputs from one team run without leaking worker output", async () => {
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
      targetMemberAddress: "/coordinator",
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
        replyText: cleanOverlapReply,
      });

      await teamRun.deliverInterAgentMessage({
        rootTeamRunId: teamRunId,
        callerAddressing: createMemberLogicalAddressContext({
          rootTeamRunId: teamRunId,
          memberAddress: "/worker",
        }),
        sender: {
          participant: {
            kind: "agent",
            executionAddress: createTeamExecutionAddress({
              rootTeamRunId: teamRunId,
              memberAddress: "/worker",
            }),
            agentRunId: "run-worker",
            displayName: "worker",
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            platformAgentRunId: null,
          },
        },
        recipientAddress: "/coordinator",
        content: "worker has completed the task",
        messageType: "validation",
      });

      await waitFor(() => enqueuedOutbounds.length === 3);
      expect(enqueuedOutbounds.map((envelope) => envelope.replyText)).toEqual([
        cleanOverlapReply,
        cleanFinalFollowUp,
        secondFollowUp,
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
        cleanOverlapReply,
        cleanFinalFollowUp,
        secondFollowUp,
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
  readonly teamRunId: string;
  readonly teamBackendKind = TeamBackendKind.MIXED;
  private readonly listeners = new Set<TeamRunEventListener>();
  private active = true;

  constructor(teamRunId: string, private readonly runtimeContext: RuntimeTeamRunContext) {
    this.teamRunId = teamRunId;
  }

  getRuntimeContext(): RuntimeTeamRunContext {
    return this.runtimeContext;
  }

  isActive(): boolean {
    return this.active;
  }

  getLeafAgentStatusSnapshots() {
    return [];
  }

  hasOpenExecutionWork(): boolean {
    return this.active;
  }

  subscribeToEvents(listener: TeamRunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  resolveRecipient(recipientAddress: string, caller: ReturnType<typeof createMemberLogicalAddressContext>) {
    return new TeamRecipientResolver().resolve(
      new TeamRunTreeIndex(createConfig(this.teamRunId).rootTeam),
      recipientAddress,
      caller,
    );
  }

  async postMessage(_message: AgentInputUserMessage, target: import("../../../src/agent-collaboration/domain/agent-team-address.js").AgentTeamAddress | null): Promise<AgentOperationResult> {
    expect(target).toBe("/coordinator");
    setTimeout(() => {
      this.emitOverlappingStreamTurn("coordinator", "run-coordinator", "turn-direct", [
        "Sent the",
        " the student",
        " student a",
        " a hard",
        " hard cyclic",
        " cyclic inequality",
        " inequality problem",
        " problem to",
        " to solve",
        " solve.",
      ]);
    }, 5).unref?.();
    return { accepted: true, turnId: "turn-direct", memberRunId: "run-coordinator", memberName: "coordinator" };
  }

  async deliverInterAgentMessage(request: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    expect(request.sender.participant.displayName).toBe("worker");
    expect(request.recipientAddress).toBe("/coordinator");
    setTimeout(() => {
      this.emitTextTurn("worker", "run-worker", "turn-worker-internal", "worker internal only");
      this.emitFinalPrecedenceTurn(
        "coordinator",
        "run-coordinator",
        "turn-follow-up-1",
        ["noisy partial", " partial duplicate"],
        cleanFinalFollowUp,
      );
      this.emitTextTurn("coordinator", "run-coordinator", "turn-follow-up-2", secondFollowUp);
    }, 5).unref?.();
    return { accepted: true };
  }

  async approveToolInvocation(): Promise<AgentOperationResult> { return { accepted: true }; }
  async interruptMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async settleMember(): Promise<AgentOperationResult> { return { accepted: true }; }
  async startTaskAgentInstance(): Promise<AgentOperationResult> { return { accepted: true }; }
  async settleTaskAgentInstance(): Promise<AgentOperationResult> { return { accepted: true }; }
  async startTaskTeamInstance(): Promise<AgentOperationResult> { return { accepted: true }; }
  async postMessageToTaskTeamInstance(): Promise<AgentOperationResult> { return { accepted: true }; }
  async settleTaskTeamInstance(): Promise<AgentOperationResult> { return { accepted: true }; }
  async terminate(): Promise<AgentOperationResult> { this.active = false; return { accepted: true }; }
  publishEvent(event: TeamRunEvent): void { for (const listener of this.listeners) listener(event); }

  private emitTextTurn(memberName: string, memberRunId: string, turnId: string, text: string): void {
    this.emitFinalPrecedenceTurn(memberName, memberRunId, turnId, [text], text);
  }

  private emitOverlappingStreamTurn(memberName: string, memberRunId: string, turnId: string, fragments: string[]): void {
    const events = [
      { eventType: AgentRunEventType.TURN_STARTED, payload: { turnId } },
      ...fragments.map((fragment) => ({
        eventType: AgentRunEventType.SEGMENT_CONTENT,
        payload: { turnId, segment_type: "text", delta: fragment },
      })),
      { eventType: AgentRunEventType.TURN_COMPLETED, payload: { turnId } },
    ];
    this.emitEvents(memberName, memberRunId, events);
  }

  private emitFinalPrecedenceTurn(
    memberName: string,
    memberRunId: string,
    turnId: string,
    fragments: string[],
    finalText: string,
  ): void {
    const events = [
      { eventType: AgentRunEventType.TURN_STARTED, payload: { turnId } },
      ...fragments.map((fragment) => ({
        eventType: AgentRunEventType.SEGMENT_CONTENT,
        payload: { turnId, segment_type: "text", delta: fragment },
      })),
      { eventType: AgentRunEventType.SEGMENT_END, payload: { turnId, segment_type: "text", text: finalText } },
      { eventType: AgentRunEventType.TURN_COMPLETED, payload: { turnId } },
    ];
    this.emitEvents(memberName, memberRunId, events);
  }

  private emitEvents(
    memberName: string,
    memberRunId: string,
    events: Array<{ eventType: AgentRunEventType; payload: Record<string, unknown> }>,
  ): void {
    for (const event of events) {
      for (const listener of this.listeners) {
        listener({
          eventSourceType: TeamRunEventSourceType.AGENT,
          teamRunId: this.teamRunId,
          executionAddress: createTeamExecutionAddress({
            rootTeamRunId: this.teamRunId,
            memberAddress: `/${memberName}`,
          }),
          data: {
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            executionAddress: createTeamExecutionAddress({
              rootTeamRunId: this.teamRunId,
              memberAddress: `/${memberName}`,
            }),
            displayName: memberName,
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
  const config = createConfig(teamRunId);
  const runtimeContext = new MixedTeamRunContext({
    memberContexts: [
      createRuntimeMemberContext("coordinator", "run-coordinator"),
      createRuntimeMemberContext("worker", "run-worker"),
    ],
    teamExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress: "/" }),
  });
  return new TeamRun({
    context: new TeamRunContext({
      teamRunId,
      teamAddress: address("/"),
      teamBackendKind: TeamBackendKind.MIXED,
      config,
      runtimeContext,
    }),
    backend: new DeterministicTeamRunBackend(teamRunId, runtimeContext),
  });
};

const createConfig = (teamRunId: string) => testTeamRunConfig({
  rootTeamRunId: teamRunId,
  rootTeamDefinitionId: "team-definition-open-delivery",
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", { agentRunId: "run-coordinator" }),
    testAgentNode("/worker", { agentRunId: "run-worker" }),
  ],
});

const createRuntimeMemberContext = (memberName: string, memberRunId: string) =>
  new MixedAgentMemberContext({
    address: address(`/${memberName}`),
    agentRunId: memberRunId,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    platformAgentRunId: null,
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
