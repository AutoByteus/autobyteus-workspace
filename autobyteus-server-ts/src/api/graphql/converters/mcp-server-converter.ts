import {
  BaseMcpConfig,
  McpTransportType,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
} from "autobyteus-ts";
import {
  McpTransportTypeEnum,
  StdioMcpServerConfig as StdioMcpServerConfigGraphql,
  StreamableHttpMcpServerConfig as StreamableHttpMcpServerConfigGraphql,
} from "../types/mcp-server-config.js";

export class McpServerConverter {
  static toGraphql(
    config: BaseMcpConfig,
  ): StdioMcpServerConfigGraphql | StreamableHttpMcpServerConfigGraphql {
    const transportType = config.transport_type;

    if (config instanceof StdioMcpServerConfig || transportType === McpTransportType.STDIO) {
      const stdio = config as StdioMcpServerConfig;
      return {
        serverId: stdio.server_id,
        transportType: McpTransportTypeEnum.STDIO,
        enabled: stdio.enabled,
        toolNamePrefix: stdio.tool_name_prefix ?? null,
        command: stdio.command,
        args: stdio.args?.length ? stdio.args : null,
        env: stdio.env && Object.keys(stdio.env).length ? stdio.env : null,
        cwd: stdio.cwd ?? null,
      };
    }

    const http = config as StreamableHttpMcpServerConfig;
    return {
      serverId: http.server_id,
      transportType: McpTransportTypeEnum.STREAMABLE_HTTP,
      enabled: http.enabled,
      toolNamePrefix: http.tool_name_prefix ?? null,
      url: http.url,
      token: http.token ?? null,
      headers: http.headers && Object.keys(http.headers).length ? http.headers : null,
    };
  }
}
