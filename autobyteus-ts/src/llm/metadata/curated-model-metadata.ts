import { LLMProvider } from '../providers.js';
import type {
  PartialResolvedModelMetadata,
  SupportedModelMetadataLookup
} from './model-metadata-resolver.js';

interface CuratedModelMetadataEntry extends PartialResolvedModelMetadata {
  sourceUrl: string;
  verifiedAt: string;
}

const curatedModelMetadata: Partial<Record<LLMProvider, Record<string, CuratedModelMetadataEntry>>> = {
  [LLMProvider.OPENAI]: {
    'gpt-5.5': {
      maxContextTokens: 1050000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-5.5',
      verifiedAt: '2026-04-25'
    },
    'gpt-5.4': {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-5.4',
      verifiedAt: '2026-04-09'
    },
    'gpt-5.4-mini': {
      maxContextTokens: 400000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-5.4-mini',
      verifiedAt: '2026-04-09'
    }
  },
  [LLMProvider.ANTHROPIC]: {
    'claude-fable-5': {
      maxContextTokens: 1000000,
      maxInputTokens: 1000000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://platform.claude.com/docs/en/about-claude/models/overview',
      verifiedAt: '2026-07-07'
    },
    'claude-opus-4-8': {
      maxContextTokens: 1000000,
      maxInputTokens: 1000000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://platform.claude.com/docs/en/about-claude/models/overview',
      verifiedAt: '2026-07-07'
    },
    'claude-opus-4-7': {
      maxContextTokens: 1000000,
      maxInputTokens: 1000000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://platform.claude.com/docs/en/about-claude/models/overview',
      verifiedAt: '2026-04-25'
    },
    'claude-sonnet-5': {
      maxContextTokens: 1000000,
      maxInputTokens: 1000000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://platform.claude.com/docs/en/about-claude/models/overview',
      verifiedAt: '2026-07-07'
    },
    'claude-sonnet-4-6': {
      maxContextTokens: 1000000,
      maxInputTokens: 1000000,
      maxOutputTokens: 64000,
      sourceUrl: 'https://platform.claude.com/docs/en/about-claude/models/overview',
      verifiedAt: '2026-04-09'
    },
  },
  [LLMProvider.DEEPSEEK]: {
    'deepseek-v4-flash': {
      maxContextTokens: 1000000,
      maxOutputTokens: 384000,
      sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
      verifiedAt: '2026-04-25'
    },
    'deepseek-v4-pro': {
      maxContextTokens: 1000000,
      maxOutputTokens: 384000,
      sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
      verifiedAt: '2026-04-25'
    }
  },
  [LLMProvider.MISTRAL]: {
    'mistral-large-2512': {
      maxContextTokens: 256000,
      sourceUrl: 'https://docs.mistral.ai/models/mistral-large-3-1-24-11/',
      verifiedAt: '2026-04-09'
    },
    'devstral-2512': {
      maxContextTokens: 256000,
      sourceUrl: 'https://docs.mistral.ai/models/devstral-small-2507/',
      verifiedAt: '2026-04-09'
    }
  },
  [LLMProvider.GEMINI]: {
    'gemini-3.1-pro-preview': {
      maxContextTokens: 1048576,
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/gemini-3',
      verifiedAt: '2026-04-09'
    },
    'gemini-3-flash-preview': {
      maxContextTokens: 1048576,
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/gemini-3',
      verifiedAt: '2026-04-09'
    },
    'gemini-3.5-flash': {
      maxContextTokens: 1048576,
      maxInputTokens: 1048576,
      maxOutputTokens: 65536,
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash',
      verifiedAt: '2026-05-20'
    }
  },
  [LLMProvider.KIMI]: {
    'kimi-k2.6': {
      maxContextTokens: 256000,
      sourceUrl: 'https://platform.kimi.ai/docs/models',
      verifiedAt: '2026-04-25'
    },
    'kimi-k2.7-code': {
      maxContextTokens: 256000,
      sourceUrl: 'https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart',
      verifiedAt: '2026-06-16'
    },
    'kimi-k2.7-code-highspeed': {
      maxContextTokens: 256000,
      sourceUrl: 'https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart',
      verifiedAt: '2026-06-24'
    }
  },
  [LLMProvider.QWEN]: {
    'qwen3.7-max': {
      maxContextTokens: 262144,
      maxInputTokens: 258048,
      maxOutputTokens: 65536,
      sourceUrl: 'https://www.alibabacloud.com/help/en/model-studio/models',
      verifiedAt: '2026-06-24'
    },
    'qwen3-max': {
      maxContextTokens: 262144,
      maxInputTokens: 258048,
      maxOutputTokens: 65536,
      sourceUrl: 'https://www.alibabacloud.com/help/en/model-studio/models',
      verifiedAt: '2026-04-09'
    }
  },
  [LLMProvider.GLM]: {
    'glm-5.2': {
      maxContextTokens: 1000000,
      maxInputTokens: 1000000,
      maxOutputTokens: 128000,
      sourceUrl: 'https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2',
      verifiedAt: '2026-06-16'
    }
  },
  [LLMProvider.MINIMAX]: {
    'MiniMax-M3': {
      maxContextTokens: 204800,
      maxInputTokens: 204800,
      sourceUrl: 'https://platform.minimax.io/docs/release-notes/models',
      verifiedAt: '2026-06-24'
    }
  }
};

const resolveLookupKeys = ({ name, value, canonicalName }: SupportedModelMetadataLookup): string[] => {
  const keys = new Set<string>();
  for (const candidate of [value, name, canonicalName]) {
    if (candidate) {
      keys.add(candidate);
    }
  }
  return Array.from(keys);
};

export function getCuratedModelMetadata(
  lookup: SupportedModelMetadataLookup
): PartialResolvedModelMetadata | null {
  const providerMetadata = curatedModelMetadata[lookup.provider];
  if (!providerMetadata) {
    return null;
  }

  for (const key of resolveLookupKeys(lookup)) {
    const entry = providerMetadata[key];
    if (entry) {
      const { sourceUrl: _sourceUrl, verifiedAt: _verifiedAt, ...metadata } = entry;
      return metadata;
    }
  }

  return null;
}
