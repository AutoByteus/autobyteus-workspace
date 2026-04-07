import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
} from "../domain/models.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import {
  logger,
  PENDING_TURN_TTL_MS,
  parseDirectAgentRunEvent,
  parseTeamAgentRunEvent,
} from "./channel-reply-bridge-support.js";
import { serializeReceiptKey, toReceiptKey } from "./accepted-receipt-key.js";
import type { RuntimeEventSubscription } from "./channel-run-dispatch-hooks.js";
import { persistAcceptedReceiptCorrelation } from "./accepted-receipt-correlation-persistence.js";
import type {
  AcceptedDispatchTurnCapture,
  AcceptedTurnCorrelation,
} from "./accepted-receipt-recovery-runtime-contract.js";

type AcceptedReceiptDispatchTurnCaptureRegistryDependencies = {
  messageReceiptService: ChannelMessageReceiptService;
  scheduleProcessing: (key: ChannelIngressReceiptKey, delayMs: number) => void;
  retryDelayMs: number;
};

type PendingDispatchTurnCaptureDependencies = {
  messageReceiptService: ChannelMessageReceiptService;
  retryDelayMs: number;
  pendingDispatchCaptureReceiptKeys: Set<string>;
  scheduleProcessing: (key: ChannelIngressReceiptKey, delayMs: number) => void;
  subscribeToEvents: RuntimeEventSubscription;
  buildCorrelation: (event: unknown) => AcceptedTurnCorrelation | null;
  label: string;
  onDispose: () => void;
};

export class AcceptedReceiptDispatchTurnCaptureRegistry {
  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly scheduleProcessing: (
    key: ChannelIngressReceiptKey,
    delayMs: number,
  ) => void;
  private readonly retryDelayMs: number;
  private readonly pendingDispatchCaptureReceiptKeys = new Set<string>();
  private readonly pendingDispatchTurnCaptures = new Set<PendingDispatchTurnCapture>();

  constructor(
    deps: AcceptedReceiptDispatchTurnCaptureRegistryDependencies,
  ) {
    this.messageReceiptService = deps.messageReceiptService;
    this.scheduleProcessing = deps.scheduleProcessing;
    this.retryDelayMs = deps.retryDelayMs;
  }

  stop(): void {
    for (const capture of this.pendingDispatchTurnCaptures) {
      capture.dispose();
    }
    this.pendingDispatchTurnCaptures.clear();
    this.pendingDispatchCaptureReceiptKeys.clear();
  }

  createDirectDispatchTurnCapture(
    agentRunId: string,
    subscribeToEvents: RuntimeEventSubscription,
  ): AcceptedDispatchTurnCapture {
    const capture = new PendingDispatchTurnCapture({
      messageReceiptService: this.messageReceiptService,
      retryDelayMs: this.retryDelayMs,
      pendingDispatchCaptureReceiptKeys: this.pendingDispatchCaptureReceiptKeys,
      scheduleProcessing: this.scheduleProcessing,
      subscribeToEvents,
      buildCorrelation: (event) => {
        const parsed = parseDirectAgentRunEvent(event);
        if (
          !parsed ||
          parsed.eventType !== AgentRunEventType.TURN_STARTED ||
          !parsed.turnId
        ) {
          return null;
        }
        return {
          agentRunId,
          teamRunId: null,
          turnId: parsed.turnId,
        };
      },
      label: `direct accepted-dispatch turn capture for run '${agentRunId}'`,
      onDispose: () => {
        this.pendingDispatchTurnCaptures.delete(capture);
      },
    });
    this.pendingDispatchTurnCaptures.add(capture);
    return capture;
  }

  createTeamDispatchTurnCapture(
    teamRunId: string,
    subscribeToEvents: RuntimeEventSubscription,
  ): AcceptedDispatchTurnCapture {
    const capture = new PendingDispatchTurnCapture({
      messageReceiptService: this.messageReceiptService,
      retryDelayMs: this.retryDelayMs,
      pendingDispatchCaptureReceiptKeys: this.pendingDispatchCaptureReceiptKeys,
      scheduleProcessing: this.scheduleProcessing,
      subscribeToEvents,
      buildCorrelation: (event) => {
        const parsed = parseTeamAgentRunEvent(event);
        if (
          !parsed ||
          parsed.eventType !== AgentRunEventType.TURN_STARTED ||
          !parsed.turnId ||
          !parsed.memberRunId
        ) {
          return null;
        }
        return {
          agentRunId: parsed.memberRunId,
          teamRunId,
          turnId: parsed.turnId,
        };
      },
      label: `team accepted-dispatch turn capture for run '${teamRunId}'`,
      onDispose: () => {
        this.pendingDispatchTurnCaptures.delete(capture);
      },
    });
    this.pendingDispatchTurnCaptures.add(capture);
    return capture;
  }

