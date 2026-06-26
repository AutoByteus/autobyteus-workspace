import { LLMConfig } from './llm-config.js';

export type RawLlmConfigOverrides = Record<string, unknown>;

const MISSING = Symbol('missing');

const STANDARD_CONFIG_KEYS = new Set([
  'rate_limit',
  'rateLimit',
  'token_limit',
  'tokenLimit',
  'system_message',
  'systemMessage',
  'temperature',
  'max_tokens',
  'maxTokens',
  'compaction_ratio',
  'compactionRatio',
  'safety_margin_tokens',
  'safetyMarginTokens',
  'top_p',
  'topP',
  'frequency_penalty',
  'frequencyPenalty',
  'presence_penalty',
  'presencePenalty',
  'stop_sequences',
  'stopSequences',
  'stop',
]);

const EXTRA_PARAM_CONTAINER_KEYS = new Set(['extra_params', 'extraParams']);
const RESERVED_CONFIG_KEYS = new Set(['pricing_config', 'pricingConfig']);

const CONSUMED_RAW_KEYS = new Set([
  ...STANDARD_CONFIG_KEYS,
  ...EXTRA_PARAM_CONTAINER_KEYS,
  ...RESERVED_CONFIG_KEYS,
]);

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readExplicitValue(rawConfig: RawLlmConfigOverrides, aliases: string[]): unknown | typeof MISSING {
  for (const alias of aliases) {
    if (hasOwn(rawConfig, alias)) {
      return rawConfig[alias];
    }
  }
  return MISSING;
}

function applyNumberOverride(
  config: LLMConfig,
  field: keyof Pick<
    LLMConfig,
    | 'rateLimit'
    | 'tokenLimit'
    | 'temperature'
    | 'maxTokens'
    | 'compactionRatio'
    | 'safetyMarginTokens'
    | 'topP'
    | 'frequencyPenalty'
    | 'presencePenalty'
  >,
  value: unknown | typeof MISSING,
  options: { nullable: boolean },
): void {
  if (value === MISSING) return;
  if (typeof value === 'number' && Number.isFinite(value)) {
    (config as unknown as Record<string, unknown>)[field] = value;
    return;
  }
  if (value === null && options.nullable) {
    (config as unknown as Record<string, unknown>)[field] = null;
  }
}

function applyStringOverride(
  config: LLMConfig,
  field: keyof Pick<LLMConfig, 'systemMessage'>,
  value: unknown | typeof MISSING,
): void {
  if (value === MISSING) return;
  if (typeof value === 'string') {
    config[field] = value;
  }
}

function applyStringArrayOverride(
  config: LLMConfig,
  field: keyof Pick<LLMConfig, 'stopSequences'>,
  value: unknown | typeof MISSING,
): void {
  if (value === MISSING) return;
  if (value === null) {
    config[field] = null;
    return;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    config[field] = [...value];
  }
}

function filteredExtraParams(rawExtras: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(rawExtras).filter(([key]) => !CONSUMED_RAW_KEYS.has(key)),
  );
}

function readExtraParamsContainer(rawConfig: RawLlmConfigOverrides): Record<string, unknown> {
  const snakeCaseExtras = rawConfig.extra_params;
  const camelCaseExtras = rawConfig.extraParams;
  const extras = {
    ...(isPlainRecord(snakeCaseExtras) ? filteredExtraParams(snakeCaseExtras) : {}),
    ...(isPlainRecord(camelCaseExtras) ? filteredExtraParams(camelCaseExtras) : {}),
  };
  return extras;
}

function readUnknownTopLevelExtras(rawConfig: RawLlmConfigOverrides): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(rawConfig).filter(([key]) => !CONSUMED_RAW_KEYS.has(key)),
  );
}

export function applyRawLlmConfigOverrides(
  baseConfig: LLMConfig,
  rawConfig: RawLlmConfigOverrides | null | undefined,
): LLMConfig {
  if (!rawConfig) {
    return baseConfig;
  }

  applyNumberOverride(baseConfig, 'rateLimit', readExplicitValue(rawConfig, ['rate_limit', 'rateLimit']), {
    nullable: true,
  });
  applyNumberOverride(baseConfig, 'tokenLimit', readExplicitValue(rawConfig, ['token_limit', 'tokenLimit']), {
    nullable: true,
  });
  applyStringOverride(baseConfig, 'systemMessage', readExplicitValue(rawConfig, ['system_message', 'systemMessage']));
  applyNumberOverride(baseConfig, 'temperature', readExplicitValue(rawConfig, ['temperature']), {
    nullable: false,
  });
  applyNumberOverride(baseConfig, 'maxTokens', readExplicitValue(rawConfig, ['max_tokens', 'maxTokens']), {
    nullable: true,
  });
  applyNumberOverride(
    baseConfig,
    'compactionRatio',
    readExplicitValue(rawConfig, ['compaction_ratio', 'compactionRatio']),
    { nullable: true },
  );
  applyNumberOverride(
    baseConfig,
    'safetyMarginTokens',
    readExplicitValue(rawConfig, ['safety_margin_tokens', 'safetyMarginTokens']),
    { nullable: true },
  );
  applyNumberOverride(baseConfig, 'topP', readExplicitValue(rawConfig, ['top_p', 'topP']), {
    nullable: true,
  });
  applyNumberOverride(
    baseConfig,
    'frequencyPenalty',
    readExplicitValue(rawConfig, ['frequency_penalty', 'frequencyPenalty']),
    { nullable: true },
  );
  applyNumberOverride(
    baseConfig,
    'presencePenalty',
    readExplicitValue(rawConfig, ['presence_penalty', 'presencePenalty']),
    { nullable: true },
  );
  applyStringArrayOverride(
    baseConfig,
    'stopSequences',
    readExplicitValue(rawConfig, ['stop_sequences', 'stopSequences', 'stop']),
  );

  baseConfig.extraParams = {
    ...baseConfig.extraParams,
    ...readExtraParamsContainer(rawConfig),
    ...readUnknownTopLevelExtras(rawConfig),
  };

  return baseConfig;
}
