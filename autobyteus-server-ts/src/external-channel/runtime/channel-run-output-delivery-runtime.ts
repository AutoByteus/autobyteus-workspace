import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import type {
  ChannelBinding,
  ChannelOutputRoute,
  ChannelRunOutputDeliveryRecord,
  ChannelRunOutputTarget,
} from "../domain/models.js";
import { ChannelBindingService } from "../services/channel-binding-service.js";
import { subscribeToChannelBindingLifecycleEvents } from "../services/channel-binding-lifecycle-events.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import { ChannelRunOutputDeliveryService } from "../services/channel-run-output-delivery-service.js";
import {
  ChannelTurnReplyRecoveryService,
  getChannelTurnReplyRecoveryService,
} from "../services/channel-turn-reply-recovery-service.js";
import { ReplyCallbackService } from "../services/reply-callback-service.js";
import { buildDefaultReplyCallbackService } from "./gateway-callback-delivery-runtime.js";
import {
  parseDirectChannelOutputEvent,
  parseTeamChannelOutputEvent,
} from "./channel-output-event-parser.js";
import { ChannelRunOutputEligibilityPolicy } from "./channel-run-output-eligibility.js";
import { ChannelRunOutputEventCollector } from "./channel-run-output-event-collector.js";
import {
  ChannelRunOutputLinkRegistry,
  type ChannelRunOutputLink,
} from "./channel-run-output-link-registry.js";
import { ChannelRunOutputPublisher } from "./channel-run-output-publisher.js";
import { ChannelRunOutputRecoveryScheduler } from "./channel-run-output-recovery-scheduler.js";
import { resolveTeamRunOutputTarget } from "../services/channel-team-output-target-identity.js";

export type AttachAcceptedDispatchInput = {
  binding: ChannelBinding;
  route: ChannelOutputRoute;
  latestCorrelationMessageId: string;
  target: ChannelRunOutputTarget;
  turnId: string;
};

export type ChannelRunOutputDeliveryRuntimeDependencies = {
  bindingService?: ChannelBindingService;
  messageReceiptService?: ChannelMessageReceiptService;
  deliveryService?: ChannelRunOutputDeliveryService;
  agentRunService?: AgentRunService;
  teamRunService?: TeamRunService;
  turnReplyRecoveryService?: ChannelTurnReplyRecoveryService;
  replyCallbackServiceFactory?: () => ReplyCallbackService;
};

export class ChannelRunOutputDeliveryRuntime {
  private readonly bindingService: ChannelBindingService;
  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly deliveryService: ChannelRunOutputDeliveryService;
  private readonly agentRunService: AgentRunService;
  private readonly teamRunService: TeamRunService;
  private readonly turnReplyRecoveryService: ChannelTurnReplyRecoveryService;
  private readonly replyCallbackServiceFactory: () => ReplyCallbackService;
  private readonly publisher: ChannelRunOutputPublisher;
  private readonly registry = new ChannelRunOutputLinkRegistry();
  private readonly eligibility = new ChannelRunOutputEligibilityPolicy();
  private readonly collector = new ChannelRunOutputEventCollector();
  private readonly recoveryScheduler = new ChannelRunOutputRecoveryScheduler();
  private readonly processingChains = new Map<string, Promise<void>>();
  private bindingLifecycleUnsubscribe: (() => void) | null = null;
  private started = false;

  constructor(deps: ChannelRunOutputDeliveryRuntimeDependencies = {}) {
    this.bindingService = deps.bindingService ?? new ChannelBindingService();
    this.messageReceiptService = deps.messageReceiptService ?? new ChannelMessageReceiptService();
    this.deliveryService = deps.deliveryService ?? new ChannelRunOutputDeliveryService();
    this.agentRunService = deps.agentRunService ?? getAgentRunService();
    this.teamRunService = deps.teamRunService ?? getTeamRunService();
    this.turnReplyRecoveryService =
      deps.turnReplyRecoveryService ?? getChannelTurnReplyRecoveryService();
    this.replyCallbackServiceFactory =
      deps.replyCallbackServiceFactory ?? (() => buildDefaultReplyCallbackService());
    this.publisher = new ChannelRunOutputPublisher(
      this.deliveryService,
      this.replyCallbackServiceFactory,
    );
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.bindingLifecycleUnsubscribe = subscribeToChannelBindingLifecycleEvents((event) => {
      if (event.type === "DELETED") {
        this.detachBinding(event.bindingId);
        return;
      }
      void this.reconcileBinding(event.binding);
    });
    void this.restoreLinksAndRecords();
  }

