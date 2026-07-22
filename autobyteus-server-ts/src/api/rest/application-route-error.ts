import { ApplicationUnavailableError } from "../../application-orchestration/services/application-availability-service.js";
import { LaunchProfileValidationError } from "../../application-orchestration/services/application-execution-resource-configuration-launch-profile.js";

export const sendApplicationRouteError = (
  reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } },
  error: unknown,
) => {
  if (error instanceof ApplicationUnavailableError) {
    return reply.code(503).send({
      detail: error.message,
      applicationId: error.applicationId,
      availabilityState: error.state,
      retryable: true,
    });
  }
  if (error instanceof LaunchProfileValidationError) return reply.code(400).send({ detail: error.message });
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("was not found")) return reply.code(404).send({ detail: message });
  if ([
    "must match", "does not support", "requires a resource selection", "cannot persist launchProfile",
    "no longer supports", "malformed", "No application route matched",
  ].some((part) => message.includes(part))) return reply.code(400).send({ detail: message });
  return reply.code(500).send({ detail: message });
};
