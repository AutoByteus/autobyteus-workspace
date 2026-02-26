import { UniqueIdGenerator } from "../../utils/unique-id-generator.js";

export type RunVersion = string | number;

export type TeamEnvelope<TPayload = unknown> = {
  envelopeId: string;
  teamRunId: string;
  runVersion: RunVersion;
  kind: string;
  causationId?: string;
  sequence?: number;
  payload: TPayload;
};

export type BuildTeamEnvelopeInput<TPayload = unknown> = {
  teamRunId: string;
  runVersion: RunVersion;
  kind: string;
  payload: TPayload;
  causationId?: string;
  sequence?: number;
  envelopeId?: string;
};

export class EnvelopeBuilder {
  buildEnvelope<TPayload>(input: BuildTeamEnvelopeInput<TPayload>): TeamEnvelope<TPayload> {
    return {
      envelopeId: input.envelopeId ?? UniqueIdGenerator.generateId(),
      teamRunId: input.teamRunId,
      runVersion: input.runVersion,
      kind: input.kind,
      causationId: input.causationId,
      sequence: input.sequence,
      payload: input.payload,
    };
  }

  attachRunVersion<TPayload>(
    envelope: Omit<TeamEnvelope<TPayload>, "runVersion">,
    runVersion: RunVersion
  ): TeamEnvelope<TPayload> {
    return {
      ...envelope,
      runVersion,
    };
  }
}
