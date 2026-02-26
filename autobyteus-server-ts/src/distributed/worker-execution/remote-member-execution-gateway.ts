import type { RunVersion, TeamEnvelope } from "../envelope/envelope-builder.js";

const missingHandlerError = (kind: string): Error =>
  new Error(`Remote member execution handler is not configured for envelope kind '${kind}'.`);

export type RemoteExecutionEvent = {
  teamRunId: string;
  runVersion: RunVersion;
  sourceNodeId: string;
  sourceEventId: string;
  memberName: string;
  agentId?: string | null;
  eventType: string;
  payload: unknown;
};

export type RemoteMemberExecutionGatewayDependencies = {
  dispatchRunBootstrap?: (envelope: TeamEnvelope) => Promise<void>;
  dispatchUserMessage?: (envelope: TeamEnvelope) => Promise<void>;
  dispatchInterAgentMessage?: (envelope: TeamEnvelope) => Promise<void>;
  dispatchToolApproval?: (envelope: TeamEnvelope) => Promise<void>;
  dispatchControlStop?: (envelope: TeamEnvelope) => Promise<void>;
  publishEventToHost?: (event: RemoteExecutionEvent) => Promise<void>;
};

export class RemoteMemberExecutionGateway {
  private readonly deps: RemoteMemberExecutionGatewayDependencies;

  constructor(deps: RemoteMemberExecutionGatewayDependencies = {}) {
    this.deps = deps;
  }

  async dispatchEnvelope(envelope: TeamEnvelope): Promise<void> {
    switch (envelope.kind) {
      case "RUN_BOOTSTRAP":
        await this.dispatchRunBootstrap(envelope);
        return;
      case "USER_MESSAGE":
        await this.dispatchUserMessage(envelope);
        return;
      case "INTER_AGENT_MESSAGE_REQUEST":
        await this.dispatchInterAgentMessage(envelope);
        return;
      case "TOOL_APPROVAL":
        await this.dispatchToolApproval(envelope);
        return;
      case "CONTROL_STOP":
        await this.dispatchControlStop(envelope);
        return;
      default:
        throw new Error(`Unsupported remote execution envelope kind '${envelope.kind}'.`);
    }
  }

  async dispatchRunBootstrap(envelope: TeamEnvelope): Promise<void> {
    if (!this.deps.dispatchRunBootstrap) {
      throw missingHandlerError(envelope.kind);
    }
    await this.deps.dispatchRunBootstrap(envelope);
  }

  async dispatchUserMessage(envelope: TeamEnvelope): Promise<void> {
    if (!this.deps.dispatchUserMessage) {
      throw missingHandlerError(envelope.kind);
    }
    await this.deps.dispatchUserMessage(envelope);
  }

  async dispatchInterAgentMessage(envelope: TeamEnvelope): Promise<void> {
    if (!this.deps.dispatchInterAgentMessage) {
      throw missingHandlerError(envelope.kind);
    }
    await this.deps.dispatchInterAgentMessage(envelope);
  }

  async dispatchToolApproval(envelope: TeamEnvelope): Promise<void> {
    if (!this.deps.dispatchToolApproval) {
      throw missingHandlerError(envelope.kind);
    }
    await this.deps.dispatchToolApproval(envelope);
  }

  async dispatchControlStop(envelope: TeamEnvelope): Promise<void> {
    if (!this.deps.dispatchControlStop) {
      throw missingHandlerError(envelope.kind);
    }
    await this.deps.dispatchControlStop(envelope);
  }

  async emitMemberEvent(event: RemoteExecutionEvent): Promise<void> {
    if (!this.deps.publishEventToHost) {
      throw new Error("Remote member execution event uplink handler is not configured.");
    }
    await this.deps.publishEventToHost(event);
  }
}
