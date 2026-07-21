import type {
  LLMAuthenticationRequirement,
  ResolvedLLMAuthentication,
} from '../llm/llm-construction-context.js';
import type { MultimediaConfig } from './utils/multimedia-config.js';

export type ResolvedMultimediaAuthentication = ResolvedLLMAuthentication;

export type MultimediaConstructionTarget = {
  credentialProviderId: string;
  authenticationRequirement: LLMAuthenticationRequirement;
};

export type MultimediaConstructionContext = {
  config: MultimediaConfig;
  authentication: ResolvedMultimediaAuthentication;
};
