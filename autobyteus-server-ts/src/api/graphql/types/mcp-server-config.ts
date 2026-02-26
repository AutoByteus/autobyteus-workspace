import { GraphQLJSON } from "graphql-scalars";
import {
  Field,
  InputType,
  Int,
  ObjectType,
  createUnionType,
  registerEnumType,
} from "type-graphql";
import { ToolDefinitionDetail } from "./tool-definition.js";

export enum McpTransportTypeEnum {
  STDIO = "stdio",
  STREAMABLE_HTTP = "streamable_http",
}

registerEnumType(McpTransportTypeEnum, {
  name: "McpTransportTypeEnum",
});

@ObjectType()
export class StdioMcpServerConfig {
  @Field(() => String)
  serverId!: string;

  @Field(() => McpTransportTypeEnum)
  transportType!: McpTransportTypeEnum;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String, { nullable: true })
  toolNamePrefix?: string | null;

  @Field(() => String)
  command!: string;

  @Field(() => [String], { nullable: true })
  args?: string[] | null;

  @Field(() => GraphQLJSON, { nullable: true })
  env?: Record<string, string> | null;

  @Field(() => String, { nullable: true })
  cwd?: string | null;
}

@ObjectType()
export class StreamableHttpMcpServerConfig {
  @Field(() => String)
  serverId!: string;

  @Field(() => McpTransportTypeEnum)
  transportType!: McpTransportTypeEnum;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String, { nullable: true })
  toolNamePrefix?: string | null;

  @Field(() => String)
  url!: string;

  @Field(() => String, { nullable: true })
  token?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  headers?: Record<string, string> | null;
}

export const McpServerConfigUnion = createUnionType({
  name: "McpServerConfigUnion",
  types: () => [StdioMcpServerConfig, StreamableHttpMcpServerConfig] as const,
  resolveType: (value) =>
    value?.transportType === McpTransportTypeEnum.STDIO
      ? StdioMcpServerConfig
      : StreamableHttpMcpServerConfig,
});

@InputType()
export class StdioMcpServerConfigInput {
  @Field(() => String)
  command!: string;

  @Field(() => [String], { nullable: true })
  args?: string[] | null;

  @Field(() => GraphQLJSON, { nullable: true })
  env?: Record<string, string> | null;

  @Field(() => String, { nullable: true })
  cwd?: string | null;
}

@InputType()
export class StreamableHttpMcpServerConfigInput {
  @Field(() => String)
  url!: string;

  @Field(() => String, { nullable: true })
  token?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  headers?: Record<string, string> | null;
}

@InputType()
export class McpServerInput {
  @Field(() => String)
  serverId!: string;

  @Field(() => McpTransportTypeEnum)
  transportType!: McpTransportTypeEnum;

  @Field(() => Boolean, { nullable: true })
  enabled?: boolean | null;

  @Field(() => String, { nullable: true })
  toolNamePrefix?: string | null;

  @Field(() => StdioMcpServerConfigInput, { nullable: true })
  stdioConfig?: StdioMcpServerConfigInput | null;

  @Field(() => StreamableHttpMcpServerConfigInput, { nullable: true })
  streamableHttpConfig?: StreamableHttpMcpServerConfigInput | null;
}

@ObjectType()
export class ConfigureMcpServerResult {
  @Field(() => McpServerConfigUnion)
  savedConfig!: StdioMcpServerConfig | StreamableHttpMcpServerConfig;
}

@ObjectType()
export class DeleteMcpServerResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@ObjectType()
export class DiscoverAndRegisterMcpServerToolsResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => [ToolDefinitionDetail])
  discoveredTools!: ToolDefinitionDetail[];
}

@ObjectType()
export class ImportMcpServerConfigsResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => Int)
  importedCount!: number;

  @Field(() => Int)
  failedCount!: number;
}
