import {
  ApplicationAgentEventStreamSubscribeError,
  type ApplicationAgentEventStreamError,
  type ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";
import {
  ApplicationAgentTargetAuthorizationError,
} from "../../application-orchestration/services/application-agent-target-authorization-service.js";
import {
  ApplicationOrchestrationHostService,
  getApplicationOrchestrationHostService,
} from "../../application-orchestration/services/application-orchestration-host-service.js";
import {
  ApplicationAgentStreamingEstablishmentError,
  type ApplicationAgentStreamEmitter,
} from "../domain/application-agent-streaming-models.js";
import { ApplicationAgentEventMapper } from "./application-agent-stream-event-mapper.js";
import { ApplicationAgentStreamRuntimeSource } from "./application-agent-stream-runtime-source.js";
import { ApplicationAgentStreamSubscription } from "./application-agent-stream-subscription.js";

const keyFor = (applicationId: string, subscriptionId: string): string => `${applicationId}\u0000${subscriptionId}`;
export type PausedApplicationAgentStream = {
  beginReadyCommit: () => boolean;
  enableDrain: () => boolean;
  cancelPreReady: () => void;
  unsubscribe: (reason?: "UNSUBSCRIBED" | "ABORTED") => Promise<void>;
};

export class ApplicationAgentStreamingService {
  private static instance: ApplicationAgentStreamingService | null = null;
  static getInstance(dependencies: ConstructorParameters<typeof ApplicationAgentStreamingService>[0] = {}): ApplicationAgentStreamingService {
    if (!this.instance) this.instance = new ApplicationAgentStreamingService(dependencies);
    return this.instance;
  }
  static resetInstance(): void { this.instance = null; cachedApplicationAgentStreamingService = null; }
  private readonly subscriptions = new Map<string, ApplicationAgentStreamSubscription>();
  constructor(private readonly dependencies: {
    orchestrationHostService?: ApplicationOrchestrationHostService;
    runtimeSource?: ApplicationAgentStreamRuntimeSource;
    mapper?: ApplicationAgentEventMapper;
  } = {}) {}

  async subscribePaused(input: {
    applicationId: string;
    subscriptionId: string;
    address: ApplicationAgentTargetAddress;
    emitter: ApplicationAgentStreamEmitter;
    onPreReadyTerminal: () => void;
    onPreReadyFailure: (error: ApplicationAgentEventStreamError) => void;
  }): Promise<PausedApplicationAgentStream> {
    const key = keyFor(input.applicationId, input.subscriptionId);
    if (this.subscriptions.has(key)) throw new ApplicationAgentStreamingEstablishmentError("TRANSPORT_FAILED");
    const subscription = new ApplicationAgentStreamSubscription({
      ...input,
      orchestration: this.dependencies.orchestrationHostService ?? getApplicationOrchestrationHostService(),
      runtimeSource: this.dependencies.runtimeSource ?? new ApplicationAgentStreamRuntimeSource(),
      mapper: this.dependencies.mapper ?? new ApplicationAgentEventMapper(),
      onFinalized: () => { if (this.subscriptions.get(key) === subscription) this.subscriptions.delete(key); },
    });
    this.subscriptions.set(key, subscription);
    await subscription.establishPaused();
    return {
      beginReadyCommit: () => subscription.beginReadyCommit(),
      enableDrain: () => subscription.enableDrain(),
      cancelPreReady: () => subscription.cancelPreReady(),
      unsubscribe: (reason) => subscription.unsubscribe(reason),
    };
  }

  async subscribe(input: {
    applicationId: string;
    subscriptionId: string;
    address: ApplicationAgentTargetAddress;
    emitter: ApplicationAgentStreamEmitter;
  }): Promise<{ subscriptionId: string }> {
    let preReadyFailure: ApplicationAgentEventStreamError | null = null;
    let preReadyTerminal = false;
    let paused: PausedApplicationAgentStream;
    try {
      paused = await this.subscribePaused({
        ...input,
        onPreReadyTerminal: () => { preReadyTerminal = true; },
        onPreReadyFailure: (error) => { preReadyFailure = error; },
      });
    } catch (error) {
      throw mapEstablishmentError(error);
    }
    if (preReadyTerminal || preReadyFailure || !paused.beginReadyCommit() || !paused.enableDrain()) {
      paused.cancelPreReady();
      throw new ApplicationAgentEventStreamSubscribeError({
        code: preReadyTerminal ? "SUBSCRIPTION_NOT_AVAILABLE" : "WORKER_TRANSPORT_FAILED",
        message: preReadyTerminal
          ? "The application agent event stream is not available."
          : "The application agent event stream could not be established.",
        recoverable: true,
      });
    }
    return { subscriptionId: input.subscriptionId };
  }

  async unsubscribe(applicationId: string, subscriptionId: string, reason: "UNSUBSCRIBED" | "ABORTED" = "UNSUBSCRIBED"): Promise<void> {
    await this.subscriptions.get(keyFor(applicationId, subscriptionId))?.unsubscribe(reason);
  }
  stopApplication(applicationId: string): void {
    const prefix = `${applicationId}\u0000`;
    for (const [key, subscription] of this.subscriptions) if (key.startsWith(prefix)) subscription.stopForWorker();
  }

  async stopAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.subscriptions.values()).map((subscription) =>
        subscription.unsubscribe("ABORTED")),
    );
    this.subscriptions.clear();
  }
}

const mapEstablishmentError = (error: unknown): Error => {
  if (error instanceof ApplicationAgentEventStreamSubscribeError) return error;
  const code = error instanceof ApplicationAgentTargetAuthorizationError ? error.code
    : error instanceof ApplicationAgentStreamingEstablishmentError ? error.code : "TRANSPORT_FAILED";
  if (code === "INVALID_TARGET") return new ApplicationAgentEventStreamSubscribeError({
    code: "INVALID_STREAM_TARGET", message: "The application agent event stream target is invalid.", recoverable: false,
  });
  if (code === "RUNTIME_NOT_ACTIVE") return new ApplicationAgentEventStreamSubscribeError({
    code: "RUNTIME_NOT_ACTIVE", message: "The application agent runtime is not active.", recoverable: true,
  });
  if (code === "SUBSCRIPTION_ABORTED") return new ApplicationAgentEventStreamSubscribeError({
    code: "SUBSCRIPTION_ABORTED", message: "Application agent event stream subscription was aborted.", recoverable: true,
  });
  if (code === "APPLICATION_NOT_AVAILABLE" || code === "TARGET_NOT_AVAILABLE") return new ApplicationAgentEventStreamSubscribeError({
    code: "SUBSCRIPTION_NOT_AVAILABLE", message: "The application agent event stream is not available.", recoverable: true,
  });
  return new ApplicationAgentEventStreamSubscribeError({
    code: "WORKER_TRANSPORT_FAILED", message: "The application agent event stream could not be established.", recoverable: true,
  });
};

let cachedApplicationAgentStreamingService: ApplicationAgentStreamingService | null = null;
export const getApplicationAgentStreamingService = (): ApplicationAgentStreamingService => {
  if (!cachedApplicationAgentStreamingService) cachedApplicationAgentStreamingService = ApplicationAgentStreamingService.getInstance();
  return cachedApplicationAgentStreamingService;
};