  async stop(): Promise<void> {
    this.started = false;
    this.bindingLifecycleUnsubscribe?.();
    this.bindingLifecycleUnsubscribe = null;
    this.recoveryScheduler.clearAll();
    this.processingChains.clear();
    this.registry.clear();
  }

  async attachAcceptedDispatch(input: AttachAcceptedDispatchInput): Promise<void> {
    const link = await this.attachLink({
      binding: input.binding,
      route: input.route,
      target: input.target,
      latestCorrelationMessageId: input.latestCorrelationMessageId,
    });
    if (!link) {
      return;
    }
    const record = await this.observeTurn(link, link.target, input.turnId);
    await this.tryRecoverRecord(record, 0);
  }

  async reconcileBinding(binding: ChannelBinding): Promise<void> {
    this.detachBinding(binding.id);
    const route = routeFromBinding(binding);
    const source = await this.messageReceiptService.findLatestAcceptedSourceForRoute(route);
    if (binding.targetType === "AGENT" && binding.agentRunId) {
      await this.attachLink({
        binding,
        route,
        target: { targetType: "AGENT", agentRunId: binding.agentRunId },
        latestCorrelationMessageId: source?.externalMessageId ?? null,
      });
      return;
    }
    if (binding.targetType !== "TEAM" || !binding.teamRunId) {
      return;
    }
    const teamRun = await this.teamRunService.resolveTeamRun(binding.teamRunId);
    if (!teamRun) {
      return;
    }
    const target = resolveTeamRunOutputTarget(binding, teamRun, null);
    if (target) {
      await this.attachLink({
        binding,
        route,
        target,
        latestCorrelationMessageId: source?.externalMessageId ?? null,
        resolvedTeamRun: teamRun,
      });
    }
  }

  detachBinding(bindingId: string): void {
    this.registry.detachBinding(bindingId);
  }

  private async restoreLinksAndRecords(): Promise<void> {
    try {
      const bindings = await this.bindingService.listBindings();
      await Promise.all(bindings.map((binding) => this.reconcileBinding(binding)));
      const records = await this.deliveryService.listRestorableRecords();
      for (const record of records) {
        if (record.status === "OBSERVING") {
          this.scheduleRecovery(record, 1);
        } else {
          await this.publishRecord(record);
        }
      }
    } catch (error) {
      console.error("Channel run output delivery runtime restore failed.", error);
    }
  }

  private async attachLink(input: {
    binding: ChannelBinding;
    route: ChannelOutputRoute;
    target: ChannelRunOutputTarget;
    latestCorrelationMessageId: string | null;
    resolvedTeamRun?: TeamRun;
  }): Promise<ChannelRunOutputLink | null> {
    if (input.target.targetType === "AGENT") {
      const run = await this.agentRunService.resolveAgentRun(input.target.agentRunId);
      if (!run) {
        return null;
      }
      return this.registry.upsert({
        ...input,
        unsubscribe: subscribeAgent(run, (event) => this.handleRuntimeEvent(input.binding.id, event)),
      });
    }

    const run = input.resolvedTeamRun ?? await this.teamRunService.resolveTeamRun(input.target.teamRunId);
    if (!run) {
      return null;
    }
    const target = resolveTeamRunOutputTarget(input.binding, run, input.target);
    if (!target) {
      return null;
    }
    return this.registry.upsert({
      ...input,
      target,
      unsubscribe: subscribeTeam(run, (event) => this.handleRuntimeEvent(input.binding.id, event)),
    });
  }

