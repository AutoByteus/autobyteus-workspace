import type { ProviderCallObservation } from "../../../credential-proxy/provider-relays/provider-call-observation.js";
import type { AcpSessionEffect, AcpSessionEffectContext } from "../acp/acp-agent-session-profile.js";
import { buildDeepSeekHarnessCallUsagePayload } from "./deepseek-harness-call-usage.js";

const ACTIVITY: AcpSessionEffect = Object.freeze({ kind: "activity" });

/**
 * The effects of one dsh model call the provider relay reported (DS-003): every report is turn activity (the model is
 * still working when no ACP frame arrives, RT-016); a finished call records its usage; a compaction call is a provider
 * compaction (started, then completed when DeepSeek answered it to its end, else failed).
 */
export const interpretDeepSeekHarnessProviderCall = (
  observation: ProviderCallObservation,
  context: AcpSessionEffectContext,
): AcpSessionEffect[] => {
  if (observation.kind === "activity") return [ACTIVITY];
  if (observation.kind === "started") {
    return observation.purpose === "compaction"
      ? [{ kind: "compaction", phase: "started", eventId: observation.callId, details: {} }, ACTIVITY]
      : [ACTIVITY];
  }
  const effects: AcpSessionEffect[] = [];
  const payload = observation.usage ? buildDeepSeekHarnessCallUsagePayload(observation.usage, observation.purpose, context) : null;
  if (payload) effects.push({ kind: "usage", payload });
  if (observation.purpose === "compaction") {
    const answered = observation.httpStatus >= 200 && observation.httpStatus < 300 && observation.stopReason !== null;
    effects.push(answered
      ? { kind: "compaction", phase: "completed", eventId: observation.callId, details: {} }
      : {
          kind: "compaction", phase: "failed", eventId: observation.callId,
          details: { error_message: `DeepSeek did not complete the compaction call (HTTP ${observation.httpStatus}).` },
        });
  }
  effects.push(ACTIVITY);
  return effects;
};
