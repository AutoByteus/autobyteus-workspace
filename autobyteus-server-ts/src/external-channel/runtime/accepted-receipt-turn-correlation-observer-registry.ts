import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
} from "../domain/models.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import {
  logger,
  parseDirectAgentRunEvent,
  parseTeamAgentRunEvent,
} from "./channel-reply-bridge-support.js";
import {
  compareAcceptedReceiptsOldestFirst,
  type TurnCorrelationObserver,
} from "./accepted-receipt-key.js";
import { persistAcceptedReceiptCorrelation } from "./accepted-receipt-correlation-persistence.js";
import type { AcceptedTurnCorrelation } from "./accepted-receipt-recovery-runtime-contract.js";

type AcceptedReceiptTurnCorrelationObserverRegistryDependencies = {
  messageReceiptService: ChannelMessageReceiptService;
  agentRunService: AgentRunService;
  teamRunService: TeamRunService;
  scheduleProcessing: (key: ChannelIngressReceiptKey, delayMs: number) => void;
  retryDelayMs: number;
};

export class AcceptedReceiptTurnCorrelationObserverRegistry {
  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly agentRunService: AgentRunService;
  private readonly teamRunService: TeamRunService;
  private readonly scheduleProcessing: (
    key: ChannelIngressReceiptKey,
    delayMs: number,
  ) => void;
  private readonly retryDelayMs: number;
  private readonly directTurnCorrelationObservers = new Map<
    string,
    TurnCorrelationObserver
  >();
  private readonly teamTurnCorrelationObservers = new Map<
    string,
    TurnCorrelationObserver
  >();

  constructor(
    deps: AcceptedReceiptTurnCorrelationObserverRegistryDependencies,
  ) {
    this.messageReceiptService = deps.messageReceiptService;
    this.agentRunService = deps.agentRunService;
    this.teamRunService = deps.teamRunService;
    this.scheduleProcessing = deps.scheduleProcessing;
    this.retryDelayMs = deps.retryDelayMs;
  }

  stop(): void {
    this.closeTurnCorrelationObservers(this.directTurnCorrelationObservers);
    this.closeTurnCorrelationObservers(this.teamTurnCorrelationObservers);
  }

  async ensureObservationForReceipt(
    receipt: ChannelMessageReceipt,
  ): Promise<boolean> {
    if (receipt.teamRunId) {
      if (!receipt.agentRunId) {
        return false;
      }
      return this.ensureTeamTurnCorrelationObserver(receipt.teamRunId);
    }

    if (!receipt.agentRunId) {
      return false;
    }
    return this.ensureDirectTurnCorrelationObserver(receipt.agentRunId);
  }

  private async ensureDirectTurnCorrelationObserver(
    agentRunId: string,
  ): Promise<boolean> {
    if (this.directTurnCorrelationObservers.has(agentRunId)) {
      return true;
    }

    const agentRun = await this.agentRunService.resolveAgentRun(agentRunId);
    if (!agentRun) {
      return false;
    }

    const observer: TurnCorrelationObserver = {
      unsubscribe: () => undefined,
      processing: Promise.resolve(),
    };
    observer.unsubscribe = agentRun.subscribeToEvents((event: unknown) => {
      const parsed = parseDirectAgentRunEvent(event);
      const turnId = parsed?.turnId ?? null;
      if (!parsed || parsed.eventType !== AgentRunEventType.TURN_STARTED || !turnId) {
        return;
      }
      this.queueObserverTask(
        this.directTurnCorrelationObservers,
        agentRunId,
        `direct turn correlation for run '${agentRunId}'`,
        () => this.bindOldestAcceptedDirectReceipt(agentRunId, turnId),
      );
    });
    this.directTurnCorrelationObservers.set(agentRunId, observer);
    return true;
  }

  private async ensureTeamTurnCorrelationObserver(
    teamRunId: string,
  ): Promise<boolean> {
    if (this.teamTurnCorrelationObservers.has(teamRunId)) {
      return true;
    }

    const teamRun = await this.teamRunService.resolveTeamRun(teamRunId);
    if (!teamRun) {
      return false;
    }

    const observer: TurnCorrelationObserver = {
      unsubscribe: () => undefined,
      processing: Promise.resolve(),
    };
    observer.unsubscribe = teamRun.subscribeToEvents((event: unknown) => {
      const parsed = parseTeamAgentRunEvent(event);
      const turnId = parsed?.turnId ?? null;
      const memberRunId = parsed?.memberRunId ?? null;
      if (
        !parsed ||
        parsed.eventType !== AgentRunEventType.TURN_STARTED ||
        !turnId ||
        !memberRunId
      ) {
        return;
      }
      this.queueObserverTask(
        this.teamTurnCorrelationObservers,
        teamRunId,
        `team turn correlation for run '${teamRunId}'`,
        () => this.bindOldestAcceptedTeamReceipt(teamRunId, memberRunId, turnId),
      );
    });
    this.teamTurnCorrelationObservers.set(teamRunId, observer);
    return true;
  }

