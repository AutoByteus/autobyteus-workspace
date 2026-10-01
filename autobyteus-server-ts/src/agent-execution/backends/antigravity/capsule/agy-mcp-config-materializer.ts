import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { AGENT_TOOLS_MCP_SERVER_NAME, type AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";

const serverName = AGENT_TOOLS_MCP_SERVER_NAME;

const checkCollision = async (configPath: string): Promise<void> => {
  let content: string;
  try { content = await fs.readFile(configPath, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw new Error(`Cannot inspect AGY MCP collision at '${configPath}': ${String(error)}`); }
  // AGY treats an empty or whitespace-only config file as "no MCP servers configured".
  if (content.trim() === "") return;
  let data: unknown;
  try { data = JSON.parse(content); }
  catch (error) { throw new Error(`Cannot inspect AGY MCP collision at '${configPath}': ${String(error)}`); }
  const servers = (data as { mcpServers?: Record<string, unknown> })?.mcpServers;
  if (servers && Object.hasOwn(servers, serverName)) {
    throw new Error(`AGY_MCP_NAME_COLLISION: '${serverName}' is already configured at '${configPath}'.`);
  }
};

export const materializeAgyMcpConfig = async (input: {
  capsulePath: string;
  workspacePath: string;
  descriptor: AgentToolMcpDescriptor | null;
}): Promise<void> => {
  if (input.descriptor) {
    await checkCollision(path.join(input.workspacePath, ".agents", "mcp_config.json"));
    await checkCollision(path.join(os.homedir(), ".gemini", "config", "mcp_config.json"));
  }
  const mcpServers = input.descriptor
    ? { [serverName]: { disabled: false, serverUrl: input.descriptor.serverUrl,
      headers: { "X-Autobyteus-MCP-Transport": "streamable-http" } } }
    : {};
  await fs.writeFile(path.join(input.capsulePath, ".agents", "mcp_config.json"),
    `${JSON.stringify({ mcpServers }, null, 2)}\n`, { mode: 0o600 });
};
