import { ApplicationUnavailableError } from "../../application-orchestration/services/application-availability-service.js";
import { ApplicationLaunchOverrideValidationError } from "../../application-platform/launch-configuration/application-launch-override-normalizer.js";
import { ApplicationLaunchConfigurationError } from "../../application-platform/launch-configuration/application-launch-configuration-service.js";

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
  if (error instanceof ApplicationLaunchOverrideValidationError) {
    return reply.code(400).send({ detail: error.message });
  }
  if (error instanceof ApplicationLaunchConfigurationError) {
    return reply.code(409).send({
      detail: error.message,
      readiness: error.readiness,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("was not found")) return reply.code(404).send({ detail: message });
  if ([
    "must match", "does not support", "requires a resource selection", "cannot persist launchProfile",
    "no longer supports", "malformed", "No application route matched",
  ].some((part) => message.includes(part))) return reply.code(400).send({ detail: message });
  return reply.code(500).send({ detail: message });
};