  private queueObserverTask(
    observers: Map<string, TurnCorrelationObserver>,
    observerKey: string,
    label: string,
    work: () => Promise<void>,
  ): void {
    const observer = observers.get(observerKey);
    if (!observer) {
      return;
    }
    observer.processing = observer.processing
      .then(work)
      .catch((error) => {
        logger.error(
          `Accepted receipt recovery runtime ${label} failed: ${String(error)}`,
        );
      });
  }

  private async bindOldestAcceptedDirectReceipt(
    agentRunId: string,
    turnId: string,
  ): Promise<void> {
    const receipt = await this.findOldestAcceptedReceipt((candidate) => {
      return (
        candidate.ingressState === "ACCEPTED" &&
        !candidate.teamRunId &&
        candidate.agentRunId === agentRunId &&
        !candidate.turnId
      );
    });
    if (!receipt) {
      this.finishTurnCorrelationObserver(
        this.directTurnCorrelationObservers,
        agentRunId,
      );
      return;
    }

    await this.persistCorrelation(receipt, {
      agentRunId,
      teamRunId: null,
      turnId,
    });
    await this.disposeTurnCorrelationObserverIfNoPendingReceipt(
      this.directTurnCorrelationObservers,
      agentRunId,
      (candidate) =>
        !candidate.teamRunId &&
        candidate.agentRunId === agentRunId &&
        !candidate.turnId,
    );
  }

  private async bindOldestAcceptedTeamReceipt(
    teamRunId: string,
    memberRunId: string,
    turnId: string,
  ): Promise<void> {
    const receipt = await this.findOldestAcceptedReceipt((candidate) => {
      return (
        candidate.ingressState === "ACCEPTED" &&
        candidate.teamRunId === teamRunId &&
        candidate.agentRunId === memberRunId &&
        !candidate.turnId
      );
    });
    if (!receipt) {
      this.finishTurnCorrelationObserver(
        this.teamTurnCorrelationObservers,
        teamRunId,
      );
      return;
    }

    await this.persistCorrelation(receipt, {
      agentRunId: memberRunId,
      teamRunId,
      turnId,
    });
    await this.disposeTurnCorrelationObserverIfNoPendingReceipt(
      this.teamTurnCorrelationObservers,
      teamRunId,
      (candidate) => candidate.teamRunId === teamRunId && !candidate.turnId,
    );
  }

  private async findOldestAcceptedReceipt(
    predicate: (receipt: ChannelMessageReceipt) => boolean,
  ): Promise<ChannelMessageReceipt | null> {
    const receipts =
      await this.messageReceiptService.listReceiptsByIngressState("ACCEPTED");
    const candidates = receipts.filter(predicate).sort(compareAcceptedReceiptsOldestFirst);
    return candidates[0] ?? null;
  }

  private async persistCorrelation(
    receipt: ChannelMessageReceipt,
    correlation: AcceptedTurnCorrelation,
  ): Promise<void> {
    await persistAcceptedReceiptCorrelation({
      messageReceiptService: this.messageReceiptService,
      scheduleProcessing: this.scheduleProcessing,
      retryDelayMs: this.retryDelayMs,
      receipt,
      correlation,
      failureLabel: "correlation update skipped",
    });
  }

  private async disposeTurnCorrelationObserverIfNoPendingReceipt(
    observers: Map<string, TurnCorrelationObserver>,
    observerKey: string,
    predicate: (receipt: ChannelMessageReceipt) => boolean,
  ): Promise<void> {
    const pendingReceipt = await this.findOldestAcceptedReceipt(predicate);
    if (!pendingReceipt) {
      this.finishTurnCorrelationObserver(observers, observerKey);
    }
  }

  private closeTurnCorrelationObservers(
    observers: Map<string, TurnCorrelationObserver>,
  ): void {
    for (const observerKey of observers.keys()) {
      this.finishTurnCorrelationObserver(observers, observerKey);
    }
  }

  private finishTurnCorrelationObserver(
    observers: Map<string, TurnCorrelationObserver>,
    observerKey: string,
  ): void {
    const observer = observers.get(observerKey);
    if (!observer) {
      return;
    }
    observers.delete(observerKey);
    try {
      observer.unsubscribe();
    } catch {
      // ignore cleanup failures
    }
  }
}
