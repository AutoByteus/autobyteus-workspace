import {
  getValidSchemaDefault,
  resolveEffectiveConfigValue,
  type UiModelConfigParameterSchema,
  type UiModelConfigSchema,
} from '~/utils/llmConfigSchema';

type ThinkingProvider = 'openai' | 'claude' | 'gemini' | 'typed';

type ThinkingConfig = Record<string, unknown>;

export type ThinkingControlState = {
  supported: boolean;
  enabled: boolean;
  canEnable: boolean;
  canDisable: boolean;
  toggleOwnedKeys: string[];
  readOnlyReason?: string;
};

const PROVIDER_KEYS: Record<ThinkingProvider, string[]> = {
  openai: ['reasoning_effort', 'reasoning_summary'],
  claude: ['thinking_enabled', 'thinking_budget_tokens', 'thinking_display', 'reasoning_effort'],
  gemini: ['thinking_level', 'include_thoughts'],
  typed: ['thinking_type', 'reasoning_effort'],
};

const hasKey = (
  schema: UiModelConfigSchema | null,
  key: string,
): boolean => !!schema && key in schema;

const enumIncludes = (
  param: UiModelConfigParameterSchema | null | undefined,
  value: unknown,
): boolean => Array.isArray(param?.enum) && param.enum.some((candidate) => Object.is(candidate, value));

const effectiveValue = (
  schema: UiModelConfigSchema | null,
  config: ThinkingConfig | null | undefined,
  key: string,
): unknown | undefined => {
  const param = schema?.[key];
  if (!param) return undefined;
  return resolveEffectiveConfigValue(param, config?.[key]);
};

const nonOffEnumValue = (
  param: UiModelConfigParameterSchema | null | undefined,
  offValues: unknown[],
): unknown | undefined => {
  const defaultValue = getValidSchemaDefault(param);
  if (defaultValue !== undefined && !offValues.some((offValue) => Object.is(offValue, defaultValue))) {
    return defaultValue;
  }

  const enumValue = param?.enum?.find(
    (candidate) => !offValues.some((offValue) => Object.is(offValue, candidate)),
  );
  return enumValue;
};

const preferredGeminiLevel = (
  param: UiModelConfigParameterSchema | null | undefined,
): unknown | undefined => {
  const defaultValue = getValidSchemaDefault(param);
  if (defaultValue !== undefined && defaultValue !== 'minimal') {
    return defaultValue;
  }
  if (enumIncludes(param, 'medium')) return 'medium';
  return nonOffEnumValue(param, ['minimal']);
};

const positiveOpenAiValue = (
  param: UiModelConfigParameterSchema | null | undefined,
): unknown | undefined => {
  if (enumIncludes(param, 'auto')) return 'auto';
  if (enumIncludes(param, 'medium')) return 'medium';
  return nonOffEnumValue(param, ['none']);
};

export const detectThinkingProvider = (schema: UiModelConfigSchema | null): ThinkingProvider | null => {
  if (!schema) return null;
  if ('thinking_enabled' in schema) return 'claude';
  if ('thinking_type' in schema) return 'typed';
  if ('reasoning_effort' in schema || 'reasoning_summary' in schema) return 'openai';
  if ('thinking_level' in schema || 'include_thoughts' in schema) return 'gemini';
  return null;
};

const openAiState = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null | undefined,
): ThinkingControlState => {
  const effortParam = schema.reasoning_effort;
  const summaryParam = schema.reasoning_summary;
  const effort = effectiveValue(schema, config, 'reasoning_effort');
  const summary = effectiveValue(schema, config, 'reasoning_summary');
  const enabled = (effort !== undefined && effort !== 'none') ||
    (summary !== undefined && summary !== 'none');
  const effortCanDisable = !effortParam || enumIncludes(effortParam, 'none');
  const summaryCanDisable = !summaryParam || enumIncludes(summaryParam, 'none');
  const canDisable = effortCanDisable && summaryCanDisable;
  const canEnable = positiveOpenAiValue(summaryParam) !== undefined ||
    nonOffEnumValue(effortParam, ['none']) !== undefined;

  return {
    supported: true,
    enabled,
    canEnable,
    canDisable,
    toggleOwnedKeys: [],
  };
};

const claudeState = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null | undefined,
): ThinkingControlState => {
  const enabledValue = effectiveValue(schema, config, 'thinking_enabled');
  return {
    supported: true,
    enabled: enabledValue === true,
    canEnable: hasKey(schema, 'thinking_enabled'),
    canDisable: hasKey(schema, 'thinking_enabled'),
    toggleOwnedKeys: ['thinking_enabled'],
  };
};

