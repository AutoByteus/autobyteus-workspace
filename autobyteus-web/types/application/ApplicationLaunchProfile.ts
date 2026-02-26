import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';

/**
 * @interface ApplicationLaunchProfile
 * @description Represents a saved, reusable configuration for launching an application.
 */
export interface ApplicationLaunchProfile {
  id: string; // uuid
  name: string;
  createdAt: string; // ISO date string
  appId: string;
  // A snapshot of the team definition at the time of profile creation
  teamDefinition: AgentTeamDefinition;
  // The default LLM model for all members
  globalLlmModelIdentifier: string;
  // Per-member overrides for the LLM model
  memberLlmConfigOverrides: Record<string, string>; // Maps memberName to modelIdentifier
}
