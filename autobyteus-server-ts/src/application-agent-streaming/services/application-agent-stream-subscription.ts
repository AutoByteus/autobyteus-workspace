import type {
  ApplicationAgentEvent,
  ApplicationAgentEventStreamClose,
  ApplicationAgentEventStreamError,
  ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationAgentTargetAuthorizationLease,
  AuthorizedApplicationAgentTargetDescriptor,
} from "../../application-orchestration/services/application-agent-target-authorization-service.js";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import {
  APPLICATION_AGENT_EVENT_QUEUE_LIMIT,
  APPLICATION_AGENT_EVENT_SERIALIZED_FRAME_LIMIT,
  ApplicationAgentStreamingEstablishmentError,
  type ApplicationAgentStreamEmitter,
  type ApplicationAgentStreamSourceEvent,
} from "../domain/application-agent-streaming-models.js";
import { ApplicationAgentEventMapper } from "./application-agent-stream-event-mapper.js";
import { ApplicationAgentStreamProjectionError } from "./application-agent-stream-event-projector.js";
import type { ApplicationExecutionStreaming } from "../../application-platform/execution/application-execution-scope-contracts.js";

type State =
  | "ESTABLISHING"
  | "ACTIVE_PAUSED"
  | "ACTIVE_DRAINING"
  | "DRAINING_TERMINAL"
  | "ESTABLISHMENT_FAILED"
  | "PRE_READY_TERMINAL"
  | "CLOSED";

export class ApplicationAgentStreamSubscription {
  private state: State = "ESTABLISHING";
  private lease: ApplicationAgentTargetAuthorizationLease | null = null;
  private descriptor: AuthorizedApplicationAgentTargetDescriptor | null = null;
  private releaseSource: (() => void) | null = null;
  private readonly queue: ApplicationAgentEvent[] = [];
  private nextSequence = 1;
  private draining = false;
  private finalized = false;
  private pendingFailure: ApplicationAgentStreamingEstablishmentError | null = null;
  private readyCommitStarted = false;

  constructor(private readonly input: {
    applicationId: string;
    address: ApplicationAgentTargetAddress;
    orchestration: Pick<ApplicationOrchestrationHostService, "openAgentEventStreamLease">;
    runtimeSource: ApplicationExecutionStreaming;
    mapper: ApplicationAgentEventMapper;
    emitter: ApplicationAgentStreamEmitter;
    onPreReadyTerminal: () => void;
    onPreReadyFailure: (error: ApplicationAgentEventStreamError) => void;
    onFinalized: () => void;
  }) {}

  async establishPaused(): Promise<void> {
    try {
      const lease = await this.input.orchestration.openAgentEventStreamLease(
        this.input.applicationId,
        this.input.address,
        () => this.onBindingEnded(),
      );
      if (this.state !== "ESTABLISHING") {
        lease.release();
        throw this.pendingFailure ?? new ApplicationAgentStreamingEstablishmentError("SUBSCRIPTION_ABORTED");
      }
      this.lease = lease;
      this.descriptor = lease.descriptor;
      const releaseSource = this.input.runtimeSource.attach(lease.descriptor.runtime, (event) => this.onSourceEvent(event));
      if (this.state !== "ESTABLISHING") {
        try { releaseSource(); } catch { /* idempotent cleanup */ }
        this.releaseAcquisitions();
        throw this.pendingFailure ?? new ApplicationAgentStreamingEstablishmentError("SUBSCRIPTION_ABORTED");
      }
      this.releaseSource = releaseSource;
      this.state = "ACTIVE_PAUSED";
    } catch (error) {
      if (this.state === "ESTABLISHING") this.state = "ESTABLISHMENT_FAILED";
      this.releaseAcquisitions();
      this.finalizeRegistry();
      if (error instanceof ApplicationAgentStreamingEstablishmentError) throw error;
      throw error;
    }
  }

