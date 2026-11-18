/** Why the agent made a provider call: a turn step, or a compaction summary (the agent marks those). */
export type ProviderCallPurpose = "turn" | "compaction";

/** The provider's own token counts for one call, as its stream reported them. */
export type ProviderCallUsage = Readonly<{
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number | null;
  cacheCreationInputTokens: number | null;
}>;

/**
 * What a provider relay reports about one forwarded call of a run (provider call observation). `callId` identifies the
 * call across its reports. `activity` is throttled; `finished` is reported when the upstream reply ends.
 */
export type ProviderCallObservation =
  | Readonly<{ kind: "started"; callId: string; purpose: ProviderCallPurpose }>
  | Readonly<{ kind: "activity"; callId: string }>
  | Readonly<{
      kind: "finished";
      callId: string;
      purpose: ProviderCallPurpose;
      /** The upstream status (`502` when the provider could not be reached). */
      httpStatus: number;
      usage: ProviderCallUsage | null;
      stopReason: string | null;
    }>;

/** Receives one run generation's provider call observations. Must not throw. */
export type ProviderCallListener = (observation: ProviderCallObservation) => void;
