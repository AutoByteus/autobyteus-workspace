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

/** The secret state of one env value, header value or token (see `McpSecretState` in the MCP domain). */
export enum McpSecretStateEnum {
  PLAIN = "PLAIN",
  CONFIGURED = "CONFIGURED",
  MISSING = "MISSING",
  VAULT_UNAVAILABLE = "VAULT_UNAVAILABLE",
}

registerEnumType(McpSecretStateEnum, {
  name: "McpSecretState",
});

/** Why a plain value is offered for the move to the vault. */
export enum McpSecretMatchEnum {
  ALWAYS_SECRET = "ALWAYS_SECRET",
  NAME = "NAME",
  VALUE_PREFIX = "VALUE_PREFIX",
}

registerEnumType(McpSecretMatchEnum, {
  name: "McpSecretMatch",
});

/**
 * One env or header row of a saved server. `value` is set only for a plain value of a field that is not always
 * secret; a secret value is never returned, not even in part.
 */
@ObjectType()
export class McpConfigEntry {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  value!: string | null;

  @Field(() => McpSecretStateEnum)
  state!: McpSecretStateEnum;
}

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

  @Field(() => [McpConfigEntry])
  env!: McpConfigEntry[];

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

  /** The token's state; `null` when the server has no token. The token's value is never returned. */
  @Field(() => McpSecretStateEnum, { nullable: true })
  tokenState!: McpSecretStateEnum | null;

  @Field(() => [McpConfigEntry])
  headers!: McpConfigEntry[];
}

export const McpServerConfigUnion = createUnionType({
  name: "McpServerConfigUnion",
  types: () => [StdioMcpServerConfig, StreamableHttpMcpServerConfig] as const,
  resolveType: (value) =>
    value?.transportType === McpTransportTypeEnum.STDIO
      ? StdioMcpServerConfig
      : StreamableHttpMcpServerConfig,
});

/**
 * One env or header row as the user sent it:
 * - `secret` with a `value`: store the value as a new MCP secret;
 * - `secret` without a `value`: keep what is stored for this field;
 * - not `secret`: a plain value (`value` required).
 * `token` and an `Authorization` header are always treated as `secret`.
 */
@InputType()
export class McpConfigEntryInput {
  @Field(() => String)
  name!: string;

  @Field(() => Boolean)
  secret!: boolean;

  @Field(() => String, { nullable: true })
  value?: string | null;
}

/** The token: `{ value }` replaces it, `{ keep: true }` keeps the stored one. Give exactly one; omit for no token. */
@InputType()
export class McpTokenInput {
  @Field(() => String, { nullable: true })
  value?: string | null;

  @Field(() => Boolean, { nullable: true })
  keep?: boolean | null;
}

@InputType()
export class StdioMcpServerConfigInput {
  @Field(() => String)
  command!: string;

  @Field(() => [String], { nullable: true })
  args?: string[] | null;

  @Field(() => [McpConfigEntryInput], { nullable: true })
  env?: McpConfigEntryInput[] | null;

  @Field(() => String, { nullable: true })
  cwd?: string | null;
}

@InputType()
export class StreamableHttpMcpServerConfigInput {
  @Field(() => String)
  url!: string;

  @Field(() => McpTokenInput, { nullable: true })
  token?: McpTokenInput | null;

  @Field(() => [McpConfigEntryInput], { nullable: true })
  headers?: McpConfigEntryInput[] | null;
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

/** One value of one server: `field` is `env:<NAME>`, `header:<Name>` or `token`. */
@ObjectType()
export class McpServerField {
  @Field(() => String)
  serverId!: string;

  @Field(() => String)
  field!: string;
}

@ObjectType()
export class ImportMcpServerConfigFailure {
  @Field(() => String)
  serverId!: string;

  /** Why the entry was not imported; names fields, never env, header or token values. */
  @Field(() => String)
  reason!: string;
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

  @Field(() => [ImportMcpServerConfigFailure])
  failures!: ImportMcpServerConfigFailure[];

  /** The imported values stored as MCP secrets. */
  @Field(() => [McpServerField])
  storedSecrets!: McpServerField[];

  /** Imported secret references this node does not hold: saved as needing a secret, to be entered here. */
  @Field(() => [McpServerField])
  needsSecret!: McpServerField[];
}

/** The secret suggestion rule, as the web reads it (it never defines the rule itself). */
@ObjectType()
export class McpSecretSuggestionRule {
  /** An env or header name that contains one of these (any case) is suggested as secret. */
  @Field(() => [String])
  nameKeywords!: string[];

  /** A value that starts with one of these (exact case) is suggested as secret. */
  @Field(() => [String])
  valuePrefixes!: string[];

  /** Fields that are always secret: `token` and `header:Authorization` (header names in any case). */
  @Field(() => [String])
  alwaysSecretFields!: string[];
}

@InputType()
export class McpServerFieldInput {
  @Field(() => String)
  serverId!: string;

  /** `env:<NAME>`, `header:<Name>` or `token`. */
  @Field(() => String)
  field!: string;
}

@ObjectType()
export class McpSecretMoveCandidate {
  @Field(() => String)
  serverId!: string;

  @Field(() => String)
  field!: string;

  @Field(() => McpSecretMatchEnum)
  matchedBy!: McpSecretMatchEnum;
}

@ObjectType()
export class McpServerFailure {
  @Field(() => String)
  serverId!: string;

  /** Names the server and field only, never a value. */
  @Field(() => String)
  reason!: string;
}

@ObjectType()
export class MoveMcpSecretsToVaultResult {
  /** The backup of `mcps.json` written before the move; it holds the plain values. `null` when nothing moved. */
  @Field(() => String, { nullable: true })
  backupPath!: string | null;

  @Field(() => [McpServerField])
  moved!: McpServerField[];

  /** Selected values that were no longer stored as plain text. */
  @Field(() => [McpServerField])
  skipped!: McpServerField[];

  /** Moved servers whose tools could not be registered again (for example a missing value). */
  @Field(() => [McpServerFailure])
  serversFailingAfterMove!: McpServerFailure[];
}
