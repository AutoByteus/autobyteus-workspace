import type { UiModelConfigSchema } from '~/utils/llmConfigSchema';

type ThinkingProvider = 'openai' | 'claude' | 'gemini' | 'zhipu';

type ThinkingConfig = Record<string, unknown>;

const PROVIDER_KEYS: Record<ThinkingProvider, string[]> = {
  openai: ['reasoning_effort', 'reasoning_summary'],
  claude: ['thinking_enabled', 'thinking_budget_tokens'],
  gemini: ['thinking_level', 'include_thoughts'],
  zhipu: ['thinking_type'],
};

export const detectThinkingProvider = (schema: UiModelConfigSchema | null): ThinkingProvider | null => {
  if (!schema) return null;
  if ('reasoning_effort' in schema || 'reasoning_summary' in schema) return 'openai';
  if ('thinking_enabled' in schema || 'thinking_budget_tokens' in schema) return 'claude';
  if ('thinking_level' in schema || 'include_thoughts' in schema) return 'gemini';
  if ('thinking_type' in schema) return 'zhipu';
  return null;
};

export const hasThinkingSupport = (schema: UiModelConfigSchema | null): boolean => {
  return detectThinkingProvider(schema) !== null;
};

export const getThinkingToggleState = (
  schema: UiModelConfigSchema | null,
  config: ThinkingConfig | null | undefined,
): boolean => {
  const provider = detectThinkingProvider(schema);
  if (!provider || !config) return false;

  switch (provider) {
    case 'openai': {
      const summary = config.reasoning_summary as string | undefined;
      const effort = config.reasoning_effort as string | undefined;
      return (summary && summary !== 'none') || (effort && effort !== 'none');
    }
    case 'claude':
      return config.thinking_enabled === true;
    case 'gemini': {
      const includeThoughts = config.include_thoughts === true;
      const level = config.thinking_level as string | undefined;
      return includeThoughts || (level !== undefined && level !== 'minimal');
    }
    case 'zhipu':
      return config.thinking_type === 'enabled';
    default:
      return false;
  }
};

const applyKey = (
  next: ThinkingConfig,
  schema: UiModelConfigSchema | null,
  key: string,
  value: unknown,
) => {
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
  if (!provider) return config ?? null;

  const next: ThinkingConfig = { ...(config ?? {}) };

  switch (provider) {
    case 'openai': {
      if (enabled) {
        // Prefer auto summary; leave effort unset so the model can decide.
        applyKey(next, schema, 'reasoning_summary', 'auto');
        removeKey(next, 'reasoning_effort');
      } else {
        applyKey(next, schema, 'reasoning_summary', 'none');
        applyKey(next, schema, 'reasoning_effort', 'none');
      }
      break;
    }
    case 'claude': {
      if (enabled) {
        applyKey(next, schema, 'thinking_enabled', true);
        if (next.thinking_budget_tokens === undefined) {
          applyKey(next, schema, 'thinking_budget_tokens', 1024);
        }
      } else {
        applyKey(next, schema, 'thinking_enabled', false);
      }
      break;
    }
    case 'gemini': {
      if (enabled) {
        applyKey(next, schema, 'include_thoughts', true);
        if (next.thinking_level === undefined) {
          applyKey(next, schema, 'thinking_level', 'medium');
        }
      } else {
        applyKey(next, schema, 'include_thoughts', false);
        applyKey(next, schema, 'thinking_level', 'minimal');
      }
      break;
    }
    case 'zhipu': {
      applyKey(next, schema, 'thinking_type', enabled ? 'enabled' : 'disabled');
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
  return PROVIDER_KEYS[provider];
};
