import type { FastifyReply, FastifyRequest } from "fastify";
import type { RemoteAccessRejection } from "../../remote-access/domain/models.js";
import { redactSensitiveUrl } from "./redact-sensitive-url.js";

const MAX_LOGGED_VALUE_LENGTH = 100;

/**
 * A request-supplied value (a Host or Origin header) as it may appear in a log line: non-printable
 * characters escaped, at most 100 characters.
 */
export const toLoggableRequestValue = (value: string): string => {
  const escaped = value.replace(/[^\x20-\x7e]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return escaped.length > MAX_LOGGED_VALUE_LENGTH ? `${escaped.slice(0, MAX_LOGGED_VALUE_LENGTH)}…` : escaped;
};

/**
 * The one reply and log line for every refusal of the node's request gate (Host gate and origin/auth hook).
 * Logs the code, the redacted route and the caller's `detail`; never headers or credentials.
 */
export const refuseRemoteAccessRequest = (
  request: FastifyRequest,
  reply: FastifyReply,
  rejection: RemoteAccessRejection,
  detail?: string,
): FastifyReply => {
  const detailPart = detail === undefined ? "" : ` ${detail}`;
  console.warn(`Remote Access request refused ${rejection.code} ${redactSensitiveUrl(request.url)}${detailPart}`);
  return reply.code(rejection.statusCode).send({
    error: rejection.code,
    code: rejection.code,
    message: rejection.message,
  });
};
