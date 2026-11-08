import type { FastifyRequest } from "fastify";
import { secretsEqual } from "../node-access/domain/credential-secret.js";
import type { NetworkAdmissionCheck } from "../node-access/domain/network-admission-facts.js";
import { extractBearerToken, readSingleHeader } from "./mcp-gateway-http-helpers.js";
import type { McpGatewayTokenService } from "./mcp-gateway-token-service.js";

export type McpGatewayAccessRefusal = Readonly<{
  ok: false;
  statusCode: 401 | 403;
  error: "unauthorized" | "forbidden";
  code: "NODE_NETWORK_REFUSED" | "MCP_GATEWAY_TOKEN_REQUIRED";
  message: string;
}>;

export type McpGatewayAccessDecision = Readonly<{ ok: true }> | McpGatewayAccessRefusal;

/**
 * The MCP gateway's checks after its origin rule (node access model §2, NA-12): network admission the same way as the
 * node's request gate, then its token, from every client, this computer included.
 */
export class McpGatewayAccessGate {
  constructor(
    private readonly admission: NetworkAdmissionCheck,
    private readonly tokens: Pick<McpGatewayTokenService, "getToken">,
  ) {}

  async validateRequest(request: FastifyRequest): Promise<McpGatewayAccessDecision> {
    const socket = request.raw.socket;
    if (!(await this.admission.admits({ clientAddress: socket?.remoteAddress, localAddress: socket?.localAddress }))) {
      return { ok: false, statusCode: 403, error: "forbidden", code: "NODE_NETWORK_REFUSED", message: "This node does not accept connections from your network." };
    }
    const requestToken = extractBearerToken(readSingleHeader(request.headers.authorization));
    const { token } = await this.tokens.getToken();
    if (!requestToken || !secretsEqual(requestToken, token)) {
      return { ok: false, statusCode: 401, error: "unauthorized", code: "MCP_GATEWAY_TOKEN_REQUIRED", message: "The MCP gateway token is required." };
    }
    return { ok: true };
  }
}
