import type { StaticModelMetadata } from './supported-model-definition.js';
import type { MultimodalCapabilities } from './multimodal-capabilities.js';

const BUILTIN_MEDIA_CAPABILITIES: MultimodalCapabilities = {
  image: 'supported',
  audio: 'unsupported',
  video: 'unsupported',
};

export const GEMINI_MEDIA_CAPABILITIES: MultimodalCapabilities = {
  image: 'supported',
  audio: 'supported',
  video: 'supported',
};

export const DEEPSEEK_MEDIA_CAPABILITIES: MultimodalCapabilities = {
  image: 'unsupported',
  audio: 'unsupported',
  video: 'unsupported',
};

export const createStaticModelMetadata = (
  maxContextTokens: number | null,
  maxInputTokens: number | null,
  maxOutputTokens: number | null,
  sourceUrl: string,
  verifiedAt: string,
  multimodalCapabilities: MultimodalCapabilities = BUILTIN_MEDIA_CAPABILITIES,
): StaticModelMetadata => ({
  maxContextTokens,
  maxInputTokens,
  maxOutputTokens,
  multimodalCapabilities: { ...multimodalCapabilities },
  provenance: { sourceUrl, verifiedAt },
});