const typedThinkingState = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null | undefined,
): ThinkingControlState => {
  const thinkingType = effectiveValue(schema, config, 'thinking_type');
  return {
    supported: true,
    enabled: thinkingType === 'enabled',
    canEnable: enumIncludes(schema.thinking_type, 'enabled'),
    canDisable: enumIncludes(schema.thinking_type, 'disabled'),
    toggleOwnedKeys: ['thinking_type'],
  };
};

const geminiState = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null | undefined,
): ThinkingControlState => {
  const includeThoughts = effectiveValue(schema, config, 'include_thoughts');
  const thinkingLevel = effectiveValue(schema, config, 'thinking_level');
  const hasThinkingLevel = hasKey(schema, 'thinking_level');
  const enabled = includeThoughts === true ||
    (thinkingLevel !== undefined && thinkingLevel !== 'minimal');
  const canDisable = hasThinkingLevel
    ? enumIncludes(schema.thinking_level, 'minimal')
    : hasKey(schema, 'include_thoughts');
  const canEnable = hasKey(schema, 'include_thoughts') ||
    preferredGeminiLevel(schema.thinking_level) !== undefined;

  return {
    supported: true,
    enabled,
    canEnable,
    canDisable,
    toggleOwnedKeys: hasKey(schema, 'include_thoughts') ? ['include_thoughts'] : [],
  };
};

export const getThinkingControlState = (
  schema: UiModelConfigSchema | null,
  config: ThinkingConfig | null | undefined,
): ThinkingControlState => {
  const provider = detectThinkingProvider(schema);
  if (!provider || !schema) {
    return {
      supported: false,
      enabled: false,
      canEnable: false,
      canDisable: false,
      toggleOwnedKeys: [],
    };
  }

  switch (provider) {
    case 'openai':
      return openAiState(schema, config);
    case 'claude':
      return claudeState(schema, config);
    case 'typed':
      return typedThinkingState(schema, config);
    case 'gemini':
      return geminiState(schema, config);
  }
};

const applyKey = (
  next: ThinkingConfig,
  schema: UiModelConfigSchema | null,
  key: string,
  value: unknown,
) => {
  if (value === undefined) return;
  if (!schema || !(key in schema)) return;
  next[key] = value;
};

const removeKey = (next: ThinkingConfig, key: string) => {
  if (key in next) {
    delete next[key];
  }
};

export const applyThinkingToggle = (
  schema: UiModelConfigSchema | null,
  enabled: boolean,
  config: ThinkingConfig | null | undefined,
): ThinkingConfig | null => {
  const provider = detectThinkingProvider(schema);
  const state = getThinkingControlState(schema, config);
  if (!provider || !schema) return config ?? null;
  if (enabled && !state.canEnable) return config ?? null;
  if (!enabled && !state.canDisable) return config ?? null;

  const next: ThinkingConfig = { ...(config ?? {}) };

  switch (provider) {
    case 'openai': {
      if (enabled) {
        const summaryValue = positiveOpenAiValue(schema.reasoning_summary);
        const effortValue = nonOffEnumValue(schema.reasoning_effort, ['none']);
        if (summaryValue !== undefined) {
          applyKey(next, schema, 'reasoning_summary', summaryValue);
          removeKey(next, 'reasoning_effort');
        } else if (effortValue !== undefined) {
          applyKey(next, schema, 'reasoning_effort', effortValue);
        }
      } else {
        if (enumIncludes(schema.reasoning_summary, 'none')) {
          applyKey(next, schema, 'reasoning_summary', 'none');
        }
        if (enumIncludes(schema.reasoning_effort, 'none')) {
          applyKey(next, schema, 'reasoning_effort', 'none');
        }
      }
      break;
    }
    case 'claude': {
      applyKey(next, schema, 'thinking_enabled', enabled);
      if (enabled && next.thinking_budget_tokens === undefined) {
        const budgetDefault = getValidSchemaDefault(schema.thinking_budget_tokens);
        if (budgetDefault !== undefined) {
          applyKey(next, schema, 'thinking_budget_tokens', budgetDefault);
        }
      }
      break;
    }
    case 'gemini': {
      if (enabled) {
        applyKey(next, schema, 'include_thoughts', true);
        const levelValue = preferredGeminiLevel(schema.thinking_level);
        if (levelValue !== undefined) {
          applyKey(next, schema, 'thinking_level', levelValue);
        }
      } else {
        applyKey(next, schema, 'include_thoughts', false);
        if (enumIncludes(schema.thinking_level, 'minimal')) {
          applyKey(next, schema, 'thinking_level', 'minimal');
        }
      }
      break;
    }
    case 'typed': {
      applyKey(next, schema, 'thinking_type', enabled ? 'enabled' : 'disabled');
      if (enabled) {
        if (next.reasoning_effort === undefined) {
          const effortDefault = getValidSchemaDefault(schema.reasoning_effort);
          applyKey(
            next,
            schema,
            'reasoning_effort',
            effortDefault ?? nonOffEnumValue(schema.reasoning_effort, ['none']),
          );
        }
      } else {
        removeKey(next, 'reasoning_effort');
      }
      break;
    }
    default:
      break;
  }

  return Object.keys(next).length > 0 ? next : null;
};

