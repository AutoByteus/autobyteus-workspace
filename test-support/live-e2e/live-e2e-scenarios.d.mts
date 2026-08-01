export type LiveE2eOperation =
  | 'llm'
  | 'agent-flow'
  | 'compaction-agent-flow'
  | 'search'
  | 'audio'
  | 'image'
  | 'claude-api-key'
  | 'autobyteus-llm'
  | 'autobyteus-audio'
  | 'autobyteus-image';

export type LiveE2eScenario = Readonly<{
  operation: LiveE2eOperation;
  providerId: string;
  requiredSecretId: string | null;
  model?: string;
  geminiMode?: 'AI_STUDIO' | 'VERTEX_EXPRESS';
  hosts?: readonly string[];
}>;

export const liveE2eScenarios: Readonly<Record<string, LiveE2eScenario>>;
export function selectedLiveE2eScenarioIds(): string[];
