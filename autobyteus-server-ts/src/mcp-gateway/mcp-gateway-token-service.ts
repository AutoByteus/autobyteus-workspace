import path from "node:path";
import { generateCredential } from "../node-access/domain/credential-secret.js";
import { readJsonFile, writeJsonFile } from "../persistence/file/store-utils.js";

export const MCP_GATEWAY_TOKEN_ENV_VAR = "AUTOBYTEUS_MCP_GATEWAY_TOKEN";
const TOKEN_PREFIX = "mcpg_";

/** Where the token comes from: the node's environment (read-only), or the node created it (it can be regenerated). */
export type McpGatewayTokenSource = "environment" | "node";

export type McpGatewayToken = Readonly<{ token: string; source: McpGatewayTokenSource }>;

type AppDataDirSource = Readonly<{ getAppDataDir(): string }>;

/**
 * The MCP gateway's token (node access model NA-12, design M-5): the node setting `AUTOBYTEUS_MCP_GATEWAY_TOKEN` when
 * set; otherwise a token (`mcpg_…`) the node creates the first time the gateway or its owner needs one, kept in
 * `<data>/mcp-gateway/token.json` (mode 0600, plain: the owner copies it into MCP clients). Every client needs it,
 * this computer included. The owner sees it in the MCP gateway panel and can regenerate a node-created one.
 */
export class McpGatewayTokenService {
  private current: Promise<McpGatewayToken> | null = null;

  constructor(
    private readonly config: AppDataDirSource,
    private readonly readEnvironmentToken: () => string | undefined = () => process.env[MCP_GATEWAY_TOKEN_ENV_VAR],
  ) {}

  /** The token, created on first use when the environment gives none. */
  getToken(): Promise<McpGatewayToken> {
    this.current ??= this.load().catch((error: unknown) => {
      this.current = null;
      throw error;
    });
    return this.current;
  }

  /** A new token; the old one stops working at once. Refused for a token from the environment. */
  async regenerate(): Promise<McpGatewayToken> {
    if ((await this.getToken()).source === "environment") {
      throw new McpGatewayTokenFromEnvironmentError();
    }
    const next = this.create();
    this.current = next;
    return next;
  }

  private filePath(): string {
    return path.join(this.config.getAppDataDir(), "mcp-gateway", "token.json");
  }

  private async load(): Promise<McpGatewayToken> {
    const environmentToken = this.readEnvironmentToken()?.trim();
    if (environmentToken) return Object.freeze({ token: environmentToken, source: "environment" });
    const stored = await readJsonFile<{ token?: unknown } | null>(this.filePath(), null);
    if (typeof stored?.token === "string" && stored.token.startsWith(TOKEN_PREFIX)) {
      return Object.freeze({ token: stored.token, source: "node" });
    }
    return this.create();
  }

  private async create(): Promise<McpGatewayToken> {
    const token = generateCredential(TOKEN_PREFIX);
    await writeJsonFile(this.filePath(), { token }, { mode: 0o600 });
    return Object.freeze({ token, source: "node" });
  }
}

export class McpGatewayTokenFromEnvironmentError extends Error {
  readonly code = "MCP_GATEWAY_TOKEN_FROM_ENVIRONMENT";

  constructor() {
    super(`The MCP gateway token comes from this node's ${MCP_GATEWAY_TOKEN_ENV_VAR} setting; change it there.`);
    this.name = "McpGatewayTokenFromEnvironmentError";
  }
}
