import type { TeamEnvelope } from "../envelope/envelope-builder.js";
import { CommandRetryPolicy } from "../policies/command-retry-policy.js";

export type SendEnvelopeToWorker = (
  targetNodeId: string,
  envelope: TeamEnvelope
) => Promise<void>;

export type HostNodeBridgeClientOptions = {
  sendEnvelopeToWorker: SendEnvelopeToWorker;
  retryPolicy?: CommandRetryPolicy;
};

export type SendCommandResult = {
  delivered: boolean;
  attempts: number;
  deduped: boolean;
};

export class HostNodeBridgeClient {
  private readonly sendEnvelopeToWorker: SendEnvelopeToWorker;
  private readonly retryPolicy: CommandRetryPolicy;
  private readonly inFlightEnvelopeIds = new Set<string>();

  constructor(options: HostNodeBridgeClientOptions) {
    this.sendEnvelopeToWorker = options.sendEnvelopeToWorker;
    this.retryPolicy = options.retryPolicy ?? new CommandRetryPolicy();
  }

  async sendCommand(targetNodeId: string, envelope: TeamEnvelope): Promise<SendCommandResult> {
    if (this.inFlightEnvelopeIds.has(envelope.envelopeId)) {
      return { delivered: true, attempts: 0, deduped: true };
    }

    this.inFlightEnvelopeIds.add(envelope.envelopeId);
    let attempts = 1;
    try {
      await this.retryPolicy.retryWithBackoff(async (attempt) => {
        attempts = attempt;
          await this.sendEnvelopeToWorker(targetNodeId, envelope);
      });
      return { delivered: true, attempts, deduped: false };
    } finally {
      this.inFlightEnvelopeIds.delete(envelope.envelopeId);
    }
  }
}
