import type { FastifyInstance } from "fastify";
import type { OwnerCredentialService } from "../../node-access/services/owner-credential-service.js";
import { SetupCodeInvalidError, type SetupCodeService } from "../../node-access/services/setup-code-service.js";

export type NodeAccessRouteServices = Readonly<{
  setupCodes: SetupCodeService;
  ownerCredentials: OwnerCredentialService;
}>;

/**
 * `/rest/node-access/*` (node access model NA-5, NA-11): the setup exchange (exempt), and the owner routes for a setup
 * code for another desktop, the node's owner credentials, and revoking one ("Disconnect" revokes the desktop's own).
 */
export async function registerNodeAccessRoutes(app: FastifyInstance, services: NodeAccessRouteServices): Promise<void> {
  app.post<{ Body: { setupCode?: unknown; desktopName?: unknown } }>("/node-access/setup-exchanges", async (request, reply) => {
    try {
      const issued = await services.setupCodes.exchange({
        setupCode: request.body?.setupCode,
        desktopName: request.body?.desktopName,
      });
      return reply.code(201).send(issued);
    } catch (error) {
      if (error instanceof SetupCodeInvalidError) {
        return reply.code(error.statusCode).send({ error: error.code, code: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.post("/node-access/setup-codes", async (_request, reply) => reply.code(201).send(services.setupCodes.create()));

  app.get("/node-access/owner-credentials", async () => ({ credentials: await services.ownerCredentials.list() }));

  app.delete<{ Params: { credentialId: string } }>("/node-access/owner-credentials/:credentialId", async (request, reply) => {
    if (!(await services.ownerCredentials.revoke(request.params.credentialId))) {
      return reply.code(404).send({ code: "NODE_CREDENTIAL_NOT_FOUND", message: "This owner credential does not exist." });
    }
    return reply.code(204).send();
  });
}
