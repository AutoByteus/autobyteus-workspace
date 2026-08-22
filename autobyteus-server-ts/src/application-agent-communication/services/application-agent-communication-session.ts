import type {
  ApplicationAgentConnectionCloseReason,
  ApplicationAgentConnectionErrorCode,
  ApplicationAgentEventStreamClose,
  ApplicationAgentEventStreamError,
  ApplicationAgentInput,
  ApplicationAgentServerFrame,
  ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";
import { APPLICATION_AGENT_COMMUNICATION_PROTOCOL } from "@autobyteus/application-sdk-contracts";
import {
  ApplicationAgentStreamingEstablishmentError,
  type ApplicationAgentStreamEmitter,
} from "../../application-agent-streaming/domain/application-agent-streaming-models.js";
import {
  ApplicationAgentStreamingService,
  type PausedApplicationAgentStream,
} from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import {
  ApplicationAgentTargetAuthorizationError,
} from "../../application-orchestration/services/application-agent-target-authorization-service.js";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import {
  APPLICATION_AGENT_COMMUNICATION_CLIENT_FRAME_LIMIT,
  APPLICATION_AGENT_COMMUNICATION_SOCKET_BUFFER_LIMIT,
} from "../../application-communication-limits.js";
import {
  applicationAgentConnectionCloseCode,
  applicationAgentConnectionError,
  type ApplicationAgentCommunicationNetworkSocket,
} from "../domain/application-agent-communication-models.js";
import { parseApplicationAgentClientFrame } from "./application-agent-communication-frame-parser.js";

type State = "ESTABLISHING" | "READY_COMMIT_PENDING" | "READY_COMMITTING" | "OPEN" | "CLOSING" | "PRE_READY_FAILED" | "CLOSED";

const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");
class ApplicationAgentCommunicationWriteError extends Error {
  constructor(readonly code: "BACKPRESSURE_LIMIT" | "EVENT_SERIALIZATION_FAILED") {
    super(code);
  }
}

export class ApplicationAgentCommunicationSession {
  private state: State = "ESTABLISHING";
  private pausedStream: PausedApplicationAgentStream | null = null;
  private readonly pendingRequestIds = new Set<string>();
  private finalized = false;
  private lastStreamErrorCode: ApplicationAgentConnectionErrorCode | null = null;
  private readyCommitFailure: ApplicationAgentConnectionErrorCode | null = null;
  private transportClosedDuringReadyCommit = false;

  constructor(private readonly input: {
    sessionId: string;
    applicationId: string;
    address: ApplicationAgentTargetAddress;
    socket: ApplicationAgentCommunicationNetworkSocket;
    streaming: ApplicationAgentStreamingService;
    orchestration: Pick<ApplicationOrchestrationHostService, "sendRunInput">;
    onFinalized: () => void;
  }) {
    input.socket.on("message", (data, isBinary) => this.receive(data, isBinary === true));
    input.socket.on("close", () => this.onTransportClosed());
    input.socket.on("error", () => this.onTransportFailed());
  }

  async establish(): Promise<void> {
    const emitter: ApplicationAgentStreamEmitter = {
      emitEvent: async (event) => {
        try { this.write({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: "EVENT", event }); }
        catch (error) { this.failForWrite(error); throw error; }
      },
      emitError: async (error) => this.onStreamError(error),
      emitClosed: async (close) => this.onStreamClosed(close),
    };
    try {
      const paused = await this.input.streaming.subscribePaused({
        applicationId: this.input.applicationId,
        subscriptionId: this.input.sessionId,
        address: this.input.address,
        emitter,
        onPreReadyTerminal: () => this.onPreReadyTerminal(),
        onPreReadyFailure: (error) => this.onPreReadyFailure(error),
      });
      if (this.state !== "ESTABLISHING") {
        paused.cancelPreReady();
        return;
      }
      this.pausedStream = paused;
      this.state = "READY_COMMIT_PENDING";
      this.commitReady();
    } catch (error) {
      this.failBeforeReady(mapEstablishmentError(error));
    }
  }

  abort(): void {
    this.finish("ABORTED", true);
  }

  private commitReady(): void {
    if (this.state !== "READY_COMMIT_PENDING" || !this.pausedStream) return;
    if (!this.pausedStream.beginReadyCommit()) {
      this.failBeforeReady("TARGET_NOT_AVAILABLE");
      return;
    }
    this.state = "READY_COMMITTING";
    try {
      this.write({
        protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
        type: "READY",
        address: structuredClone(this.input.address),
      });
      this.state = "OPEN";
      const drainEnabled = this.pausedStream.enableDrain();
      if (this.transportClosedDuringReadyCommit) {
        this.onTransportClosed();
        return;
      }
      if (this.readyCommitFailure) {
        const code = this.readyCommitFailure;
        this.readyCommitFailure = null;
        const reason: ApplicationAgentConnectionCloseReason = code === "BACKPRESSURE_LIMIT"
          ? "BACKPRESSURE_LIMIT"
          : code === "EVENT_MAPPING_FAILED" || code === "EVENT_SERIALIZATION_FAILED"
            ? "STREAM_FAILED"
            : "TRANSPORT_FAILED";
        this.failOpen(code, reason);
        return;
      }
      if (!drainEnabled) this.failOpen("TRANSPORT_FAILED", "TRANSPORT_FAILED");
    } catch (error) {
      this.state = "READY_COMMIT_PENDING";
      this.failBeforeReady(mapWriteError(error));
    }
  }

  private receive(data: unknown, isBinary: boolean): void {
    if (this.state === "CLOSED" || this.state === "CLOSING") return;
    const frame = parseApplicationAgentClientFrame(data, isBinary);
    if (!frame) return this.protocolFailure();
    if (this.state !== "OPEN" || this.pendingRequestIds.has(frame.requestId)) return this.protocolFailure();
    this.pendingRequestIds.add(frame.requestId);
    void this.deliverInput(frame.requestId, frame.input);
  }

  private async deliverInput(requestId: string, input: ApplicationAgentInput): Promise<void> {
    let accepted = false;
    try {
      await this.input.orchestration.sendRunInput(this.input.applicationId, {
        address: this.input.address,
        input,
      });
      accepted = true;
    } catch { /* correlated rejection below */ }
    try {
      if (this.state === "OPEN") this.write(accepted
        ? { protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: "INPUT_ACCEPTED", requestId }
        : {
            protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
            type: "INPUT_REJECTED",
            requestId,
            error: applicationAgentConnectionError("INPUT_REJECTED"),
          });
    } catch (error) {
      this.failForWrite(error);
    } finally {
      this.pendingRequestIds.delete(requestId);
    }
  }

  private onStreamError(error: ApplicationAgentEventStreamError): void {
    if (this.state !== "OPEN") return this.failBeforeReady(mapStreamError(error));
    const code = mapStreamError(error);
    this.lastStreamErrorCode = code;
    try { this.write({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: "ERROR", error: applicationAgentConnectionError(code) }); }
    catch (writeError) { this.failForWrite(writeError); }
  }

  private onPreReadyTerminal(): void {
    if (this.state === "READY_COMMITTING") return;
    this.failBeforeReady("TARGET_NOT_AVAILABLE");
  }

  private onPreReadyFailure(error: ApplicationAgentEventStreamError): void {
    const code = mapStreamError(error);
    if (this.state === "READY_COMMITTING") {
      this.readyCommitFailure = code;
      return;
    }
    this.failBeforeReady(code);
  }

  private onStreamClosed(close: ApplicationAgentEventStreamClose): void {
    if (this.state !== "OPEN") return this.failBeforeReady("TARGET_NOT_AVAILABLE");
    if (close.reason === "BINDING_ENDED") return this.finish("BINDING_ENDED", true);
    if (close.reason === "STREAM_FAILED") {
      return this.finish(this.lastStreamErrorCode === "BACKPRESSURE_LIMIT" ? "BACKPRESSURE_LIMIT" : "STREAM_FAILED", true);
    }
    if (close.reason === "ABORTED" || close.reason === "UNSUBSCRIBED") return this.finish("ABORTED", true);
    this.finish("TRANSPORT_FAILED", true);
  }

  private failBeforeReady(code: ApplicationAgentConnectionErrorCode): void {
    if (this.state !== "ESTABLISHING" && this.state !== "READY_COMMIT_PENDING") return;
    this.state = "PRE_READY_FAILED";
    this.safeWrite({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: "ERROR", error: applicationAgentConnectionError(code) });
    this.finish(code === "BACKPRESSURE_LIMIT" ? "BACKPRESSURE_LIMIT" : code === "TRANSPORT_FAILED" ? "TRANSPORT_FAILED" : "ESTABLISHMENT_FAILED", true);
  }

  private failOpen(code: ApplicationAgentConnectionErrorCode, reason: ApplicationAgentConnectionCloseReason): void {
    if (this.state !== "OPEN") return;
    this.safeWrite({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: "ERROR", error: applicationAgentConnectionError(code) });
    this.finish(reason, true);
  }

  private protocolFailure(): void {
    if (this.state === "OPEN") this.failOpen("PROTOCOL_ERROR", "PROTOCOL_ERROR");
    else this.failBeforeReady("PROTOCOL_ERROR");
  }

  private onTransportClosed(): void {
    if (this.state === "READY_COMMITTING") {
      this.transportClosedDuringReadyCommit = true;
      return;
    }
    if (this.state === "CLOSED") return;
    this.pausedStream?.cancelPreReady();
    void this.pausedStream?.unsubscribe("ABORTED");
    this.state = "CLOSED";
    this.finalize();
  }

  private onTransportFailed(): void {
    if (this.state === "READY_COMMITTING") {
      this.readyCommitFailure = "TRANSPORT_FAILED";
      return;
    }
    if (this.state === "OPEN") this.failOpen("TRANSPORT_FAILED", "TRANSPORT_FAILED");
    else this.failBeforeReady("TRANSPORT_FAILED");
  }

  private finish(reason: ApplicationAgentConnectionCloseReason, notify: boolean): void {
    if (this.state === "CLOSED" || this.state === "CLOSING") return;
    this.state = "CLOSING";
    if (notify) this.safeWrite({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: "CLOSED", close: { reason } });
    this.pausedStream?.cancelPreReady();
    void this.pausedStream?.unsubscribe(reason === "ABORTED" ? "ABORTED" : "UNSUBSCRIBED");
    try { this.input.socket.close(applicationAgentConnectionCloseCode(reason), safeSocketReason(reason)); } catch { /* isolated */ }
    this.state = "CLOSED";
    this.finalize();
  }

  private write(frame: ApplicationAgentServerFrame): void {
    if ((this.input.socket.bufferedAmount ?? 0) > APPLICATION_AGENT_COMMUNICATION_SOCKET_BUFFER_LIMIT) {
      throw new ApplicationAgentCommunicationWriteError("BACKPRESSURE_LIMIT");
    }
    const serialized = JSON.stringify(frame);
    if (byteLength(serialized) > APPLICATION_AGENT_COMMUNICATION_CLIENT_FRAME_LIMIT) {
      throw new ApplicationAgentCommunicationWriteError("EVENT_SERIALIZATION_FAILED");
    }
    this.input.socket.send(serialized);
  }

  private safeWrite(frame: ApplicationAgentServerFrame): void {
    try { this.write(frame); } catch { /* transport is already failing */ }
  }

  private failForWrite(error: unknown): void {
    const code = mapWriteError(error);
    const reason: ApplicationAgentConnectionCloseReason = code === "BACKPRESSURE_LIMIT"
      ? "BACKPRESSURE_LIMIT"
      : code === "EVENT_SERIALIZATION_FAILED"
        ? "STREAM_FAILED"
        : "TRANSPORT_FAILED";
    if (this.state === "OPEN") this.failOpen(code, reason);
    else this.failBeforeReady(code);
  }

  private finalize(): void {
    if (this.finalized) return;
    this.finalized = true;
    this.pendingRequestIds.clear();
    this.input.onFinalized();
  }
}

const mapEstablishmentError = (error: unknown): ApplicationAgentConnectionErrorCode => {
  if (error instanceof ApplicationAgentTargetAuthorizationError) return error.code;
  if (error instanceof ApplicationAgentStreamingEstablishmentError) {
    if (error.code === "RUNTIME_NOT_ACTIVE") return "RUNTIME_NOT_ACTIVE";
    if (error.code === "TARGET_NOT_AVAILABLE") return "TARGET_NOT_AVAILABLE";
  }
  return "TRANSPORT_FAILED";
};
const mapStreamError = (error: ApplicationAgentEventStreamError): ApplicationAgentConnectionErrorCode =>
  error.code === "WORKER_TRANSPORT_FAILED" ? "TRANSPORT_FAILED" : error.code;
const mapWriteError = (error: unknown): ApplicationAgentConnectionErrorCode =>
  error instanceof ApplicationAgentCommunicationWriteError ? error.code : "TRANSPORT_FAILED";
const safeSocketReason = (reason: ApplicationAgentConnectionCloseReason): string =>
  reason.replaceAll("_", " ").toLowerCase().slice(0, 123);
