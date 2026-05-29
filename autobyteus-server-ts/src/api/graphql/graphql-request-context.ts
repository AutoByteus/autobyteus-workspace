import type { FastifyReply, FastifyRequest } from "fastify";

export type GraphqlRequestContext = {
  readonly requestAbortSignal: AbortSignal;
};

export const createGraphqlRequestContext = (
  request: FastifyRequest,
  reply: FastifyReply,
): GraphqlRequestContext => ({
  requestAbortSignal: createRequestAbortSignal(request, reply),
});

const createRequestAbortSignal = (request: FastifyRequest, reply: FastifyReply): AbortSignal => {
  const abortController = new AbortController();
  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    request.raw.off("aborted", abort);
    reply.raw.off("close", abort);
    reply.raw.off("finish", cleanup);
  };
  const abort = (): void => {
    abortController.abort();
    cleanup();
  };

  if (request.raw.aborted || request.raw.destroyed || reply.raw.destroyed) {
    abort();
    return abortController.signal;
  }

  request.raw.once("aborted", abort);
  reply.raw.once("close", abort);
  reply.raw.once("finish", cleanup);
  return abortController.signal;
};
