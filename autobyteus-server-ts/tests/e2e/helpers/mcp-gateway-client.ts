import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

/**
 * Connects an MCP client to a test-owned node's `/mcp/gateway`, as an MCP client on the owner's computer does: with the
 * node's MCP gateway token (node access model NA-12, NAS-25), not the owner credential. The token is read from the
 * owner route the MCP gateway panel uses (`GET /rest/mcp-gateway/token`); that request carries the owner credential
 * the start helpers attached to the node's port. The gateway request carries the token itself, so the attachment leaves
 * it alone. The token is never logged. The caller closes the client.
 */
export const connectMcpGatewayClient = async (serverUrl: string | URL, clientName: string): Promise<Client> => {
  const response = await fetch(new URL("/rest/mcp-gateway/token", serverUrl));
  if (response.status !== 200) throw new Error(`MCP gateway token read failed: ${response.status}`);
  const { token } = (await response.json()) as { token: string };
  const client = new Client({ name: clientName, version: "1.0.0" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL("/mcp/gateway", serverUrl), {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
    }));
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
  return client;
};