  hasPendingDispatchTurnCapture(receipt: ChannelMessageReceipt): boolean {
    return this.pendingDispatchCaptureReceiptKeys.has(
      serializeReceiptKey(toReceiptKey(receipt)),
    );
  }
}

class PendingDispatchTurnCapture implements AcceptedDispatchTurnCapture {
  private readonly messageReceiptService: ChannelMessageReceiptService;
  private readonly retryDelayMs: number;
  private readonly pendingDispatchCaptureReceiptKeys: Set<string>;
  private readonly scheduleProcessing: (
    key: ChannelIngressReceiptKey,
    delayMs: number,
  ) => void;
  private readonly label: string;
  private readonly unsubscribe: () => void;
  private readonly timeoutTimer: ReturnType<typeof setTimeout>;
  private readonly onDispose: () => void;
  private processing: Promise<void> = Promise.resolve();
  private disposed = false;
  private attachedReceipt: ChannelMessageReceipt | null = null;
  private attachedReceiptKey: string | null = null;
  private capturedCorrelation: AcceptedTurnCorrelation | null = null;

  constructor(deps: PendingDispatchTurnCaptureDependencies) {
    this.messageReceiptService = deps.messageReceiptService;
    this.retryDelayMs = deps.retryDelayMs;
    this.pendingDispatchCaptureReceiptKeys = deps.pendingDispatchCaptureReceiptKeys;
    this.scheduleProcessing = deps.scheduleProcessing;
    this.label = deps.label;
    this.onDispose = deps.onDispose;
    this.unsubscribe = deps.subscribeToEvents((event: unknown) => {
      if (this.disposed || this.capturedCorrelation) {
        return;
      }
      const correlation = deps.buildCorrelation(event);
      if (!correlation) {
        return;
      }
      this.capturedCorrelation = correlation;
      this.enqueue(async () => {
        if (this.disposed || !this.attachedReceipt) {
          return;
        }
        if (this.attachedReceipt.turnId) {
          this.scheduleProcessing(toReceiptKey(this.attachedReceipt), 0);
          this.dispose();
          return;
        }
        await this.persistCapturedCorrelation();
      });
    });
    this.timeoutTimer = setTimeout(() => {
      void this.enqueue(async () => {
        if (this.disposed) {
          return;
        }
        if (this.attachedReceipt && !this.attachedReceipt.turnId) {
          this.scheduleProcessing(
            toReceiptKey(this.attachedReceipt),
            this.retryDelayMs,
          );
        }
        this.dispose();
      });
    }, PENDING_TURN_TTL_MS);
    if (typeof (this.timeoutTimer as { unref?: () => void }).unref === "function") {
      (this.timeoutTimer as { unref: () => void }).unref();
    }
  }

  consumeCapturedCorrelation(): AcceptedTurnCorrelation | null {
    return this.capturedCorrelation;
  }

  async attachAcceptedReceipt(receipt: ChannelMessageReceipt): Promise<void> {
    this.attachedReceipt = receipt;
    this.attachedReceiptKey = serializeReceiptKey(toReceiptKey(receipt));
    if (!receipt.turnId) {
      this.pendingDispatchCaptureReceiptKeys.add(this.attachedReceiptKey);
    }
    await this.enqueue(async () => {
      if (this.disposed || !this.attachedReceipt) {
        return;
      }
      if (this.attachedReceipt.turnId) {
        this.scheduleProcessing(toReceiptKey(this.attachedReceipt), 0);
        this.dispose();
        return;
      }
      if (!this.capturedCorrelation) {
        return;
      }
      await this.persistCapturedCorrelation();
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.attachedReceiptKey) {
      this.pendingDispatchCaptureReceiptKeys.delete(this.attachedReceiptKey);
    }
    clearTimeout(this.timeoutTimer);
    try {
      this.unsubscribe();
    } catch {
      // ignore cleanup failures
    }
    this.onDispose();
  }

  private enqueue(work: () => Promise<void>): Promise<void> {
    this.processing = this.processing
      .then(work)
      .catch((error) => {
        logger.error(
          `Accepted receipt recovery runtime ${this.label} failed: ${String(error)}`,
        );
      });
    return this.processing;
  }

  private async persistCapturedCorrelation(): Promise<void> {
    if (this.disposed || !this.attachedReceipt || !this.capturedCorrelation) {
      return;
    }

    await persistAcceptedReceiptCorrelation({
      messageReceiptService: this.messageReceiptService,
      scheduleProcessing: this.scheduleProcessing,
      retryDelayMs: this.retryDelayMs,
      receipt: this.attachedReceipt,
      correlation: this.capturedCorrelation,
      failureLabel: "dispatch-scoped correlation update skipped",
    });
    this.dispose();
  }
}
