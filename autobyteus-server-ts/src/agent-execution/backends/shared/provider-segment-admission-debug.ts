import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

export type ProviderSegmentAdmissionRejectionReason =
  | "AUTOBYTEUS_SEGMENT_IDENTITY_INVALID"
  | "CLAUDE_SEGMENT_IDENTITY_INVALID"
  | "CLAUDE_SEGMENT_TYPE_INVALID"
  | "CLAUDE_SEGMENT_CONTENT_INVALID";

export const logProviderSegmentAdmissionRejection = (input: Readonly<{
  runtimeKind: RuntimeKind;
  runId: string;
  nativeEventName: string;
  reasonCode: ProviderSegmentAdmissionRejectionReason;
}>): void => {
  console.warn("[ProviderSegmentAdmissionRejected]", {
    runtimeKind: input.runtimeKind,
    runId: input.runId,
    nativeEventName: input.nativeEventName,
    reasonCode: input.reasonCode,
  });
};
