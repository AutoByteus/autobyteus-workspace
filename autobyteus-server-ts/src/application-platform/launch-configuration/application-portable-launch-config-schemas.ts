import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type ApplicationPortableLaunchConfigSchema =
  | { kind: "boolean" }
  | { kind: "number"; minimum?: number; integer?: boolean; nullable?: boolean }
  | { kind: "string"; nonEmpty?: boolean }
  | { kind: "string-array"; nullable?: boolean }
  | {
      kind: "record";
      fields: Record<string, ApplicationPortableLaunchConfigSchema>;
    }
  | { kind: "array"; element: ApplicationPortableLaunchConfigSchema }
  | { kind: "portable-extra-params" };

const number = (
  options: Omit<
    Extract<ApplicationPortableLaunchConfigSchema, { kind: "number" }>,
    "kind"
  > = {},
): ApplicationPortableLaunchConfigSchema => ({ kind: "number", ...options });
const string = (nonEmpty = false): ApplicationPortableLaunchConfigSchema => ({
  kind: "string",
  nonEmpty,
});

const PRICING_VALUE_FIELDS: Record<string, ApplicationPortableLaunchConfigSchema> = {
  input_token_pricing: number({ minimum: 0 }),
  output_token_pricing: number({ minimum: 0 }),
  cached_input_read_token_pricing: number({ minimum: 0 }),
  cached_input_write_token_pricing: number({ minimum: 0 }),
  cached_input_write_5m_token_pricing: number({ minimum: 0 }),
  cached_input_write_1h_token_pricing: number({ minimum: 0 }),
};

const PRICING_TIER_SCHEMA: ApplicationPortableLaunchConfigSchema = {
  kind: "record",
  fields: {
    tier_id: string(true),
    max_input_tokens: number({ minimum: 1, integer: true, nullable: true }),
    ...PRICING_VALUE_FIELDS,
  },
};

const PRICING_SCHEMA: ApplicationPortableLaunchConfigSchema = {
  kind: "record",
  fields: {
    ...PRICING_VALUE_FIELDS,
    currency: string(true),
    pricing_source: string(true),
    pricing_effective_date: string(true),
    input_token_pricing_tiers: { kind: "array", element: PRICING_TIER_SCHEMA },
  },
};

type RecordSchema = Extract<ApplicationPortableLaunchConfigSchema, { kind: "record" }>;

const AUTOBYTEUS_SCHEMA: RecordSchema = {
  kind: "record",
  fields: {
    rate_limit: number({ minimum: 0, nullable: true }),
    token_limit: number({ minimum: 1, integer: true, nullable: true }),
    system_message: string(),
    temperature: number(),
    max_tokens: number({ minimum: 1, integer: true, nullable: true }),
    compaction_ratio: number({ minimum: 0, nullable: true }),
    safety_margin_tokens: number({ minimum: 0, integer: true, nullable: true }),
    top_p: number({ minimum: 0, nullable: true }),
    frequency_penalty: number({ nullable: true }),
    presence_penalty: number({ nullable: true }),
    stop_sequences: { kind: "string-array", nullable: true },
    extra_params: { kind: "portable-extra-params" },
    pricing_config: PRICING_SCHEMA,
  },
};

const CODEX_SCHEMA: RecordSchema = {
  kind: "record",
  fields: {
    reasoning_effort: string(true),
    service_tier: string(true),
  },
};

const CLAUDE_SCHEMA: RecordSchema = {
  kind: "record",
  fields: {
    thinking_enabled: { kind: "boolean" },
    reasoning_effort: string(true),
  },
};

export const applicationPortableRootFieldSchemas = {
  ...AUTOBYTEUS_SCHEMA.fields,
  ...CODEX_SCHEMA.fields,
  ...CLAUDE_SCHEMA.fields,
};

export const applicationPortableSchemaForRuntime = (
  runtimeKind: RuntimeKind,
): ApplicationPortableLaunchConfigSchema => (
  runtimeKind === RuntimeKind.CODEX_APP_SERVER
    ? CODEX_SCHEMA
    : runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
      ? CLAUDE_SCHEMA
      : AUTOBYTEUS_SCHEMA
);
