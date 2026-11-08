import type { FastifyReply } from "fastify";

/**
 * Wherever a user file is opened (a viewer, a browser tab, the in-app browser, an agent's browser tool),
 * it runs in an opaque origin, never with this node's origin and rights; scripts still run, walled off.
 * PDFs included: the viewer renders under this policy (measured, autobyteus-416 A1).
 */
const USER_FILE_SANDBOX = "sandbox allow-scripts";

export type UserFileContent = {
  readonly mimeType: string;
  readonly body: NodeJS.ReadableStream;
};

/** The one way a node route answers with a user file's content. Route-specific headers (cache) stay with the route. */
export const sendUserFile = (reply: FastifyReply, content: UserFileContent): FastifyReply => {
  reply.header("Content-Security-Policy", USER_FILE_SANDBOX);
  reply.header("X-Content-Type-Options", "nosniff");
  reply.type(content.mimeType);
  return reply.send(content.body);
};