export const getThinkingParamKeys = (
  schema: UiModelConfigSchema | null,
): string[] => {
  const provider = detectThinkingProvider(schema);
  if (!provider) return [];
  return PROVIDER_KEYS[provider].filter((key) => hasKey(schema, key));
};

export const getThinkingToggleOwnedParamKeys = (
  schema: UiModelConfigSchema | null,
): string[] => getThinkingControlState(schema, null).toggleOwnedKeys;

const DEPENDENT_KEYS: Partial<Record<ThinkingProvider, string[]>> = {
  claude: ['reasoning_effort', 'thinking_budget_tokens', 'thinking_display'],
  typed: ['reasoning_effort'],
};

/**
 * Whether the schema has an on/off thinking switch that can both enable and disable thinking:
 * Claude `thinking_enabled`, or a typed `thinking_type` offering both `enabled` and `disabled`.
 */
export const hasThinkingSwitch = (schema: UiModelConfigSchema | null): boolean => {
  const provider = detectThinkingProvider(schema);
  if (!provider || !DEPENDENT_KEYS[provider]) return false;
  const state = getThinkingControlState(schema, null);
  return state.canEnable && state.canDisable;
};

/** Keys that only apply while the thinking switch is on. Empty unless `hasThinkingSwitch`. */
export const getThinkingDependentParamKeys = (
  schema: UiModelConfigSchema | null,
): string[] => {
  const provider = detectThinkingProvider(schema);
  if (!provider || !hasThinkingSwitch(schema)) return [];
  return (DEPENDENT_KEYS[provider] ?? []).filter((key) => hasKey(schema, key));
};

/**
 * The user explicitly chose `value` for thinking parameter `key` (for example a menu item). A
 * dependent key also turns thinking on, keeping the chosen value; other keys are written as is.
 */
export const applyThinkingParamChoice = (
  schema: UiModelConfigSchema | null,
  config: ThinkingConfig | null | undefined,
  key: string,
  value: unknown,
): ThinkingConfig | null => {
  const next: ThinkingConfig = { ...(config ?? {}), [key]: value };
  return getThinkingDependentParamKeys(schema).includes(key)
    ? applyThinkingToggle(schema, true, next)
    : next;
};

/**
 * A form emitted `next` after a user edit of `previous`. Choosing a new value for a dependent setting
 * while thinking is off turns thinking on and keeps the chosen value. Every other edit, including
 * clearing a dependent value, passes through unchanged.
 */
export const applyThinkingDependentEdit = (
  schema: UiModelConfigSchema | null,
  previous: ThinkingConfig | null | undefined,
  next: ThinkingConfig | null | undefined,
): ThinkingConfig | null => {
  const dependentKeys = getThinkingDependentParamKeys(schema);
  if (dependentKeys.length === 0) return next ?? null;
  if (getThinkingControlState(schema, previous).enabled) return next ?? null;
  if (getThinkingControlState(schema, next).enabled) return next ?? null;
  const chosen = dependentKeys.some((key) =>
    next?.[key] !== undefined && !Object.is(previous?.[key], next[key]));
  return chosen ? applyThinkingToggle(schema, true, next) : next ?? null;
};

/**
 * The model's default thinking parameters, written explicitly: each thinking key the schema
 * declares at its effective default (what the thinking control shows for an empty config). A
 * Claude budget is only written with thinking on, and a typed effort only with thinking enabled,
 * as `applyThinkingToggle` does.
 */
export const getDefaultThinkingConfig = (
  schema: UiModelConfigSchema | null,
): ThinkingConfig => {
  const next: ThinkingConfig = {};
  for (const key of getThinkingParamKeys(schema)) {
    const value = effectiveValue(schema, null, key);
    if (value !== undefined) next[key] = value;
  }
  const provider = detectThinkingProvider(schema);
  if (provider === 'claude' && next.thinking_enabled !== true) removeKey(next, 'thinking_budget_tokens');
  if (provider === 'typed' && next.thinking_type !== 'enabled') removeKey(next, 'reasoning_effort');
  return next;
};

/** A config value or key as a label: `extra_high` → "Extra high", `service-tier` → "Service tier". */
export const humanizeThinkingValue = (value: string): string => {
  const text = value.replace(/[_-]+/g, ' ').trim()
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text
}
