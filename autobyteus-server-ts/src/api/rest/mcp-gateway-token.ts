import type { FastifyInstance } from "fastify";
import {
  McpGatewayTokenFromEnvironmentError,
  type McpGatewayTokenService,
} from "../../mcp-gateway/mcp-gateway-token-service.js";

/** The MCP gateway token for the owner's MCP gateway panel (NA-12, design M-5); owner routes only (NA-7). */
export async function registerMcpGatewayTokenRoutes(app: FastifyInstance, tokens: McpGatewayTokenService): Promise<void> {
  app.get("/mcp-gateway/token", async () => tokens.getToken());

  app.post("/mcp-gateway/token/regenerate", async (_request, reply) => {
    try {
      return await tokens.regenerate();
    } catch (error) {
      if (error instanceof McpGatewayTokenFromEnvironmentError) {
        return reply.code(409).send({ code: error.code, message: error.message });
      }
      throw error;
    }
  });
}
