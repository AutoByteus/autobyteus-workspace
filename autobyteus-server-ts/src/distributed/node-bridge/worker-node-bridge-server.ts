import type { TeamEnvelope } from "../envelope/envelope-builder.js";

export type ExecuteEnvelopeCommand = (envelope: TeamEnvelope) => Promise<void>;

export type HandleCommandResult = {
  handled: boolean;
  deduped: boolean;
};

export class WorkerNodeBridgeServer {
  private readonly executeEnvelopeCommand: ExecuteEnvelopeCommand;
  private readonly processedEnvelopeIds = new Set<string>();

  constructor(executeEnvelopeCommand: ExecuteEnvelopeCommand) {
    this.executeEnvelopeCommand = executeEnvelopeCommand;
  }

  async handleCommand(envelope: TeamEnvelope): Promise<HandleCommandResult> {
    if (this.processedEnvelopeIds.has(envelope.envelopeId)) {
      return { handled: true, deduped: true };
    }

    await this.executeEnvelopeCommand(envelope);
    this.processedEnvelopeIds.add(envelope.envelopeId);
    return { handled: true, deduped: false };
  }

  hasProcessed(envelopeId: string): boolean {
    return this.processedEnvelopeIds.has(envelopeId);
  }

  clearProcessedCache(): void {
    this.processedEnvelopeIds.clear();
  }
}
