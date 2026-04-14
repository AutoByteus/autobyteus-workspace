import type {
  ApplicationProducerProvenance,
  ApplicationSessionLaunchContext,
} from "../domain/models.js";

export const APPLICATION_SESSION_CONTEXT_KEY = "application_session_context";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const normalizeLaunchContext = (value: unknown): ApplicationSessionLaunchContext | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const member = record["member"];
  if (!member || typeof member !== "object") {
    return null;
  }

  const memberRecord = member as Record<string, unknown>;
  if (
    typeof record["applicationSessionId"] !== "string" ||
    typeof record["applicationId"] !== "string" ||
    typeof memberRecord["memberRouteKey"] !== "string" ||
    typeof memberRecord["displayName"] !== "string" ||
    !isStringArray(memberRecord["teamPath"]) ||
    (memberRecord["runtimeKind"] !== "AGENT" && memberRecord["runtimeKind"] !== "AGENT_TEAM_MEMBER")
  ) {
    return null;
  }

  return {
    applicationSessionId: record["applicationSessionId"],
    applicationId: record["applicationId"],
    member: {
      memberRouteKey: memberRecord["memberRouteKey"],
      displayName: memberRecord["displayName"],
      teamPath: [...memberRecord["teamPath"]],
      runtimeKind: memberRecord["runtimeKind"],
    },
  };
};

export const getApplicationSessionLaunchContext = (
  value: unknown,
): ApplicationSessionLaunchContext | null => normalizeLaunchContext(value);

export const deriveApplicationProducerProvenance = (
  input: {
    runId: string;
    customData?: Record<string, unknown> | null;
  },
): { applicationSessionId: string; applicationId: string; producer: ApplicationProducerProvenance } => {
  const context = normalizeLaunchContext(input.customData?.[APPLICATION_SESSION_CONTEXT_KEY]);
  if (!context) {
    throw new Error("Run is not attached to an application session.");
  }

  return {
    applicationSessionId: context.applicationSessionId,
    applicationId: context.applicationId,
    producer: {
      memberRouteKey: context.member.memberRouteKey,
      displayName: context.member.displayName,
      teamPath: [...context.member.teamPath],
      runId: input.runId,
      runtimeKind: context.member.runtimeKind,
    },
  };
};
