import type { LLMModelOptions } from './models.js';
import type { MultimodalCapabilities } from './multimodal-capabilities.js';

export type StaticModelMetadataProvenance = {
  sourceUrl: string;
  verifiedAt: string;
};

export type StaticModelMetadata = {
  maxContextTokens: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  multimodalCapabilities: MultimodalCapabilities;
  provenance: StaticModelMetadataProvenance;
};

export type SupportedModelDefinition = Omit<
  LLMModelOptions,
  | 'maxContextTokens'
  | 'activeContextTokens'
  | 'maxInputTokens'
  | 'maxOutputTokens'
  | 'multimodalCapabilities'
  | 'resolvedModelMetadata'
  | 'runtime'
  | 'hostUrl'
> & {
  staticMetadata: StaticModelMetadata;
};
