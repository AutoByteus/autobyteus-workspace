import type { McpServerConfiguration as PrismaMcpServerConfiguration, Prisma } from "@prisma/client";
import {
  BaseMcpConfig,
  McpTransportType,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
  WebsocketMcpServerConfig,
} from "autobyteus-ts/tools/mcp/types.js";

type ConfigDetails = Record<string, unknown>;

const parseTransportType = (value: unknown): McpTransportType => {
  const normalized = String(value ?? "").toLowerCase();
  const values = Object.values(McpTransportType);
  if (values.includes(normalized as McpTransportType)) {
    return normalized as McpTransportType;
  }
  throw new Error(`Unknown MCP transport type '${value}'.`);
};

const parseConfigDetails = (value: unknown): ConfigDetails => {
  if (!value) {
    return {};
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as ConfigDetails;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as ConfigDetails;
  }
  return {};
};

const extractConfigDetails = (config: BaseMcpConfig): ConfigDetails => {
  const configRecord = config as unknown as Record<string, unknown>;
  const directFields = new Set(["server_id", "transport_type", "enabled", "tool_name_prefix"]);
  const details: ConfigDetails = {};

  for (const [key, value] of Object.entries(configRecord)) {
    if (directFields.has(key)) {
      continue;
    }
    details[key] = value;
  }

  return details;
};

export class PrismaMcpServerConfigurationConverter {
  static toDomain(prismaObj: PrismaMcpServerConfiguration): BaseMcpConfig {
    const transportType = parseTransportType(prismaObj.transportType);
    const configDetails = parseConfigDetails(prismaObj.configDetails);

    const params = {
      server_id: prismaObj.serverId,
      enabled: prismaObj.enabled,
      tool_name_prefix: prismaObj.toolNamePrefix ?? null,
      ...configDetails,
    };

    if (transportType === McpTransportType.STDIO) {
      return new StdioMcpServerConfig(params);
    }
    if (transportType === McpTransportType.STREAMABLE_HTTP) {
      return new StreamableHttpMcpServerConfig(params);
    }
    if (transportType === McpTransportType.WEBSOCKET) {
      return new WebsocketMcpServerConfig(params);
    }

    throw new Error(`Unknown transport type '${transportType}'.`);
  }

  static toCreateInput(domainObj: BaseMcpConfig): Prisma.McpServerConfigurationCreateInput {
    const transportType = domainObj.transport_type;
    if (!transportType) {
      throw new Error("transport_type is required for MCP server configuration");
    }

    const configDetails = extractConfigDetails(domainObj);
    return {
      serverId: domainObj.server_id,
      transportType,
      enabled: domainObj.enabled,
      toolNamePrefix: domainObj.tool_name_prefix ?? undefined,
      configDetails: JSON.stringify(configDetails),
    };
  }

  static toUpdateInput(domainObj: BaseMcpConfig): {
    serverId: string;
    data: Prisma.McpServerConfigurationUpdateInput;
  } {
    const transportType = domainObj.transport_type;
    if (!transportType) {
      throw new Error("transport_type is required for MCP server configuration");
    }

    const configDetails = extractConfigDetails(domainObj);
    return {
      serverId: domainObj.server_id,
      data: {
        transportType,
        enabled: domainObj.enabled,
        toolNamePrefix: domainObj.tool_name_prefix ?? undefined,
        configDetails: JSON.stringify(configDetails),
      },
    };
  }
}
