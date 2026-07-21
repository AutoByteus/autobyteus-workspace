import type { ResolvedLLMAuthentication } from '../llm/llm-construction-context.js';
import type { MultimediaConfig } from './utils/multimedia-config.js';

export type ResolvedMultimediaAuthentication = ResolvedLLMAuthentication;

export type MultimediaConstructionContext = {
  config: MultimediaConfig;
  authentication: ResolvedMultimediaAuthentication;
};
