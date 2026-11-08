import type { FastifyReply, FastifyRequest } from "fastify";
import { redactSensitiveUrl } from "./redact-sensitive-url.js";

const MAX_LOGGED_VALUE_LENGTH = 100;

/** A refusal of the node's request gate, as a client receives it (NA-13). */
export type RequestRefusal = Readonly<{
  statusCode: number;
  code: string;
  message: string;
}>;

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
 * The one log line of every refusal of the node's request gate (NA-13): the code, the redacted route, the client
 * address and the caller's `detail`; never headers or credentials.
 */
export const logRequestRefusal = (request: FastifyRequest, refusal: RequestRefusal, detail?: string): void => {
  const clientAddress = toLoggableRequestValue(String(request.raw.socket?.remoteAddress ?? "unknown"));
  const detailPart = detail === undefined ? "" : ` ${detail}`;
  console.warn(`Node request refused ${refusal.code} ${redactSensitiveUrl(request.url)} from ${clientAddress}${detailPart}`);
};

/** Logs the refusal and answers it: the status and `{ code, message }`. */
export const refuseRequest = (
  request: FastifyRequest,
  reply: FastifyReply,
  refusal: RequestRefusal,
  detail?: string,
): FastifyReply => {
  logRequestRefusal(request, refusal, detail);
  return reply.code(refusal.statusCode).send({
    error: refusal.code,
    code: refusal.code,
    message: refusal.message,
  });
};
