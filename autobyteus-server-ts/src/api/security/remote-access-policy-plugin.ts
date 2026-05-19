import type { FastifyInstance } from "fastify";
import { getRemoteAccessRoutePolicy, setRemoteAccessAuthContext } from "./remote-access-route-policy.js";

const shouldDeferToWebSocketHandler = (requestUrl: string): boolean => {
  const path = requestUrl.split("?", 1)[0] ?? "";
  return path.startsWith("/ws/");
};

export async function registerRemoteAccessPolicyPlugin(app: FastifyInstance): Promise<void> {
  const policy = getRemoteAccessRoutePolicy();

  app.addHook("onRequest", async (request, reply) => {
    if (shouldDeferToWebSocketHandler(request.url)) {
      return;
    }

    const result = await policy.authorizeHttpRequest(request);
    if (result.ok) {
      setRemoteAccessAuthContext(request, result.context);
      return;
    }

    return reply.code(result.statusCode).send({
      error: result.code,
      code: result.code,
      message: result.message,
    });
  });
}
