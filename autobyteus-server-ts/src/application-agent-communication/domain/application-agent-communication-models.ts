import type {
  ApplicationAgentConnectionErrorCode,
  ApplicationAgentConnectionErrorPayload,
  ApplicationAgentConnectionCloseReason,
} from "@autobyteus/application-sdk-contracts";

export type ApplicationAgentCommunicationNetworkSocket = {
  bufferedAmount?: number;
  send: (payload: string) => void;
  close: (code?: number, reason?: string) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

const DETAILS: Record<ApplicationAgentConnectionErrorCode, { message: string; recoverable: boolean }> = {
  APPLICATION_NOT_AVAILABLE: { message: "The application is not available.", recoverable: true },
  TARGET_NOT_AVAILABLE: { message: "The application agent target is not available.", recoverable: true },
  INVALID_TARGET: { message: "The application agent target is invalid.", recoverable: false },
  RUNTIME_NOT_ACTIVE: { message: "The application agent runtime is not active.", recoverable: true },
  CONNECTION_ABORTED: { message: "Application agent connection was aborted.", recoverable: true },
  PROTOCOL_ERROR: { message: "The application agent connection protocol was invalid.", recoverable: false },
  INPUT_REJECTED: { message: "Application agent input was rejected.", recoverable: true },
  EVENT_MAPPING_FAILED: { message: "An application agent event could not be projected safely.", recoverable: false },
  EVENT_SERIALIZATION_FAILED: { message: "An application agent event could not be serialized safely.", recoverable: false },
  BACKPRESSURE_LIMIT: { message: "The application agent connection exceeded its delivery limit.", recoverable: true },
  TRANSPORT_FAILED: { message: "The application agent connection transport failed.", recoverable: true },
};

export const applicationAgentConnectionError = (
  code: ApplicationAgentConnectionErrorCode,
): ApplicationAgentConnectionErrorPayload => ({ code, ...DETAILS[code] });

export const applicationAgentConnectionCloseCode = (
  reason: ApplicationAgentConnectionCloseReason,
): number => {
  if (reason === "PROTOCOL_ERROR") return 1002;
  if (reason === "BACKPRESSURE_LIMIT") return 1013;
  if (reason === "TRANSPORT_FAILED" || reason === "STREAM_FAILED") return 1011;
  return 1000;
};