  enableDrain(): boolean {
    if (this.state !== "ACTIVE_PAUSED" &&
        (this.state !== "PRE_READY_TERMINAL" || !this.readyCommitStarted)) return false;
    this.state = this.state === "PRE_READY_TERMINAL" ? "DRAINING_TERMINAL" : "ACTIVE_DRAINING";
    this.scheduleDrain();
    return true;
  }

  beginReadyCommit(): boolean {
    if (this.state !== "ACTIVE_PAUSED") return false;
    this.readyCommitStarted = true;
    return true;
  }

  cancelPreReady(): void {
    if (this.state !== "ESTABLISHING" && this.state !== "ACTIVE_PAUSED" && this.state !== "PRE_READY_TERMINAL") return;
    this.pendingFailure = new ApplicationAgentStreamingEstablishmentError("SUBSCRIPTION_ABORTED");
    this.state = "ESTABLISHMENT_FAILED";
    this.queue.length = 0;
    this.releaseAcquisitions();
    this.finalizeRegistry();
  }

  async unsubscribe(reason: "UNSUBSCRIBED" | "ABORTED" = "UNSUBSCRIBED"): Promise<void> {
    if (this.state === "CLOSED" || this.state === "ESTABLISHMENT_FAILED") return;
    if (this.state === "ESTABLISHING" || this.state === "ACTIVE_PAUSED" || this.state === "PRE_READY_TERMINAL") {
      this.cancelPreReady();
      return;
    }
    await this.closeEstablished(reason);
  }

  stopForWorker(): void {
    if (this.state === "ESTABLISHING" || this.state === "ACTIVE_PAUSED" || this.state === "PRE_READY_TERMINAL") {
      const shouldNotify = this.state !== "ESTABLISHING";
      this.pendingFailure = new ApplicationAgentStreamingEstablishmentError("TRANSPORT_FAILED");
      this.state = "ESTABLISHMENT_FAILED";
      this.queue.length = 0;
      this.releaseAcquisitions();
      this.finalizeRegistry();
      if (shouldNotify) this.input.onPreReadyFailure({
        code: "WORKER_TRANSPORT_FAILED",
        message: "The application agent event stream transport failed.",
        recoverable: true,
      });
      return;
    }
    void this.closeEstablished("WORKER_STOPPED");
  }

  private onSourceEvent(source: ApplicationAgentStreamSourceEvent): void {
    if ((this.state !== "ACTIVE_PAUSED" && this.state !== "ACTIVE_DRAINING") || !this.descriptor) return;
    try {
      const mapped = this.input.mapper.map(source);
      if (!mapped) return;
      if (this.queue.length >= APPLICATION_AGENT_EVENT_QUEUE_LIMIT) {
        this.failConsumer("BACKPRESSURE_LIMIT", "The application agent event stream exceeded its backpressure limit.");
        return;
      }
      const common = {
        applicationId: this.input.applicationId,
        address: structuredClone(this.descriptor.address),
        runtimeSubject: this.descriptor.runtime.subject,
        producer: mapped.producer,
        event: mapped.event,
      };
      const sizeProbe = JSON.stringify({
        sequence: Number.MAX_SAFE_INTEGER,
        observedAt: "9999-12-31T23:59:59.999Z",
        ...common,
      });
      if (Buffer.byteLength(sizeProbe, "utf8") > APPLICATION_AGENT_EVENT_SERIALIZED_FRAME_LIMIT) {
        this.failConsumer("EVENT_SERIALIZATION_FAILED", "The application agent event could not be serialized safely.");
        return;
      }
      const envelope: ApplicationAgentEvent = {
        sequence: this.nextSequence,
        observedAt: new Date().toISOString(),
        ...common,
      };
      this.queue.push(envelope);
      this.nextSequence += 1;
      if (this.state === "ACTIVE_DRAINING") this.scheduleDrain();
    } catch (error) {
      this.failConsumer(
        error instanceof ApplicationAgentStreamProjectionError ? "EVENT_MAPPING_FAILED" : "EVENT_SERIALIZATION_FAILED",
        error instanceof ApplicationAgentStreamProjectionError
          ? "The application agent event could not be projected safely."
          : "The application agent event could not be serialized safely.",
      );
    }
  }