  private handleRuntimeEvent(bindingId: string, event: unknown): void {
    for (const link of this.registry.list().filter((item) => item.binding.id === bindingId)) {
      this.enqueueLinkTask(link.linkKey, async () => {
        const parsed = link.target.targetType === "AGENT"
          ? parseDirectChannelOutputEvent(event)
          : parseTeamChannelOutputEvent(event);
        if (!parsed) {
          return;
        }
        const eligible = this.eligibility.evaluate({ linkTarget: link.target, event: parsed });
        if (!eligible || !eligible.event.turnId) {
          return;
        }
        const record = await this.observeTurn(link, eligible.target, eligible.event.turnId);
        const final = this.collector.processEvent({
          deliveryKey: record.deliveryKey,
          event: eligible.event,
        });
        if (!final) {
          return;
        }
        const replyText = final.replyText ?? await this.recoverReplyText(record);
        if (!replyText) {
          this.scheduleRecovery(record, 1);
          return;
        }
        const finalized = await this.deliveryService.markReplyFinalized({
          deliveryKey: record.deliveryKey,
          replyTextFinal: replyText,
        });
        await this.publishRecord(finalized);
      });
    }
  }

  private async observeTurn(
    link: ChannelRunOutputLink,
    target: ChannelRunOutputTarget,
    turnId: string,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return this.deliveryService.upsertObservedTurn({
      bindingId: link.binding.id,
      route: link.route,
      target,
      turnId,
      correlationMessageId: link.latestCorrelationMessageId,
    });
  }

  private async tryRecoverRecord(
    record: ChannelRunOutputDeliveryRecord,
    attempt: number,
  ): Promise<void> {
    const replyText = await this.recoverReplyText(record);
    if (!replyText) {
      this.scheduleRecovery(record, attempt + 1);
      return;
    }
    const finalized = await this.deliveryService.markReplyFinalized({
      deliveryKey: record.deliveryKey,
      replyTextFinal: replyText,
    });
    await this.publishRecord(finalized);
  }

  private scheduleRecovery(record: ChannelRunOutputDeliveryRecord, attempt: number): void {
    this.recoveryScheduler.schedule(record, attempt, (current, scheduledAttempt) =>
      this.tryRecoverRecord(current, scheduledAttempt),
    );
  }

  private async recoverReplyText(record: ChannelRunOutputDeliveryRecord): Promise<string | null> {
    const agentRunId = record.target.targetType === "AGENT"
      ? record.target.agentRunId
      : record.target.entryMemberRunId;
    if (!agentRunId) {
      return null;
    }
    return this.turnReplyRecoveryService.resolveReplyText({
      agentRunId,
      teamRunId: record.target.targetType === "TEAM" ? record.target.teamRunId : null,
      turnId: record.turnId,
    });
  }

  private async publishRecord(record: ChannelRunOutputDeliveryRecord): Promise<void> {
    const result = await this.publisher.publishRecord(record);
    if (result !== "SKIPPED") {
      this.recoveryScheduler.clear(record.deliveryKey);
    }
  }

  private enqueueLinkTask(linkKey: string, task: () => Promise<void>): void {
    const previous = this.processingChains.get(linkKey) ?? Promise.resolve();
    const next = previous.then(task, task).catch((error) => {
      console.error(`Channel run output delivery task failed for '${linkKey}'.`, error);
    });
    this.processingChains.set(linkKey, next);
  }
}

const routeFromBinding = (binding: ChannelBinding): ChannelOutputRoute => ({
  provider: binding.provider,
  transport: binding.transport,
  accountId: binding.accountId,
  peerId: binding.peerId,
  threadId: binding.threadId,
});

const subscribeAgent = (run: AgentRun, listener: (event: unknown) => void): (() => void) =>
  run.subscribeToEvents(listener);

const subscribeTeam = (run: TeamRun, listener: (event: unknown) => void): (() => void) =>
  run.subscribeToEvents(listener);
