import "reflect-metadata";
import type { FastifyInstance } from "fastify";
import mercurius from "mercurius";
import { getClientIdentity, registerOpenSocket } from "../security/node-access-gate.js";
import { buildGraphqlSchema } from "./schema.js";
import { createGraphqlRequestContext } from "./graphql-request-context.js";

type SubscriptionSocketContext = { unregisterOpenSocket?: () => void };

export async function registerGraphql(app: FastifyInstance): Promise<void> {
  const schema = await buildGraphqlSchema();
  await app.register(mercurius, {
    schema,
    path: "/graphql",
    // A subscription socket registers under the identity the node access gate set on its upgrade, so a revocation
    // closes it (NA-11).
    subscription: {
      context: (socket, request) => ({
        clientIdentity: getClientIdentity(request),
        unregisterOpenSocket: registerOpenSocket(request, socket),
      }),
      onDisconnect: (context) => (context as SubscriptionSocketContext).unregisterOpenSocket?.(),
    },
    context: createGraphqlRequestContext,
  });
}
