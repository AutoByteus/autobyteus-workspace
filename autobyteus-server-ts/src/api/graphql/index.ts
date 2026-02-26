import "reflect-metadata";
import type { FastifyInstance } from "fastify";
import mercurius from "mercurius";
import { buildGraphqlSchema } from "./schema.js";

export async function registerGraphql(app: FastifyInstance): Promise<void> {
  const schema = await buildGraphqlSchema();
  await app.register(mercurius, {
    schema,
    path: "/graphql",
    graphiql: true,
    subscription: true,
  });
}
