/**
 * A local streamable HTTP MCP server that requires one exact `Authorization` value, for E2E tests of
 * remote-server credentials. Real `@modelcontextprotocol/sdk` server, 127.0.0.1, OS-assigned port.
 *
 * Every request without the required value is answered with 401. Each request is recorded value-free:
 * HTTP method, JSON-RPC method, called tool name and whether `Authorization` was the expected value,
 * another value, or missing. Header values are never recorded or logged.
 *
 * The server has one tool, `auth_probe`, which returns `marker`, so a caller can tell this server's
 * result from any other text.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export const AUTH_PROBE_TOOL = "auth_probe";

export type AuthObservation = {
  httpMethod: string;
  rpcMethod: string | null;
  toolName: string | null;
  auth: "expected" | "other" | "none";
};

export type AuthRequiredMcpServer = {
  url: string;
  marker: string;
  observations: AuthObservation[];
  /** Observations of `tools/call` requests for `auth_probe`. */
  toolCalls: () => AuthObservation[];
  close: () => Promise<void>;
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/**
 * Starts the server. `requiredAuthorization` is the exact `Authorization` value it accepts;
 * `null` makes an open server that accepts every request (it still records observations).
 */
export const startAuthRequiredMcpServer = async (input: {
  requiredAuthorization: string | null;
  marker: string;
}): Promise<AuthRequiredMcpServer> => {
  const observations: AuthObservation[] = [];
  const httpServer = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    let body: unknown;
    try {
      body = rawBody ? JSON.parse(rawBody) : undefined;
    } catch {
      res.writeHead(400).end("bad json");
      return;
    }
    const envelope = asRecord(body);
    const params = asRecord(envelope?.["params"]);
    const received = req.headers.authorization;
    const accepted = input.requiredAuthorization === null || received === input.requiredAuthorization;
    observations.push({
      httpMethod: req.method ?? "",
      rpcMethod: typeof envelope?.["method"] === "string" ? envelope["method"] : null,
      toolName: typeof params?.["name"] === "string" ? params["name"] : null,
      auth: received === undefined ? "none" : received === input.requiredAuthorization ? "expected" : "other",
    });
    if (!accepted) {
      res.writeHead(401, { "content-type": "text/plain" }).end("unauthorized");
      return;
    }
    const mcp = new McpServer({ name: "auth-required-e2e", version: "1.0.0" });
    mcp.tool(AUTH_PROBE_TOOL, "Returns this server's marker text. Takes no arguments.", async () => ({
      content: [{ type: "text", text: input.marker }],
    }));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void mcp.close();
    });
    await mcp.connect(transport);
    await transport.handleRequest(req, res, body);
  });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    marker: input.marker,
    observations,
    toolCalls: () => observations.filter((entry) => entry.rpcMethod === "tools/call" && entry.toolName === AUTH_PROBE_TOOL),
    close: () => new Promise<void>((resolve) => {
      httpServer.closeAllConnections();
      httpServer.close(() => resolve());
    }),
  };
};