  private onBindingEnded(): void {
    if (this.state === "ESTABLISHING") {
      this.pendingFailure = new ApplicationAgentStreamingEstablishmentError("TARGET_NOT_AVAILABLE");
      this.state = "ESTABLISHMENT_FAILED";
      this.releaseAcquisitions();
      this.finalizeRegistry();
      return;
    }
    if (this.state === "ACTIVE_PAUSED") {
      this.state = "PRE_READY_TERMINAL";
      this.releaseDataSource();
      this.input.onPreReadyTerminal();
      return;
    }
    if (this.state !== "ACTIVE_DRAINING") return;
    this.state = "DRAINING_TERMINAL";
    this.releaseDataSource();
    this.scheduleDrain();
  }

  private failConsumer(code: ApplicationAgentEventStreamError["code"], message: string): void {
    if (this.state === "ACTIVE_PAUSED") {
      const error = { code, message, recoverable: code === "BACKPRESSURE_LIMIT" } satisfies ApplicationAgentEventStreamError;
      this.state = "CLOSED";
      this.queue.length = 0;
      this.releaseAcquisitions();
      this.finalizeRegistry();
      this.input.onPreReadyFailure(error);
      return;
    }
    if (this.state !== "ACTIVE_DRAINING" && this.state !== "DRAINING_TERMINAL") return;
    this.state = "CLOSED";
    this.queue.length = 0;
    this.releaseAcquisitions();
    this.finalizeRegistry();
    queueMicrotask(async () => {
      try {
        await this.input.emitter.emitError({ code, message, recoverable: code === "BACKPRESSURE_LIMIT" });
        await this.input.emitter.emitClosed({ reason: "STREAM_FAILED" });
      } catch { /* transport failure owns its boundary */ }
    });
  }

  private scheduleDrain(): void {
    if (this.draining || (this.state !== "ACTIVE_DRAINING" && this.state !== "DRAINING_TERMINAL")) return;
    this.draining = true;
    queueMicrotask(() => { void this.drain(); });
  }
  private async drain(): Promise<void> {
    try {
      while ((this.state === "ACTIVE_DRAINING" || this.state === "DRAINING_TERMINAL") && this.queue.length > 0) {
        await this.input.emitter.emitEvent(this.queue.shift()!);
      }
      if (this.state === "DRAINING_TERMINAL" && this.queue.length === 0) await this.emitClose("BINDING_ENDED");
    } catch {
      this.failConsumer("WORKER_TRANSPORT_FAILED", "The application agent event stream transport failed.");
    } finally {
      this.draining = false;
      if ((this.state === "ACTIVE_DRAINING" || this.state === "DRAINING_TERMINAL") && this.queue.length > 0) this.scheduleDrain();
    }
  }
  private async closeEstablished(reason: ApplicationAgentEventStreamClose["reason"]): Promise<void> {
    if (this.state !== "ACTIVE_DRAINING" && this.state !== "DRAINING_TERMINAL") return;
    this.state = "CLOSED";
    this.queue.length = 0;
    this.releaseAcquisitions();
    this.finalizeRegistry();
    try { await this.input.emitter.emitClosed({ reason }); } catch { /* isolated */ }
  }
  private async emitClose(reason: ApplicationAgentEventStreamClose["reason"]): Promise<void> {
    if (this.state !== "DRAINING_TERMINAL") return;
    this.state = "CLOSED";
    this.releaseAcquisitions();
    this.finalizeRegistry();
    try { await this.input.emitter.emitClosed({ reason }); } catch { /* isolated */ }
  }
  private releaseDataSource(): void {
    const release = this.releaseSource;
    this.releaseSource = null;
    if (release) try { release(); } catch { /* idempotent */ }
  }
  private releaseAcquisitions(): void {
    this.releaseDataSource();
    const lease = this.lease;
    this.lease = null;
    if (lease) try { lease.release(); } catch { /* idempotent */ }
  }
  private finalizeRegistry(): void {
    if (this.finalized) return;
    this.finalized = true;
    this.input.onFinalized();
  }
}
